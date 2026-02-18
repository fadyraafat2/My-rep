const API = `${location.origin}/api`;
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

const modules = [
  ['dashboard', 'Dashboard'], ['master', 'Master Data'], ['plm', 'PLM-lite'], ['orders', 'Sales'],
  ['procurement', 'Procurement'], ['inventory', 'Inventory'], ['planning', 'Planning'], ['kiosk', 'MES Kiosk'],
  ['quality', 'Quality'], ['maintenance', 'Maintenance'], ['hr', 'HR'], ['finance', 'Finance'], ['audit', 'Audit']
];

function beep(ok = true) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.frequency.value = ok ? 880 : 220;
  osc.connect(ctx.destination);
  osc.start();
  setTimeout(() => { osc.stop(); ctx.close(); }, 80);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  render();
}

function loginView() {
  return `<div class="content"><div class="card" style="max-width:420px;margin:8vh auto">
    <h2>Factory System Login</h2>
    <p>Use admin/admin123, supervisor/super123, kiosk/kiosk123</p>
    <form id="loginForm" class="grid">
      <input name="username" placeholder="Username" required />
      <input name="password" placeholder="Password" type="password" required />
      <button>Login</button>
    </form>
    <div id="msg"></div></div></div>`;
}

function nav(active) {
  return `<aside class="sidebar"><h3>Clothes Factory</h3>${modules.map(([r, t]) => `<a href="#/${r}" class="${active === r ? 'active' : ''}">${t}</a>`).join('')}
  <hr/><div>${currentUser?.username || ''} (${currentUser?.role || ''})</div><button id="logoutBtn" class="secondary" style="margin-top:8px">Logout</button></aside>`;
}

function layout(route, body) {
  return `<div class="layout">${nav(route)}<main class="content">${body}</main></div>`;
}

async function renderDashboard() {
  const k = await api('/dashboards/kpis');
  return `<div class="card"><h2>Analytics</h2><div class="grid two">
    <div><strong>FPY:</strong> ${(k.fpy * 100).toFixed(1)}%</div>
    <div><strong>OEE:</strong> ${(k.oee * 100).toFixed(1)}%</div>
    <div><strong>Availability:</strong> ${(k.availability * 100).toFixed(1)}%</div>
    <div><strong>Quality:</strong> ${(k.quality * 100).toFixed(1)}%</div>
  </div></div>
  <div class="card"><h3>WIP by Operation</h3>${tableFrom(k.wip)}</div>
  <div class="grid two"><div class="card"><h3>Defect Pareto</h3>${tableFrom(k.defects)}</div>
  <div class="card"><h3>Downtime Pareto</h3>${tableFrom(k.downtime)}</div></div>`;
}

