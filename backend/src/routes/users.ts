import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

router.use(requireAuth);

// All authenticated users can list users (needed for "assigned to" dropdowns).
router.get('/', (_req, res) => {
  const users = db
    .prepare(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
        (SELECT COUNT(*) FROM students s WHERE s.assigned_to = u.id) AS student_count
      FROM users u ORDER BY u.name
    `)
    .all();
  res.json({ users });
});

router.post('/', requireAdmin, (req, res) => {
  const { name, email, password, role } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const cleanRole = role === 'admin' ? 'admin' : 'counselor';
  try {
    const result = db
      .prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(String(name).trim(), String(email).trim().toLowerCase(), bcrypt.hashSync(password, 10), cleanRole, new Date().toISOString());
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) {
    if (String(err?.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    throw err;
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id) as { id: number; role: string } | undefined;
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { name, email, password, role } = req.body ?? {};
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const cleanRole = role === 'admin' ? 'admin' : 'counselor';
  if (id === req.user!.id && cleanRole !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin role' });
  }
  try {
    db.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?')
      .run(String(name).trim(), String(email).trim().toLowerCase(), cleanRole, id);
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), id);
    }
    res.json({ ok: true });
  } catch (err: any) {
    if (String(err?.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    throw err;
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE students SET assigned_to = NULL WHERE assigned_to = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
