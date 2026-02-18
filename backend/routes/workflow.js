const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { writeAudit } = require('../services/audit');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const kind = req.body.kind || 'attachment';
  const entityType = req.body.entity_type || 'generic';
  const entityId = req.body.entity_id || null;
  const version = req.body.version || null;
  const row = db.prepare(`INSERT INTO attachments(entity_type, entity_id, file_path, file_name, kind, version) VALUES (?,?,?,?,?,?)`)
    .run(entityType, entityId, req.file.filename, req.file.originalname, kind, version);
  const created = db.prepare('SELECT * FROM attachments WHERE id=?').get(row.lastInsertRowid);
  writeAudit({ userId: req.user.id, action: 'UPLOAD', entity: 'attachments', entityId: row.lastInsertRowid, after: created });
  res.status(201).json(created);
});

router.post('/scan-events/bulk-sync', (req, res) => {
  const events = req.body.events || [];
  const stmt = db.prepare(`INSERT OR IGNORE INTO scan_events(station, event_type, bundle_id, work_order_op_id, operator_id, qty, notes, offline_id) VALUES (@station,@event_type,@bundle_id,@work_order_op_id,@operator_id,@qty,@notes,@offline_id)`);
  const tx = db.transaction((items) => items.forEach((e) => stmt.run(e)));
  tx(events);
  writeAudit({ userId: req.user.id, action: 'SYNC', entity: 'scan_events', after: { count: events.length } });
  res.json({ synced: events.length });
});

router.post('/bundles/create', (req, res) => {
  const { production_order_id, variant_id, cut_no, qty, count = 1 } = req.body;
  if (!production_order_id || !variant_id || !qty) return res.status(400).json({ error: 'production_order_id, variant_id, qty required' });

  const created = [];
  const insert = db.prepare(`INSERT INTO bundles(bundle_code, production_order_id, variant_id, cut_no, qty, status) VALUES (?,?,?,?,?,'created')`);
  for (let i = 1; i <= count; i += 1) {
    const code = `B-${production_order_id}-${cut_no || 'C0'}-${Date.now()}-${i}`;
    const out = insert.run(code, production_order_id, variant_id, cut_no || null, qty);
    created.push(db.prepare('SELECT * FROM bundles WHERE id=?').get(out.lastInsertRowid));
  }
  writeAudit({ userId: req.user.id, action: 'CREATE_BUNDLES', entity: 'bundles', after: created });
  res.status(201).json(created);
});

router.post('/scan', (req, res) => {
  const { station, event_type, bundle_code, work_order_op_id, operator_id, qty, notes, offline_id } = req.body;
  if (!station || !event_type) return res.status(400).json({ error: 'station and event_type required' });

  let bundleId = null;
  if (bundle_code) {
    const bundle = db.prepare('SELECT * FROM bundles WHERE bundle_code=?').get(bundle_code);
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    bundleId = bundle.id;
    db.prepare('UPDATE bundles SET status=? WHERE id=?').run(event_type, bundleId);
  }

  const result = db.prepare(`INSERT INTO scan_events(station,event_type,bundle_id,work_order_op_id,operator_id,qty,notes,offline_id) VALUES (?,?,?,?,?,?,?,?)`)
    .run(station, event_type, bundleId, work_order_op_id || null, operator_id || null, qty || 1, notes || null, offline_id || null);
  const event = db.prepare('SELECT * FROM scan_events WHERE id=?').get(result.lastInsertRowid);
  writeAudit({ userId: req.user.id, action: 'SCAN', entity: 'scan_events', entityId: result.lastInsertRowid, after: event });
  res.status(201).json(event);
});

router.get('/wip', (req, res) => {
  const rows = db.prepare(`SELECT station, event_type, COUNT(*) as events, SUM(qty) as qty
    FROM scan_events GROUP BY station, event_type ORDER BY station`).all();
  res.json(rows);
});

router.get('/dashboards/kpis', (req, res) => {
  const wip = db.prepare(`SELECT wo.id as work_order_id, ro.operation_code, SUM(se.qty) as done_qty, woop.planned_qty
    FROM work_order_ops woop
    JOIN work_orders wo ON wo.id = woop.work_order_id
    JOIN routing_ops ro ON ro.id = woop.routing_op_id
    LEFT JOIN scan_events se ON se.work_order_op_id = woop.id AND se.event_type = 'operation_complete'
    GROUP BY wo.id, ro.operation_code, woop.id`).all();

  const defects = db.prepare('SELECT defect_code, SUM(qty) as qty FROM defects GROUP BY defect_code ORDER BY qty DESC').all();
  const downtime = db.prepare('SELECT reason_code, COUNT(*) as cnt FROM downtime_events GROUP BY reason_code ORDER BY cnt DESC').all();
  const otif = db.prepare(`SELECT so.id, so.commit_date,
      MAX(CASE WHEN se.event_type='shipment' THEN date(se.ts) END) as shipped_date,
      CASE WHEN MAX(CASE WHEN se.event_type='shipment' THEN date(se.ts) END) <= so.commit_date THEN 1 ELSE 0 END as on_time
    FROM sales_orders so
    LEFT JOIN production_orders po ON po.so_id=so.id
    LEFT JOIN bundles b ON b.production_order_id=po.id
    LEFT JOIN scan_events se ON se.bundle_id=b.id
    GROUP BY so.id`).all();

  const total = db.prepare("SELECT COALESCE(SUM(qty),0) as total FROM scan_events WHERE event_type='operation_complete'").get().total;
  const good = db.prepare("SELECT COALESCE(SUM(qty),0) as good FROM scan_events WHERE event_type='operation_complete'").get().good - (db.prepare('SELECT COALESCE(SUM(qty),0) as d FROM defects').get().d);
  const fpy = total ? Math.max(0, good) / total : 0;

  const plannedTime = 480;
  const dtMins = db.prepare("SELECT COALESCE(SUM((julianday(COALESCE(end_ts, datetime('now'))) - julianday(start_ts))*24*60),0) as mins FROM downtime_events").get().mins;
  const availability = plannedTime ? (plannedTime - dtMins) / plannedTime : 0;
  const performance = 0.85;
  const quality = total ? Math.max(0, good) / total : 1;
  const oee = Math.max(0, availability) * performance * quality;

  res.json({ wip, defects, downtime, otif, fpy, oee, availability, performance, quality });
});

router.get('/inventory/stock-on-hand', (req, res) => {
  const rows = db.prepare(`SELECT i.id, i.sku, i.name, COALESCE(SUM(sl.qty_delta),0) as qty
    FROM items i LEFT JOIN stock_ledger sl ON i.id = sl.item_id GROUP BY i.id ORDER BY i.sku`).all();
  res.json(rows);
});

router.get('/export/:table.csv', (req, res) => {
  const table = req.params.table;
  const rows = db.prepare(`SELECT * FROM ${table} LIMIT 1000`).all();
  if (!rows.length) return res.type('text/csv').send('');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  res.type('text/csv').send(csv);
});

router.post('/import/:table.csv', (req, res) => {
  const { table } = req.params;
  const { rows } = req.body;
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'rows array required' });
  const headers = Object.keys(rows[0]);
  const stmt = db.prepare(`INSERT INTO ${table}(${headers.join(',')}) VALUES (${headers.map((h) => `@${h}`).join(',')})`);
  const tx = db.transaction((items) => items.forEach((r) => stmt.run(r)));
  tx(rows);
  writeAudit({ userId: req.user.id, action: 'IMPORT', entity: table, after: { count: rows.length } });
  res.json({ inserted: rows.length });
});

module.exports = router;
