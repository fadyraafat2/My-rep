CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, lead_time_days INTEGER DEFAULT 7);
CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS warehouses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bins (id INTEGER PRIMARY KEY AUTOINCREMENT, warehouse_id INTEGER NOT NULL, name TEXT NOT NULL, FOREIGN KEY(warehouse_id) REFERENCES warehouses(id));

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  uom TEXT NOT NULL,
  barcode TEXT
);

CREATE TABLE IF NOT EXISTS styles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  season TEXT,
  collection TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style_id INTEGER NOT NULL,
  color TEXT,
  size TEXT,
  sku TEXT,
  barcode TEXT,
  FOREIGN KEY(style_id) REFERENCES styles(id)
);

CREATE TABLE IF NOT EXISTS boms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  status TEXT,
  effective_from TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(style_id) REFERENCES styles(id)
);

CREATE TABLE IF NOT EXISTS bom_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bom_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  qty REAL NOT NULL,
  uom TEXT NOT NULL,
  substitute_item_id INTEGER,
  FOREIGN KEY(bom_id) REFERENCES boms(id),
  FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS routings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(style_id) REFERENCES styles(id)
);

CREATE TABLE IF NOT EXISTS routing_ops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routing_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  operation_code TEXT NOT NULL,
  work_center_type TEXT NOT NULL,
  smv_minutes REAL NOT NULL,
  FOREIGN KEY(routing_id) REFERENCES routings(id)
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_no TEXT,
  customer_id INTEGER NOT NULL,
  status TEXT,
  commit_date TEXT,
  total_amount REAL DEFAULT 0,
  packing_req TEXT,
  labeling_req TEXT,
  qc_level TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);
CREATE TABLE IF NOT EXISTS sales_order_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  so_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
  qty REAL NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY(so_id) REFERENCES sales_orders(id),
  FOREIGN KEY(variant_id) REFERENCES variants(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  status TEXT,
  due_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  qty REAL,
  price REAL,
  FOREIGN KEY(po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS production_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  so_id INTEGER,
  style_id INTEGER NOT NULL,
  qty REAL NOT NULL,
  status TEXT,
  planned_start TEXT,
  planned_end TEXT,
  FOREIGN KEY(so_id) REFERENCES sales_orders(id),
  FOREIGN KEY(style_id) REFERENCES styles(id)
);

CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  production_order_id INTEGER NOT NULL,
  routing_id INTEGER NOT NULL,
  status TEXT,
  FOREIGN KEY(production_order_id) REFERENCES production_orders(id),
  FOREIGN KEY(routing_id) REFERENCES routings(id)
);

CREATE TABLE IF NOT EXISTS work_order_ops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL,
  routing_op_id INTEGER NOT NULL,
  status TEXT,
  planned_qty REAL,
  FOREIGN KEY(work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY(routing_op_id) REFERENCES routing_ops(id)
);

CREATE TABLE IF NOT EXISTS work_centers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT,
  type TEXT,
  line_no INTEGER
);

CREATE TABLE IF NOT EXISTS bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bundle_code TEXT UNIQUE NOT NULL,
  production_order_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
  cut_no TEXT,
  qty REAL,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(production_order_id) REFERENCES production_orders(id),
  FOREIGN KEY(variant_id) REFERENCES variants(id)
);

CREATE TABLE IF NOT EXISTS scan_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT CURRENT_TIMESTAMP,
  station TEXT NOT NULL,
  event_type TEXT NOT NULL,
  bundle_id INTEGER,
  work_order_op_id INTEGER,
  operator_id INTEGER,
  qty REAL DEFAULT 0,
  notes TEXT,
  offline_id TEXT UNIQUE,
  FOREIGN KEY(bundle_id) REFERENCES bundles(id),
  FOREIGN KEY(work_order_op_id) REFERENCES work_order_ops(id),
  FOREIGN KEY(operator_id) REFERENCES operators(id)
);

CREATE TABLE IF NOT EXISTS downtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_ts TEXT,
  end_ts TEXT,
  work_center_id INTEGER,
  reason_code TEXT,
  notes TEXT,
  FOREIGN KEY(work_center_id) REFERENCES work_centers(id)
);

