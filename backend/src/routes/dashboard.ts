import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', (_req, res) => {
  const totalStudents = (db.prepare('SELECT COUNT(*) AS c FROM students').get() as any).c as number;

  const byStatus = db
    .prepare(`
      SELECT st.id, st.name, st.color, COUNT(s.id) AS count
      FROM statuses st
      LEFT JOIN students s ON s.status_id = st.id
      GROUP BY st.id ORDER BY st.sort_order, st.id
    `)
    .all() as Array<{ id: number; name: string; color: string; count: number }>;

  const successRow = byStatus.find((s) => s.name.toLowerCase() === 'success');
  const successCount = successRow?.count ?? 0;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = (db
    .prepare('SELECT COUNT(*) AS c FROM students WHERE created_at >= ?')
    .get(monthStart.toISOString()) as any).c as number;

  const byUniversity = db
    .prepare(`
      SELECT un.name, COUNT(s.id) AS count
      FROM universities un
      LEFT JOIN students s ON s.university_id = un.id
      GROUP BY un.id
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 6
    `)
    .all();

  // Last 6 calendar months of new students (ISO timestamps sort/group by YYYY-MM prefix).
  const months: Array<{ key: string; label: string }> = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: m.toLocaleString('en', { month: 'short' }) });
  }
  const counts = db
    .prepare(`SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS count FROM students GROUP BY month`)
    .all() as Array<{ month: string; count: number }>;
  const monthlyTrend = months.map((m) => ({
    month: m.label,
    count: counts.find((c) => c.month === m.key)?.count ?? 0,
  }));

  const recentActivities = db
    .prepare(`
      SELECT act.id, act.type, act.content, act.created_at,
        u.name AS user_name,
        s.first_name || ' ' || s.last_name AS student_name,
        s.id AS student_id
      FROM activities act
      LEFT JOIN users u ON u.id = act.user_id
      JOIN students s ON s.id = act.student_id
      ORDER BY act.created_at DESC, act.id DESC
      LIMIT 8
    `)
    .all();

  res.json({
    totalStudents,
    successCount,
    activeCount: totalStudents - successCount,
    newThisMonth,
    byStatus,
    byUniversity,
    monthlyTrend,
    recentActivities,
  });
});

export default router;
