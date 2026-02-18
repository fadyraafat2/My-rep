const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db/database');

require('./db/runMigrations');
require('./db/seed');

const { authRequired, allowRoles } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const crudRoutes = require('./routes/crud');
const workflowRoutes = require('./routes/workflow');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', authRequired, workflowRoutes);
app.use('/api/crud', authRequired, allowRoles('Admin', 'Supervisor'), crudRoutes);

app.get('/api/audit', authRequired, allowRoles('Admin', 'Supervisor'), (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all();
  res.json(rows);
});

app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

app.listen(port, () => {
  console.log(`Factory system running at http://localhost:${port}`);
});
