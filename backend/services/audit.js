const db = require('../db/database');

function writeAudit({ userId, action, entity, entityId, before, after }) {
  db.prepare(
    `INSERT INTO audit_log(user_id, action, entity, entity_id, before_json, after_json)
     VALUES (@userId, @action, @entity, @entityId, @before, @after)`
  ).run({
    userId: userId || null,
    action,
    entity,
    entityId: entityId ? String(entityId) : null,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null
  });
}

module.exports = { writeAudit };
