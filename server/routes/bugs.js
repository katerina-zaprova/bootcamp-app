const express = require('express');
const db = require('../db');

const router = express.Router();

const VALID_SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'reopened'];
const VALID_SORT_FIELDS = ['updated_at', 'created_at', 'title', 'severity', 'status'];

const STATUS_TRANSITIONS = {
  'open':        ['in-progress', 'closed'],
  'in-progress': ['resolved', 'closed'],
  'resolved':    ['closed', 'reopened'],
  'closed':      ['reopened'],
  'reopened':    ['in-progress', 'closed'],
};

function parseBug(row) {
  return { ...row, steps: JSON.parse(row.steps) };
}

function handleGetBugs(req, res) {
  const { page = 1, limit = 20, status, severity, search, sortBy = 'updated_at', sortOrder = 'desc' } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ success: false, data: null, error: 'page must be a positive integer.' });
  }
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({ success: false, data: null, error: 'limit must be between 1 and 100.' });
  }

  const offset = (pageNum - 1) * limitNum;
  const sort = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'updated_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }
  if (severity && !VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
  }

  const conditions = [];
  const params = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (severity) { conditions.push('severity = ?'); params.push(severity); }
  if (search) {
    const escaped = search.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
    conditions.push("(title LIKE ? ESCAPE '!' OR description LIKE ? ESCAPE '!')");
    params.push(`%${escaped}%`, `%${escaped}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderClause = sort === 'severity'
    ? `CASE severity WHEN 'Critical' THEN 1 WHEN 'Major' THEN 2 WHEN 'Minor' THEN 3 WHEN 'Trivial' THEN 4 END ${order}`
    : `${sort} ${order}`;

  const total = db.prepare(`SELECT COUNT(*) as count FROM bugs ${where}`).get(...params).count;
  const rows = db.prepare(`SELECT * FROM bugs ${where} ORDER BY ${orderClause} LIMIT ? OFFSET ?`)
    .all(...params, limitNum, offset);

  res.json({
    success: true,
    data: {
      items: rows.map(parseBug),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
    error: null,
  });
}

function handleGetBug(req, res) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
  const activity = db.prepare('SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ success: true, data: { ...parseBug(bug), activity }, error: null });
}

function handleCreateBug(req, res) {
  const { title, description, severity, steps = [], expected, actual, environment } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ success: false, data: null, error: 'title is required.' });
  }
  if (title.trim().length > 255) {
    return res.status(400).json({ success: false, data: null, error: 'title cannot exceed 255 characters.' });
  }
  if (!severity) {
    return res.status(400).json({ success: false, data: null, error: 'severity is required.' });
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
  }

  const result = db.prepare(`
    INSERT INTO bugs (title, description, severity, status, steps, expected, actual, environment)
    VALUES (?, ?, ?, 'open', ?, ?, ?, ?)
  `).run(
    title.trim(),
    description?.trim() || null,
    severity,
    JSON.stringify(Array.isArray(steps) ? steps.filter(s => s?.trim()) : []),
    expected?.trim() || null,
    actual?.trim() || null,
    environment?.trim() || null,
  );

  const created = db.prepare('SELECT * FROM bugs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: parseBug(created), error: null });
}

function handleUpdateBug(req, res) {
  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });

  const { title, description, severity, steps, expected, actual, environment, gitlab_issue_url } = req.body;
  const newSeverity = severity ?? existing.severity;

  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ success: false, data: null, error: 'title cannot be empty.' });
  }
  if (title !== undefined && title.trim().length > 255) {
    return res.status(400).json({ success: false, data: null, error: 'title cannot exceed 255 characters.' });
  }
  if (!VALID_SEVERITIES.includes(newSeverity)) {
    return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
  }

  db.prepare(`
    UPDATE bugs
    SET title = ?, description = ?, severity = ?, steps = ?, expected = ?, actual = ?, environment = ?, gitlab_issue_url = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title !== undefined ? title.trim() : existing.title,
    description !== undefined ? (description?.trim() || null) : existing.description,
    newSeverity,
    steps !== undefined ? JSON.stringify(Array.isArray(steps) ? steps.filter(s => s?.trim()) : []) : existing.steps,
    expected !== undefined ? (expected?.trim() || null) : existing.expected,
    actual !== undefined ? (actual?.trim() || null) : existing.actual,
    environment !== undefined ? (environment?.trim() || null) : existing.environment,
    gitlab_issue_url !== undefined ? (gitlab_issue_url?.trim() || null) : existing.gitlab_issue_url,
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: parseBug(updated), error: null });
}

function handleDeleteBug(req, res) {
  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
  db.prepare('DELETE FROM bugs WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: null, error: null });
}

function handleChangeStatus(req, res) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });

  const { status, message } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, data: null, error: 'status is required.' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  const allowed = STATUS_TRANSITIONS[bug.status] ?? [];
  if (!allowed.includes(status)) {
    return res.status(422).json({
      success: false,
      data: null,
      error: `Cannot transition from '${bug.status}' to '${status}'. Allowed transitions: ${allowed.join(', ') || 'none'}.`,
    });
  }

  db.transaction(() => {
    db.prepare(`UPDATE bugs SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    db.prepare(`INSERT INTO bug_activity (bug_id, action, old_value, new_value, message) VALUES (?, 'status_change', ?, ?, ?)`)
      .run(req.params.id, bug.status, status, message?.trim() || null);
  })();

  const updated = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  const activity = db.prepare('SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ success: true, data: { ...parseBug(updated), activity }, error: null });
}

function handleAddComment(req, res) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });

  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ success: false, data: null, error: 'message is required.' });
  }

  db.prepare(`INSERT INTO bug_activity (bug_id, action, old_value, new_value, message) VALUES (?, 'comment', NULL, NULL, ?)`)
    .run(req.params.id, message.trim());

  const activity = db.prepare('SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ success: true, data: activity, error: null });
}

router.get('/', handleGetBugs);
router.get('/:id', handleGetBug);
router.post('/', handleCreateBug);
router.put('/:id', handleUpdateBug);
router.delete('/:id', handleDeleteBug);
router.patch('/:id/status', handleChangeStatus);
router.post('/:id/comments', handleAddComment);

module.exports = router;
