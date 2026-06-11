import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

router.use(requireAuth);

const BASE_SELECT = `
  SELECT s.*,
    un.name AS university_name,
    c.name AS campus_name,
    i.label AS intake_label,
    st.name AS status_name,
    st.color AS status_color,
    a.name AS assigned_name
  FROM students s
  LEFT JOIN universities un ON un.id = s.university_id
  LEFT JOIN campuses c ON c.id = s.campus_id
  LEFT JOIN intakes i ON i.id = s.intake_id
  LEFT JOIN statuses st ON st.id = s.status_id
  LEFT JOIN users a ON a.id = s.assigned_to
`;

router.get('/', (req, res) => {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  const { search, status_id, university_id, intake_id, assigned_to } = req.query;
  if (search && String(search).trim()) {
    conditions.push(`(s.first_name || ' ' || s.last_name LIKE ? OR s.email LIKE ? OR s.phone LIKE ? OR s.program LIKE ?)`);
    const like = `%${String(search).trim()}%`;
    params.push(like, like, like, like);
  }
  if (status_id) { conditions.push('s.status_id = ?'); params.push(Number(status_id)); }
  if (university_id) { conditions.push('s.university_id = ?'); params.push(Number(university_id)); }
  if (intake_id) { conditions.push('s.intake_id = ?'); params.push(Number(intake_id)); }
  if (assigned_to) { conditions.push('s.assigned_to = ?'); params.push(Number(assigned_to)); }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const students = db.prepare(`${BASE_SELECT}${where} ORDER BY s.updated_at DESC`).all(...params);
  res.json({ students });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const student = db.prepare(`${BASE_SELECT} WHERE s.id = ?`).get(id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const activities = db
    .prepare(`
      SELECT act.*, u.name AS user_name
      FROM activities act
      LEFT JOIN users u ON u.id = act.user_id
      WHERE act.student_id = ?
      ORDER BY act.created_at DESC, act.id DESC
    `)
    .all(id);
  res.json({ student, activities });
});

function studentPayload(body: any) {
  const required = ['first_name', 'last_name'];
  for (const f of required) {
    if (!body?.[f] || !String(body[f]).trim()) return { error: 'First name and last name are required' };
  }
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    values: {
      first_name: String(body.first_name).trim(),
      last_name: String(body.last_name).trim(),
      email: body.email ? String(body.email).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      country: body.country ? String(body.country).trim() : null,
      program: body.program ? String(body.program).trim() : null,
      university_id: num(body.university_id),
      campus_id: num(body.campus_id),
      intake_id: num(body.intake_id),
      status_id: num(body.status_id),
      assigned_to: num(body.assigned_to),
    },
  };
}

router.post('/', (req, res) => {
  const parsed = studentPayload(req.body);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });
  const v = parsed.values!;

  if (v.status_id === null) {
    const first = db.prepare('SELECT id FROM statuses ORDER BY sort_order, id LIMIT 1').get() as { id: number } | undefined;
    v.status_id = first?.id ?? null;
  }
  const ts = new Date().toISOString();
  const result = db
    .prepare(`
      INSERT INTO students (first_name, last_name, email, phone, country, program,
        university_id, campus_id, intake_id, status_id, assigned_to, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(v.first_name, v.last_name, v.email, v.phone, v.country, v.program,
      v.university_id, v.campus_id, v.intake_id, v.status_id, v.assigned_to, ts, ts);
  const studentId = Number(result.lastInsertRowid);
  db.prepare('INSERT INTO activities (student_id, user_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(studentId, req.user!.id, 'created', `Student profile created for ${v.first_name} ${v.last_name}`, ts);
  res.status(201).json({ id: studentId });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Student not found' });

  const parsed = studentPayload(req.body);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });
  const v = parsed.values!;
  const ts = new Date().toISOString();

  db.prepare(`
    UPDATE students SET first_name = ?, last_name = ?, email = ?, phone = ?, country = ?, program = ?,
      university_id = ?, campus_id = ?, intake_id = ?, status_id = ?, assigned_to = ?, updated_at = ?
    WHERE id = ?
  `).run(v.first_name, v.last_name, v.email, v.phone, v.country, v.program,
    v.university_id, v.campus_id, v.intake_id, v.status_id ?? existing.status_id, v.assigned_to, ts, id);

  if (v.status_id !== null && v.status_id !== existing.status_id) {
    const oldName = (db.prepare('SELECT name FROM statuses WHERE id = ?').get(existing.status_id) as any)?.name ?? 'None';
    const newName = (db.prepare('SELECT name FROM statuses WHERE id = ?').get(v.status_id) as any)?.name ?? 'None';
    db.prepare('INSERT INTO activities (student_id, user_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user!.id, 'status_change', `Status changed from ${oldName} to ${newName}`, ts);
  }
  res.json({ ok: true });
});

router.post('/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Student not found' });

  const statusId = Number(req.body?.status_id);
  const status = db.prepare('SELECT id, name FROM statuses WHERE id = ?').get(statusId) as any;
  if (!status) return res.status(400).json({ error: 'Invalid status' });

  const ts = new Date().toISOString();
  db.prepare('UPDATE students SET status_id = ?, updated_at = ? WHERE id = ?').run(statusId, ts, id);

  if (statusId !== existing.status_id) {
    const oldName = (db.prepare('SELECT name FROM statuses WHERE id = ?').get(existing.status_id) as any)?.name ?? 'None';
    const note = req.body?.note ? ` — ${String(req.body.note).trim()}` : '';
    db.prepare('INSERT INTO activities (student_id, user_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user!.id, 'status_change', `Status changed from ${oldName} to ${status.name}${note}`, ts);
  }
  res.json({ ok: true });
});

router.post('/:id/notes', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Student not found' });
  const content = String(req.body?.content ?? '').trim();
  if (!content) return res.status(400).json({ error: 'Note cannot be empty' });
  const ts = new Date().toISOString();
  db.prepare('INSERT INTO activities (student_id, user_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.user!.id, 'note', content, ts);
  db.prepare('UPDATE students SET updated_at = ? WHERE id = ?').run(ts, id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Student not found' });
  db.prepare('DELETE FROM activities WHERE student_id = ?').run(id);
  db.prepare('DELETE FROM students WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
