# Clothes Factory Management System (ERP + MES + PLM-lite)

A full JavaScript MVP for apparel manufacturing based on ISA-95 layers.

## Tech Stack
- Backend: Node.js + Express + SQLite (`better-sqlite3`)
- Frontend: Vanilla HTML/CSS/JS SPA
- Auth: JWT + role-based access (Admin, Supervisor, Kiosk)
- Offline scan queue: IndexedDB
- Uploads: local file storage (`backend/uploads`)

## Repository Structure
```
/backend
  server.js
  /db
    database.js
    runMigrations.js
    seed.js
    /migrations
      001_init.sql
  /middleware
    auth.js
  /routes
    auth.js
    crud.js
    workflow.js
  /services
    audit.js
  /uploads
/frontend
  index.html
  styles.css
  app.js
```

## Setup & Run
```bash
npm install
npm start
```
Open: `http://localhost:3000`

## Default Users
- `admin / admin123` (Admin)
- `supervisor / super123` (Supervisor)
- `kiosk / kiosk123` (Kiosk)

## Implemented Modules
- Master Data CRUD (items, styles, variants, suppliers, customers, warehouses, bins, work centers, codes)
- PLM-lite tables (styles, BOMs, routings, attachments)
- Sales + Procurement + Planning CRUD
- Inventory ledger (append-only stock ledger) + lots + reservations + stock on hand
- MES scans + bundle creation + WIP endpoint
- QMS inspections + defects + photo/attachment upload
- CMMS-lite assets, PM schedules, maintenance tickets
- HR-lite operators, skills, attendance
- Finance-lite cost rollups and order profit table
- Dashboards: WIP, defects pareto, downtime pareto, OTIF (from shipments), FPY, simplified OEE
- Security: JWT, role checks, audit log for CRUD and workflow actions

## API Highlights
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/crud/:table`
- `POST /api/scan` (single scan)
- `POST /api/scan-events/bulk-sync` (offline sync)
- `POST /api/bundles/create`
- `GET /api/wip`
- `GET /api/dashboards/kpis`
- `GET /api/inventory/stock-on-hand`
- `POST /api/upload` (defect photos / tech pack files)
- `GET /api/export/:table.csv`
- `POST /api/import/:table.csv`

## Demo Script (5 minutes)
1. Login as `admin`.
2. Go to **Planning** and view seeded production order.
3. Call `POST /api/bundles/create` via browser devtools or REST client:
   ```json
   {"production_order_id":1,"variant_id":1,"cut_no":"CUT-01","qty":25,"count":3}
   ```
4. Open **MES Kiosk**, scan a bundle code from `bundles` table using events:
   - `line_input`
   - `operation_complete`
   - `qc_pass`
   - `shipment`
5. Open **Dashboard** to see WIP/FPY/OEE refresh.
6. Open **Quality** and create a defect record.
7. Open **Audit** to verify append-only action trail.

## Notes
- Stock ledger edits/deletes are blocked in API (append-only).
- Offline kiosk scans are stored in IndexedDB and synced when online.
- Use `/api/upload` for defect images and tech pack files.
