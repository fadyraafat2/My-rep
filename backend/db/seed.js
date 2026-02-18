const db = require('./database');
const bcrypt = require('bcryptjs');

function run() {
  const exists = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (exists > 0) {
    console.log('Seed already applied');
    return;
  }

  const hash = (p) => bcrypt.hashSync(p, 10);
  db.prepare('INSERT INTO users(username, password_hash, role) VALUES (?,?,?)').run('admin', hash('admin123'), 'Admin');
  db.prepare('INSERT INTO users(username, password_hash, role) VALUES (?,?,?)').run('supervisor', hash('super123'), 'Supervisor');
  db.prepare('INSERT INTO users(username, password_hash, role) VALUES (?,?,?)').run('kiosk', hash('kiosk123'), 'Kiosk');

  db.prepare("INSERT INTO suppliers(name) VALUES ('Alpha Textiles')").run();
  db.prepare("INSERT INTO customers(name) VALUES ('Global Retail Ltd')").run();
  db.prepare("INSERT INTO warehouses(name) VALUES ('Main Warehouse')").run();
  db.prepare("INSERT INTO bins(warehouse_id, name) VALUES (1, 'A-01')").run();

  db.prepare("INSERT INTO items(sku,name,category,uom,barcode) VALUES ('FAB-001','Cotton Fabric','fabric','meter','890100001')").run();
  db.prepare("INSERT INTO items(sku,name,category,uom,barcode) VALUES ('TRM-001','Neck Label','trim','pcs','890100002')").run();
  db.prepare("INSERT INTO items(sku,name,category,uom,barcode) VALUES ('FG-TS-BLK-S','Tshirt Black S','finished_good','pcs','890100101')").run();

  db.prepare("INSERT INTO styles(code,name,season,collection,status) VALUES ('ST-100','Core Tee','SS26','Basics','active')").run();
  db.prepare("INSERT INTO variants(style_id,color,size,sku,barcode) VALUES (1,'Black','S','FG-TS-BLK-S','890100101')").run();
  db.prepare("INSERT INTO variants(style_id,color,size,sku,barcode) VALUES (1,'Black','M','FG-TS-BLK-M','890100102')").run();

  db.prepare("INSERT INTO boms(style_id,version,status,effective_from) VALUES (1,'v1','approved',date('now'))").run();
  db.prepare("INSERT INTO bom_lines(bom_id,item_id,qty,uom) VALUES (1,1,1.6,'meter')").run();
  db.prepare("INSERT INTO bom_lines(bom_id,item_id,qty,uom) VALUES (1,2,1,'pcs')").run();

  db.prepare("INSERT INTO routings(style_id,version,status) VALUES (1,'v1','approved')").run();
  db.prepare("INSERT INTO routing_ops(routing_id,seq,operation_code,work_center_type,smv_minutes) VALUES (1,10,'CUTTING','cutting',2)").run();
  db.prepare("INSERT INTO routing_ops(routing_id,seq,operation_code,work_center_type,smv_minutes) VALUES (1,20,'SEWING','sewing',6)").run();
  db.prepare("INSERT INTO routing_ops(routing_id,seq,operation_code,work_center_type,smv_minutes) VALUES (1,30,'FINISHING','finishing',2)").run();

  db.prepare("INSERT INTO work_centers(code,name,type,line_no) VALUES ('CUT-1','Cutting Table 1','cutting',NULL)").run();
  db.prepare("INSERT INTO work_centers(code,name,type,line_no) VALUES ('SEW-1','Sewing Line 1','sewing',1)").run();
  db.prepare("INSERT INTO work_centers(code,name,type,line_no) VALUES ('PACK-1','Packing 1','packing',NULL)").run();

  db.prepare("INSERT INTO operators(name,badge_code,role,active) VALUES ('Asha','OP001','operator',1)").run();
  db.prepare("INSERT INTO operators(name,badge_code,role,active) VALUES ('Ravi','OP002','qc',1)").run();

  db.prepare("INSERT INTO sales_orders(quote_no,customer_id,status,commit_date,total_amount,packing_req,labeling_req,qc_level) VALUES ('Q-001',1,'confirmed',date('now','+7 day'),4000,'Flat pack','GS1','AQL 2.5')").run();
  db.prepare("INSERT INTO sales_order_lines(so_id,variant_id,qty,price) VALUES (1,1,500,8)").run();
  db.prepare("INSERT INTO production_orders(so_id,style_id,qty,status,planned_start,planned_end) VALUES (1,1,500,'planned',date('now'),date('now','+5 day'))").run();
  db.prepare("INSERT INTO work_orders(production_order_id,routing_id,status) VALUES (1,1,'released')").run();
  db.prepare("INSERT INTO work_order_ops(work_order_id,routing_op_id,status,planned_qty) VALUES (1,1,'ready',500)").run();
  db.prepare("INSERT INTO work_order_ops(work_order_id,routing_op_id,status,planned_qty) VALUES (1,2,'ready',500)").run();
  db.prepare("INSERT INTO work_order_ops(work_order_id,routing_op_id,status,planned_qty) VALUES (1,3,'ready',500)").run();

  db.prepare("INSERT INTO lots(item_id,lot_code,dye_lot,received_date,supplier_id) VALUES (1,'LOT-FAB-01','DYE-BLK-01',date('now'),1)").run();
  db.prepare("INSERT INTO stock_ledger(ts,item_id,lot_id,warehouse_id,bin_id,qty_delta,ref_type,ref_id,notes) VALUES (datetime('now'),1,1,1,1,1000,'seed',1,'initial fabric')").run();
  db.prepare("INSERT INTO defect_codes(code,name,severity) VALUES ('ST','Stitch Defect','major')").run();
  db.prepare("INSERT INTO downtime_codes(code,name) VALUES ('MECH','Mechanical issue')").run();

  console.log('Seed complete');
}

run();
