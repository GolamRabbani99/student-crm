import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

router.use(requireAuth);

const ALLOWED_COLORS = ['slate', 'amber', 'blue', 'violet', 'orange', 'cyan', 'emerald', 'rose', 'pink', 'lime'];

router.get('/', (_req, res) => {
  const statuses = db
    .prepare(`
      SELECT st.*,
        (SELECT COUNT(*) FROM students s WHERE s.status_id = st.id) AS student_count
      FROM statuses st ORDER BY st.sort_order, st.id
    `)
    .all();
  res.json({ statuses });
});

router.post('/', requireAdmin, (req, res) => {
  const { name, color } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Status name is required' });
  }
  const cleanColor = ALLOWED_COLORS.includes(color) ? color : 'slate';
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM statuses').get() as { m: number };
  try {
    const result = db
      .prepare('INSERT INTO statuses (name, color, sort_order) VALUES (?, ?, ?)')
      .run(String(name).trim(), cleanColor, maxOrder.m + 1);
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) {
    if (String(err?.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'A status with this name already exists' });
    }
    throw err;
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM statuses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Status not found' });
  const { name, color, sort_order } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Status name is required' });
  }
  const cleanColor = ALLOWED_COLORS.includes(color) ? color : 'slate';
  try {
    db.prepare('UPDATE statuses SET name = ?, color = ?, sort_order = COALESCE(?, sort_order) WHERE id = ?')
      .run(String(name).trim(), cleanColor, sort_order ?? null, id);
    res.json({ ok: true });
  } catch (err: any) {
    if (String(err?.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'A status with this name already exists' });
    }
    throw err;
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM statuses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Status not found' });
  const inUse = db.prepare('SELECT COUNT(*) AS c FROM students WHERE status_id = ?').get(id) as { c: number };
  if (inUse.c > 0) {
    return res.status(400).json({ error: `Cannot delete: ${inUse.c} student(s) currently have this status. Move them to another status first.` });
  }
  db.prepare('DELETE FROM statuses WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
