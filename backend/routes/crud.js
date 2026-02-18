const express = require('express');
const db = require('../db/database');
const { writeAudit } = require('../services/audit');

const router = express.Router();

const TABLES = {
  items: ['sku', 'name', 'category', 'uom', 'barcode'],
  styles: ['code', 'name', 'season', 'collection', 'status'],
  variants: ['style_id', 'color', 'size', 'sku', 'barcode'],
  boms: ['style_id', 'version', 'status', 'effective_from'],
  bom_lines: ['bom_id', 'item_id', 'qty', 'uom', 'substitute_item_id'],
  routings: ['style_id', 'version', 'status'],
  routing_ops: ['routing_id', 'seq', 'operation_code', 'work_center_type', 'smv_minutes'],
  suppliers: ['name', 'lead_time_days'],
  customers: ['name'],
  warehouses: ['name'],
  bins: ['warehouse_id', 'name'],
  sales_orders: ['quote_no', 'customer_id', 'status', 'commit_date', 'total_amount', 'packing_req', 'labeling_req', 'qc_level'],
  sales_order_lines: ['so_id', 'variant_id', 'qty', 'price'],
  purchase_orders: ['supplier_id', 'status', 'due_date'],
  purchase_order_lines: ['po_id', 'item_id', 'qty', 'price'],
  production_orders: ['so_id', 'style_id', 'qty', 'status', 'planned_start', 'planned_end'],
  work_orders: ['production_order_id', 'routing_id', 'status'],
  work_order_ops: ['work_order_id', 'routing_op_id', 'status', 'planned_qty'],
  work_centers: ['code', 'name', 'type', 'line_no'],
  bundles: ['bundle_code', 'production_order_id', 'variant_id', 'cut_no', 'qty', 'status'],
  downtime_events: ['start_ts', 'end_ts', 'work_center_id', 'reason_code', 'notes'],
  downtime_codes: ['code', 'name'],
  lots: ['item_id', 'lot_code', 'dye_lot', 'received_date', 'supplier_id'],
  reservations: ['item_id', 'lot_id', 'qty', 'ref_type', 'ref_id', 'status'],
  inspection_plans: ['name', 'scope_type', 'rules_json'],
  inspections: ['plan_id', 'scope_type', 'scope_id', 'result', 'inspector_id'],
  defect_codes: ['code', 'name', 'severity'],
  defects: ['inspection_id', 'defect_code', 'qty', 'notes', 'photo_path'],
  capa: ['source_type', 'source_id', 'action', 'owner_id', 'due_date', 'status'],
  assets: ['code', 'name', 'type', 'work_center_id'],
  pm_schedules: ['asset_id', 'freq_days', 'last_done', 'next_due'],
  maintenance_tickets: ['ts_open', 'ts_close', 'asset_id', 'type', 'priority', 'status', 'notes'],
  operators: ['name', 'badge_code', 'role', 'active'],
  operator_skills: ['operator_id', 'operation_code', 'level'],
  attendance: ['date', 'operator_id', 'shift', 'present'],
  labor_rates: ['operation_code', 'rate_per_minute'],
  overhead_rates: ['name', 'rate_per_unit'],
  cost_rollups: ['style_id', 'version', 'std_material_cost', 'std_labor_cost', 'std_overhead_cost'],
  order_profit: ['so_id', 'revenue', 'total_cost', 'profit'],
  attachments: ['entity_type', 'entity_id', 'file_path', 'file_name', 'kind', 'version']
};

const appendOnly = new Set(['stock_ledger', 'audit_log', 'scan_events']);

router.get('/:table', (req, res) => {
  const { table } = req.params;
  if (!TABLES[table] && !appendOnly.has(table)) return res.status(404).json({ error: 'Unknown table' });
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const q = req.query.q;
  const offset = (page - 1) * pageSize;

  let where = '';
  let params = [];
  if (q && TABLES[table]?.includes('name')) {
    where = ' WHERE name LIKE ?';
    params = [`%${q}%`];
  }
  const total = db.prepare(`SELECT COUNT(*) as c FROM ${table}${where}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM ${table}${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);
  res.json({ rows, total, page, pageSize });
});

router.get('/:table/:id', (req, res) => {
  const { table, id } = req.params;
  if (!TABLES[table] && !appendOnly.has(table)) return res.status(404).json({ error: 'Unknown table' });
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/:table', (req, res) => {
  const { table } = req.params;
  if (!TABLES[table] && table !== 'stock_ledger' && table !== 'scan_events') return res.status(404).json({ error: 'Unknown table' });
  const allowed = TABLES[table] || (table === 'stock_ledger'
    ? ['item_id', 'lot_id', 'warehouse_id', 'bin_id', 'qty_delta', 'ref_type', 'ref_id', 'notes']
    : ['station', 'event_type', 'bundle_id', 'work_order_op_id', 'operator_id', 'qty', 'notes', 'offline_id']);

  const payload = {};
  for (const c of allowed) payload[c] = req.body[c] ?? null;
  const cols = Object.keys(payload).filter((k) => payload[k] !== undefined);
  const placeholders = cols.map((c) => `@${c}`).join(',');

  if (!cols.length) return res.status(400).json({ error: 'No fields provided' });
  const result = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`).run(payload);
  const after = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(result.lastInsertRowid);
  writeAudit({ userId: req.user?.id, action: 'CREATE', entity: table, entityId: result.lastInsertRowid, after });
  res.status(201).json(after);
});

router.put('/:table/:id', (req, res) => {
  const { table, id } = req.params;
  if (!TABLES[table] || appendOnly.has(table)) return res.status(400).json({ error: 'Updates not allowed' });
  const before = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!before) return res.status(404).json({ error: 'Not found' });

  const allowed = TABLES[table];
  const cols = allowed.filter((c) => c in req.body);
  if (!cols.length) return res.status(400).json({ error: 'No updatable fields' });
  const setSql = cols.map((c) => `${c}=@${c}`).join(',');
  const payload = { ...req.body, id };
  db.prepare(`UPDATE ${table} SET ${setSql} WHERE id=@id`).run(payload);
  const after = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  writeAudit({ userId: req.user?.id, action: 'UPDATE', entity: table, entityId: id, before, after });
  res.json(after);
});

router.delete('/:table/:id', (req, res) => {
  const { table, id } = req.params;
  if (!TABLES[table] || appendOnly.has(table)) return res.status(400).json({ error: 'Delete not allowed' });
  const before = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!before) return res.status(404).json({ error: 'Not found' });
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  writeAudit({ userId: req.user?.id, action: 'DELETE', entity: table, entityId: id, before });
  res.json({ ok: true });
});

module.exports = router;