function tableFrom(rows) {
  if (!rows || !rows.length) return '<p>No data</p>';
  const cols = Object.keys(rows[0]);
  return `<table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>
  ${rows.map((r) => `<tr>${cols.map((c) => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
}

async function crudPage(title, table, fields) {
  const data = await api(`/crud/${table}?pageSize=50`);
  return `<div class="card"><h2>${title}</h2><form id="crudForm" class="grid two">${fields.map((f) => `<input name="${f}" placeholder="${f}" />`).join('')}<button>Save</button></form></div>
  <div class="card">${tableFrom(data.rows)}</div>
  <div class="card"><button data-export="${table}">Export CSV</button></div>`;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('factory-offline', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('scanQueue', { keyPath: 'offline_id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueScan(payload) {
  const db = await openDB();
  payload.offline_id = payload.offline_id || `off-${Date.now()}-${Math.random()}`;
  const tx = db.transaction('scanQueue', 'readwrite');
  tx.objectStore('scanQueue').put(payload);
  return payload.offline_id;
}

async function queuedScans() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('scanQueue', 'readonly');
    const req = tx.objectStore('scanQueue').getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function clearQueued(ids) {
  const db = await openDB();
  const tx = db.transaction('scanQueue', 'readwrite');
  ids.forEach((id) => tx.objectStore('scanQueue').delete(id));
}

async function syncQueued() {
  const events = await queuedScans();
  if (!events.length || !navigator.onLine) return 0;
  await api('/scan-events/bulk-sync', { method: 'POST', body: JSON.stringify({ events }) });
  await clearQueued(events.map((e) => e.offline_id));
  return events.length;
}

async function kioskPage() {
  const recent = await api('/crud/scan_events?pageSize=20').catch(() => ({ rows: [] }));
  const pending = await queuedScans();
  return `<div class="card kiosk"><h2>Kiosk Mode (Scanner Ready)</h2>
  <div>Online: <strong>${navigator.onLine ? 'Yes' : 'No'}</strong> | Pending Sync: <strong>${pending.length}</strong></div>
  <form id="scanForm" class="grid">
    <select name="station"><option>cutting</option><option>line_input</option><option>operation</option><option>qc</option><option>packing</option></select>
    <select name="event_type"><option value="cut_output">cut_output</option><option value="line_input">line_input</option><option value="operation_complete">operation_complete</option><option value="qc_pass">qc_pass</option><option value="qc_reject">qc_reject</option><option value="shipment">shipment</option></select>
    <input class="scan-input" name="bundle_code" placeholder="Scan bundle barcode" autofocus />
    <input name="work_order_op_id" placeholder="work_order_op_id" />
    <input name="operator_id" placeholder="operator_id" />
    <input name="qty" placeholder="qty" value="1" />
    <button>Submit Scan</button><button type="button" id="syncBtn" class="secondary">Sync Offline Queue</button>
  </form>
  <div id="scanMsg"></div></div><div class="card"><h3>Last 20 Scans</h3>${tableFrom(recent.rows)}</div>`;
}

async function routeView(route) {
  switch (route) {
    case 'dashboard': return renderDashboard();
    case 'master': return crudPage('Master Data Items', 'items', ['sku', 'name', 'category', 'uom', 'barcode']);
    case 'plm': return crudPage('PLM Styles', 'styles', ['code', 'name', 'season', 'collection', 'status']);
    case 'orders': return crudPage('Sales Orders', 'sales_orders', ['quote_no', 'customer_id', 'status', 'commit_date', 'total_amount', 'packing_req', 'labeling_req', 'qc_level']);
    case 'procurement': return crudPage('Purchase Orders', 'purchase_orders', ['supplier_id', 'status', 'due_date']);
    case 'inventory': {
      const stock = await api('/inventory/stock-on-hand');
      const lots = await api('/crud/lots?pageSize=50');
      return `<div class="card"><h2>Stock on Hand</h2>${tableFrom(stock)}</div><div class="card"><h3>Lots</h3>${tableFrom(lots.rows)}</div>`;
    }
    case 'planning': return crudPage('Production Orders', 'production_orders', ['so_id', 'style_id', 'qty', 'status', 'planned_start', 'planned_end']);
    case 'kiosk': return kioskPage();
    case 'quality': return `<div class="grid two"><div class="card">${await crudPage('Inspections', 'inspections', ['plan_id', 'scope_type', 'scope_id', 'result', 'inspector_id'])}</div><div class="card">${await crudPage('Defects', 'defects', ['inspection_id', 'defect_code', 'qty', 'notes'])}</div></div>`;
    case 'maintenance': return crudPage('Maintenance Tickets', 'maintenance_tickets', ['asset_id', 'type', 'priority', 'status', 'notes']);
    case 'hr': return crudPage('Operators', 'operators', ['name', 'badge_code', 'role', 'active']);
    case 'finance': return crudPage('Cost Rollups', 'cost_rollups', ['style_id', 'version', 'std_material_cost', 'std_labor_cost', 'std_overhead_cost']);
    case 'audit': {
      const rows = await api('/audit');
      return `<div class="card"><h2>Audit Log</h2>${tableFrom(rows)}</div>`;
    }
    default: return renderDashboard();
  }
}

async function render() {
  const app = document.getElementById('app');
  if (!token) {
    app.innerHTML = loginView();
    const form = document.getElementById('loginForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        const out = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(fd.entries())) }).then((r) => r.json());
        if (!out.token) throw new Error(out.error || 'Login failed');
        token = out.token; currentUser = out.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
        location.hash = '#/dashboard';
      } catch (err) {
        document.getElementById('msg').textContent = err.message;
      }
    });
    return;
  }

  const route = (location.hash.split('/')[1] || 'dashboard');
  app.innerHTML = layout(route, '<div class="card">Loading...</div>');
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  const html = await routeView(route);
  app.innerHTML = layout(route, html);
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  const form = document.getElementById('crudForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const table = { master: 'items', plm: 'styles', orders: 'sales_orders', procurement: 'purchase_orders', planning: 'production_orders', maintenance: 'maintenance_tickets', hr: 'operators', finance: 'cost_rollups' }[route];
      try { await api(`/crud/${table}`, { method: 'POST', body: JSON.stringify(fd) }); render(); } catch (err) { alert(err.message); }
    });
  }

  const scanForm = document.getElementById('scanForm');
  if (scanForm) {
    const msg = document.getElementById('scanMsg');
    const handle = async () => {
      const payload = Object.fromEntries(new FormData(scanForm).entries());
      payload.qty = Number(payload.qty || 1);
      try {
        if (navigator.onLine) {
          await api('/scan', { method: 'POST', body: JSON.stringify(payload) });
        } else {
          await queueScan(payload);
        }
        msg.textContent = 'Scan accepted';
        msg.className = 'flash-ok';
        beep(true);
        scanForm.bundle_code.value = '';
      } catch (err) {
        msg.textContent = err.message;
        msg.className = 'flash-err';
        beep(false);
      }
    };
    scanForm.addEventListener('submit', (e) => { e.preventDefault(); handle(); });
    document.getElementById('syncBtn')?.addEventListener('click', async () => {
      const n = await syncQueued();
      msg.textContent = `Synced ${n} events`;
      render();
    });
    scanForm.bundle_code.focus();
  }

  document.querySelector('[data-export]')?.addEventListener('click', (e) => {
    const table = e.target.dataset.export;
    window.open(`${API}/export/${table}.csv`, '_blank');
  });
}

window.addEventListener('hashchange', render);
window.addEventListener('online', () => syncQueued());
render();