CREATE TABLE IF NOT EXISTS downtime_codes (code TEXT PRIMARY KEY, name TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  lot_code TEXT NOT NULL,
  dye_lot TEXT,
  received_date TEXT,
  supplier_id INTEGER,
  FOREIGN KEY(item_id) REFERENCES items(id),
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT CURRENT_TIMESTAMP,
  item_id INTEGER NOT NULL,
  lot_id INTEGER,
  warehouse_id INTEGER NOT NULL,
  bin_id INTEGER,
  qty_delta REAL NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  notes TEXT,
  FOREIGN KEY(item_id) REFERENCES items(id),
  FOREIGN KEY(lot_id) REFERENCES lots(id),
  FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY(bin_id) REFERENCES bins(id)
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT CURRENT_TIMESTAMP,
  item_id INTEGER NOT NULL,
  lot_id INTEGER,
  qty REAL NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  status TEXT,
  FOREIGN KEY(item_id) REFERENCES items(id),
  FOREIGN KEY(lot_id) REFERENCES lots(id)
);

CREATE TABLE IF NOT EXISTS inspection_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  rules_json TEXT
);

CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT CURRENT_TIMESTAMP,
  plan_id INTEGER,
  scope_type TEXT,
  scope_id TEXT,
  result TEXT,
  inspector_id INTEGER,
  FOREIGN KEY(plan_id) REFERENCES inspection_plans(id),
  FOREIGN KEY(inspector_id) REFERENCES operators(id)
);

CREATE TABLE IF NOT EXISTS defect_codes (
  code TEXT PRIMARY KEY,
  name TEXT,
  severity TEXT
);

CREATE TABLE IF NOT EXISTS defects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL,
  defect_code TEXT NOT NULL,
  qty REAL,
  notes TEXT,
  photo_path TEXT,
  FOREIGN KEY(inspection_id) REFERENCES inspections(id),
  FOREIGN KEY(defect_code) REFERENCES defect_codes(code)
);

CREATE TABLE IF NOT EXISTS capa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_ts TEXT DEFAULT CURRENT_TIMESTAMP,
  source_type TEXT,
  source_id TEXT,
  action TEXT,
  owner_id INTEGER,
  due_date TEXT,
  status TEXT,
  FOREIGN KEY(owner_id) REFERENCES operators(id)
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  type TEXT,
  work_center_id INTEGER,
  FOREIGN KEY(work_center_id) REFERENCES work_centers(id)
);

CREATE TABLE IF NOT EXISTS pm_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER,
  freq_days INTEGER,
  last_done TEXT,
  next_due TEXT,
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts_open TEXT DEFAULT CURRENT_TIMESTAMP,
  ts_close TEXT,
  asset_id INTEGER,
  type TEXT,
  priority TEXT,
  status TEXT,
  notes TEXT,
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  badge_code TEXT,
  role TEXT,
  active INTEGER
);

CREATE TABLE IF NOT EXISTS operator_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operator_id INTEGER,
  operation_code TEXT,
  level INTEGER,
  FOREIGN KEY(operator_id) REFERENCES operators(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  operator_id INTEGER,
  shift TEXT,
  present INTEGER,
  FOREIGN KEY(operator_id) REFERENCES operators(id)
);

CREATE TABLE IF NOT EXISTS labor_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_code TEXT,
  rate_per_minute REAL
);

CREATE TABLE IF NOT EXISTS overhead_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  rate_per_unit REAL
);

CREATE TABLE IF NOT EXISTS cost_rollups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style_id INTEGER,
  version TEXT,
  std_material_cost REAL,
  std_labor_cost REAL,
  std_overhead_cost REAL,
  FOREIGN KEY(style_id) REFERENCES styles(id)
);

CREATE TABLE IF NOT EXISTS order_profit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  so_id INTEGER,
  revenue REAL,
  total_cost REAL,
  profit REAL,
  FOREIGN KEY(so_id) REFERENCES sales_orders(id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT,
  entity_id TEXT,
  file_path TEXT,
  file_name TEXT,
  kind TEXT,
  version TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
