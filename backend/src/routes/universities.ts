import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', (_req, res) => {
  const universities = db
    .prepare(`
      SELECT u.*,
        (SELECT COUNT(*) FROM students s WHERE s.university_id = u.id) AS student_count
      FROM universities u ORDER BY u.name
    `)
    .all() as any[];
  const campuses = db.prepare('SELECT * FROM campuses ORDER BY name').all() as any[];
  const intakes = db.prepare('SELECT * FROM intakes ORDER BY label').all() as any[];
  res.json({
    universities: universities.map((u) => ({
      ...u,
      campuses: campuses.filter((c) => c.university_id === u.id),
      intakes: intakes.filter((i) => i.university_id === u.id),
    })),
  });
});

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v).trim()).filter(Boolean))];
}

router.post('/', requireAdmin, (req, res) => {
  const { name, country, city, campuses, intakes } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'University name is required' });
  }
  const result = db
    .prepare('INSERT INTO universities (name, country, city, created_at) VALUES (?, ?, ?, ?)')
    .run(String(name).trim(), country ? String(country).trim() : null, city ? String(city).trim() : null, new Date().toISOString());
  const uniId = Number(result.lastInsertRowid);
  const insertCampus = db.prepare('INSERT INTO campuses (university_id, name) VALUES (?, ?)');
  const insertIntake = db.prepare('INSERT INTO intakes (university_id, label) VALUES (?, ?)');
  cleanList(campuses).forEach((c) => insertCampus.run(uniId, c));
  cleanList(intakes).forEach((i) => insertIntake.run(uniId, i));
  res.status(201).json({ id: uniId });
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM universities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'University not found' });

  const { name, country, city, campuses, intakes } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'University name is required' });
  }
  db.prepare('UPDATE universities SET name = ?, country = ?, city = ? WHERE id = ?')
    .run(String(name).trim(), country ? String(country).trim() : null, city ? String(city).trim() : null, id);

  // Reconcile campuses: keep existing ones whose name is still present, add new, remove the rest.
  const newCampuses = cleanList(campuses);
  const oldCampuses = db.prepare('SELECT id, name FROM campuses WHERE university_id = ?').all(id) as Array<{ id: number; name: string }>;
  for (const old of oldCampuses) {
    if (!newCampuses.includes(old.name)) {
      db.prepare('UPDATE students SET campus_id = NULL WHERE campus_id = ?').run(old.id);
      db.prepare('DELETE FROM campuses WHERE id = ?').run(old.id);
    }
  }
  const oldCampusNames = oldCampuses.map((c) => c.name);
  newCampuses
    .filter((c) => !oldCampusNames.includes(c))
    .forEach((c) => db.prepare('INSERT INTO campuses (university_id, name) VALUES (?, ?)').run(id, c));

  const newIntakes = cleanList(intakes);
  const oldIntakes = db.prepare('SELECT id, label FROM intakes WHERE university_id = ?').all(id) as Array<{ id: number; label: string }>;
  for (const old of oldIntakes) {
    if (!newIntakes.includes(old.label)) {
      db.prepare('UPDATE students SET intake_id = NULL WHERE intake_id = ?').run(old.id);
      db.prepare('DELETE FROM intakes WHERE id = ?').run(old.id);
    }
  }
  const oldIntakeLabels = oldIntakes.map((i) => i.label);
  newIntakes
    .filter((i) => !oldIntakeLabels.includes(i))
    .forEach((i) => db.prepare('INSERT INTO intakes (university_id, label) VALUES (?, ?)').run(id, i));

  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM universities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'University not found' });
  db.prepare('UPDATE students SET university_id = NULL, campus_id = NULL, intake_id = NULL WHERE university_id = ?').run(id);
  db.prepare('DELETE FROM universities WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
