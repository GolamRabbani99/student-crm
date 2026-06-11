// Demo mode backend: a localStorage-backed replica of the real API so the CRM
// can run fully in the browser on GitHub Pages. Each visitor gets their own data.

const DB_KEY = 'crm_demo_db_v1';

interface DbUser { id: number; name: string; email: string; password: string; role: string; created_at: string }
interface DbUniversity { id: number; name: string; country: string | null; city: string | null; created_at: string }
interface DbCampus { id: number; university_id: number; name: string }
interface DbIntake { id: number; university_id: number; label: string }
interface DbStatus { id: number; name: string; color: string; sort_order: number }
interface DbStudent {
  id: number; first_name: string; last_name: string; email: string | null; phone: string | null;
  country: string | null; program: string | null; university_id: number | null; campus_id: number | null;
  intake_id: number | null; status_id: number | null; assigned_to: number | null; created_at: string; updated_at: string;
}
interface DbActivity { id: number; student_id: number; user_id: number | null; type: string; content: string; created_at: string }

interface Db {
  users: DbUser[];
  universities: DbUniversity[];
  campuses: DbCampus[];
  intakes: DbIntake[];
  statuses: DbStatus[];
  students: DbStudent[];
  activities: DbActivity[];
  nextId: number;
}

const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

function seed(): Db {
  const db: Db = {
    users: [], universities: [], campuses: [], intakes: [], statuses: [], students: [], activities: [], nextId: 1,
  };
  const id = () => db.nextId++;

  const admin = { id: id(), name: 'Golam Rabbani', email: 'admin@crm.com', password: 'admin123', role: 'admin', created_at: now() };
  const counselor = { id: id(), name: 'Sarah Ahmed', email: 'counselor@crm.com', password: 'counselor123', role: 'counselor', created_at: now() };
  db.users.push(admin, counselor);

  const statusDefs: Array<[string, string]> = [
    ['Pending', 'amber'], ['Interview', 'blue'], ['Documents Sent', 'violet'],
    ['Follow Up', 'orange'], ['Documents Received', 'cyan'], ['Success', 'emerald'],
  ];
  const statusIds: Record<string, number> = {};
  statusDefs.forEach(([name, color], i) => {
    const sid = id();
    statusIds[name] = sid;
    db.statuses.push({ id: sid, name, color, sort_order: i + 1 });
  });

  const uniDefs = [
    { name: 'University of Toronto', country: 'Canada', city: 'Toronto', campuses: ['St. George Campus', 'Mississauga Campus', 'Scarborough Campus'], intakes: ['Fall 2026', 'Winter 2027'] },
    { name: 'University of Melbourne', country: 'Australia', city: 'Melbourne', campuses: ['Parkville Campus', 'Southbank Campus'], intakes: ['July 2026', 'February 2027'] },
    { name: 'University of Manchester', country: 'United Kingdom', city: 'Manchester', campuses: ['Main Campus'], intakes: ['September 2026', 'January 2027'] },
    { name: 'Arizona State University', country: 'United States', city: 'Tempe', campuses: ['Tempe Campus', 'Downtown Phoenix Campus', 'Online'], intakes: ['Fall 2026', 'Spring 2027'] },
  ];
  const uniData: Array<{ id: number; campusIds: number[]; intakeIds: number[] }> = [];
  for (const u of uniDefs) {
    const uid = id();
    db.universities.push({ id: uid, name: u.name, country: u.country, city: u.city, created_at: now() });
    const campusIds = u.campuses.map((name) => { const cid = id(); db.campuses.push({ id: cid, university_id: uid, name }); return cid; });
    const intakeIds = u.intakes.map((label) => { const iid = id(); db.intakes.push({ id: iid, university_id: uid, label }); return iid; });
    uniData.push({ id: uid, campusIds, intakeIds });
  }

  const sample: Array<[string, string, string, string, string, number, string, number, number]> = [
    // first, last, email, phone, program, uniIndex, status, assigned, daysOld
    ['Ayesha', 'Khan', 'ayesha.khan@gmail.com', '+880 1711-234567', 'MSc Computer Science', 0, 'Interview', counselor.id, 4],
    ['Rahim', 'Uddin', 'rahim.uddin@gmail.com', '+880 1812-345678', 'BBA', 1, 'Pending', counselor.id, 2],
    ['Fatima', 'Begum', 'fatima.b@gmail.com', '+880 1913-456789', 'MSc Data Science', 2, 'Documents Sent', admin.id, 12],
    ['Tanvir', 'Hossain', 'tanvir.h@gmail.com', '+880 1614-567890', 'MBA', 0, 'Follow Up', counselor.id, 20],
    ['Nusrat', 'Jahan', 'nusrat.j@gmail.com', '+880 1515-678901', 'BSc Nursing', 3, 'Documents Received', admin.id, 28],
    ['Imran', 'Chowdhury', 'imran.c@gmail.com', '+880 1716-789012', 'MEng Civil Engineering', 1, 'Success', counselor.id, 45],
    ['Sadia', 'Islam', 'sadia.islam@gmail.com', '+880 1817-890123', 'MSc Public Health', 2, 'Success', admin.id, 60],
    ['Arif', 'Rahman', 'arif.r@gmail.com', '+880 1918-901234', 'BSc Computer Engineering', 3, 'Pending', counselor.id, 1],
    ['Mehnaz', 'Akter', 'mehnaz.a@gmail.com', '+880 1619-012345', 'LLM International Law', 0, 'Interview', admin.id, 8],
    ['Shakib', 'Hasan', 'shakib.h@gmail.com', '+880 1520-123456', 'MSc Finance', 1, 'Follow Up', counselor.id, 35],
    ['Rumana', 'Sultana', 'rumana.s@gmail.com', '+880 1721-234567', 'PhD Economics', 2, 'Documents Sent', admin.id, 15],
    ['Jamil', 'Ahmed', 'jamil.a@gmail.com', '+880 1822-345678', 'MSc Artificial Intelligence', 0, 'Documents Received', counselor.id, 50],
  ];
  for (const [first, last, email, phone, program, uniIdx, status, assigned, age] of sample) {
    const u = uniData[uniIdx];
    const created = daysAgo(age);
    const sid = id();
    db.students.push({
      id: sid, first_name: first, last_name: last, email, phone, country: 'Bangladesh', program,
      university_id: u.id, campus_id: u.campusIds[0], intake_id: u.intakeIds[0],
      status_id: statusIds[status], assigned_to: assigned, created_at: created, updated_at: created,
    });
    db.activities.push({ id: id(), student_id: sid, user_id: assigned, type: 'created', content: `Student profile created for ${first} ${last}`, created_at: created });
    if (status !== 'Pending') {
      db.activities.push({ id: id(), student_id: sid, user_id: assigned, type: 'status_change', content: `Status changed from Pending to ${status}`, created_at: daysAgo(Math.max(0, age - 1)) });
    }
  }
  return db;
}

function loadDb(): Db {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try { return JSON.parse(raw) as Db; } catch { /* fall through to reseed */ }
  }
  const db = seed();
  saveDb(db);
  return db;
}

function saveDb(db: Db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

class ApiError extends Error {}

function currentUser(db: Db): DbUser {
  const token = localStorage.getItem('crm_token') ?? '';
  const match = /^demo-(\d+)$/.exec(token);
  const user = match ? db.users.find((u) => u.id === Number(match[1])) : undefined;
  if (!user) throw new ApiError('Authentication required');
  return user;
}

function requireAdmin(user: DbUser) {
  if (user.role !== 'admin') throw new ApiError('Admin access required');
}

const publicUser = (u: DbUser) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function joinStudent(db: Db, s: DbStudent) {
  const uni = db.universities.find((u) => u.id === s.university_id);
  const campus = db.campuses.find((c) => c.id === s.campus_id);
  const intake = db.intakes.find((i) => i.id === s.intake_id);
  const status = db.statuses.find((st) => st.id === s.status_id);
  const assignee = db.users.find((u) => u.id === s.assigned_to);
  return {
    ...s,
    university_name: uni?.name ?? null,
    campus_name: campus?.name ?? null,
    intake_label: intake?.label ?? null,
    status_name: status?.name ?? null,
    status_color: status?.color ?? null,
    assigned_name: assignee?.name ?? null,
  };
}

function joinActivity(db: Db, a: DbActivity) {
  return { ...a, user_name: db.users.find((u) => u.id === a.user_id)?.name ?? null };
}

function logActivity(db: Db, studentId: number, userId: number, type: string, content: string) {
  db.activities.push({ id: db.nextId++, student_id: studentId, user_id: userId, type, content, created_at: now() });
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v).trim()).filter(Boolean))];
}

function studentValues(db: Db, body: any) {
  if (!body?.first_name?.trim() || !body?.last_name?.trim()) {
    throw new ApiError('First name and last name are required');
  }
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
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
  };
}

export async function demoApi<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const db = loadDb();
  const method = (options.method ?? 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};
  const [pathname, queryString] = path.split('?');
  const parts = pathname.split('/').filter(Boolean);
  const query = new URLSearchParams(queryString ?? '');
  const result = handle(db, method, parts, query, body);
  saveDb(db);
  return result as T;
}

function handle(db: Db, method: string, parts: string[], query: URLSearchParams, body: any): unknown {
  const [root, second, third] = parts;

  if (root === 'auth') {
    if (second === 'login' && method === 'POST') {
      const user = db.users.find((u) => u.email === String(body.email ?? '').trim().toLowerCase());
      if (!user || user.password !== body.password) throw new ApiError('Invalid email or password');
      return { token: `demo-${user.id}`, user: publicUser(user) };
    }
    if (second === 'me') return { user: publicUser(currentUser(db)) };
  }

  const me = currentUser(db);

  if (root === 'users') {
    if (method === 'GET') {
      return {
        users: db.users.map((u) => ({
          ...publicUser(u),
          created_at: u.created_at,
          student_count: db.students.filter((s) => s.assigned_to === u.id).length,
        })),
      };
    }
    requireAdmin(me);
    if (method === 'POST') {
      if (!body.name || !body.email || !body.password) throw new ApiError('Name, email and password are required');
      if (String(body.password).length < 6) throw new ApiError('Password must be at least 6 characters');
      const email = String(body.email).trim().toLowerCase();
      if (db.users.some((u) => u.email === email)) throw new ApiError('A user with this email already exists');
      const newId = db.nextId++;
      db.users.push({ id: newId, name: String(body.name).trim(), email, password: String(body.password), role: body.role === 'admin' ? 'admin' : 'counselor', created_at: now() });
      return { id: newId };
    }
    const target = db.users.find((u) => u.id === Number(second));
    if (!target) throw new ApiError('User not found');
    if (method === 'PUT') {
      if (!body.name || !body.email) throw new ApiError('Name and email are required');
      const role = body.role === 'admin' ? 'admin' : 'counselor';
      if (target.id === me.id && role !== 'admin') throw new ApiError('You cannot remove your own admin role');
      const email = String(body.email).trim().toLowerCase();
      if (db.users.some((u) => u.email === email && u.id !== target.id)) throw new ApiError('A user with this email already exists');
      target.name = String(body.name).trim();
      target.email = email;
      target.role = role;
      if (body.password) {
        if (String(body.password).length < 6) throw new ApiError('Password must be at least 6 characters');
        target.password = String(body.password);
      }
      return { ok: true };
    }
    if (method === 'DELETE') {
      if (target.id === me.id) throw new ApiError('You cannot delete your own account');
      db.students.forEach((s) => { if (s.assigned_to === target.id) s.assigned_to = null; });
      db.users = db.users.filter((u) => u.id !== target.id);
      return { ok: true };
    }
  }

  if (root === 'universities') {
    if (method === 'GET') {
      return {
        universities: [...db.universities]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((u) => ({
            ...u,
            student_count: db.students.filter((s) => s.university_id === u.id).length,
            campuses: db.campuses.filter((c) => c.university_id === u.id),
            intakes: db.intakes.filter((i) => i.university_id === u.id),
          })),
      };
    }
    requireAdmin(me);
    if (method === 'POST') {
      if (!body.name?.trim()) throw new ApiError('University name is required');
      const newId = db.nextId++;
      db.universities.push({ id: newId, name: body.name.trim(), country: body.country?.trim() || null, city: body.city?.trim() || null, created_at: now() });
      cleanList(body.campuses).forEach((name) => db.campuses.push({ id: db.nextId++, university_id: newId, name }));
      cleanList(body.intakes).forEach((label) => db.intakes.push({ id: db.nextId++, university_id: newId, label }));
      return { id: newId };
    }
    const target = db.universities.find((u) => u.id === Number(second));
    if (!target) throw new ApiError('University not found');
    if (method === 'PUT') {
      if (!body.name?.trim()) throw new ApiError('University name is required');
      target.name = body.name.trim();
      target.country = body.country?.trim() || null;
      target.city = body.city?.trim() || null;
      const newCampuses = cleanList(body.campuses);
      for (const old of db.campuses.filter((c) => c.university_id === target.id)) {
        if (!newCampuses.includes(old.name)) {
          db.students.forEach((s) => { if (s.campus_id === old.id) s.campus_id = null; });
          db.campuses = db.campuses.filter((c) => c.id !== old.id);
        }
      }
      const existingCampusNames = db.campuses.filter((c) => c.university_id === target.id).map((c) => c.name);
      newCampuses.filter((n) => !existingCampusNames.includes(n))
        .forEach((name) => db.campuses.push({ id: db.nextId++, university_id: target.id, name }));
      const newIntakes = cleanList(body.intakes);
      for (const old of db.intakes.filter((i) => i.university_id === target.id)) {
        if (!newIntakes.includes(old.label)) {
          db.students.forEach((s) => { if (s.intake_id === old.id) s.intake_id = null; });
          db.intakes = db.intakes.filter((i) => i.id !== old.id);
        }
      }
      const existingIntakeLabels = db.intakes.filter((i) => i.university_id === target.id).map((i) => i.label);
      newIntakes.filter((l) => !existingIntakeLabels.includes(l))
        .forEach((label) => db.intakes.push({ id: db.nextId++, university_id: target.id, label }));
      return { ok: true };
    }
    if (method === 'DELETE') {
      db.students.forEach((s) => {
        if (s.university_id === target.id) { s.university_id = null; s.campus_id = null; s.intake_id = null; }
      });
      db.campuses = db.campuses.filter((c) => c.university_id !== target.id);
      db.intakes = db.intakes.filter((i) => i.university_id !== target.id);
      db.universities = db.universities.filter((u) => u.id !== target.id);
      return { ok: true };
    }
  }

  if (root === 'statuses') {
    if (method === 'GET') {
      return {
        statuses: [...db.statuses]
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
          .map((st) => ({ ...st, student_count: db.students.filter((s) => s.status_id === st.id).length })),
      };
    }
    requireAdmin(me);
    if (method === 'POST') {
      if (!body.name?.trim()) throw new ApiError('Status name is required');
      if (db.statuses.some((s) => s.name.toLowerCase() === body.name.trim().toLowerCase())) throw new ApiError('A status with this name already exists');
      const newId = db.nextId++;
      const maxOrder = Math.max(0, ...db.statuses.map((s) => s.sort_order));
      db.statuses.push({ id: newId, name: body.name.trim(), color: body.color ?? 'slate', sort_order: maxOrder + 1 });
      return { id: newId };
    }
    const target = db.statuses.find((s) => s.id === Number(second));
    if (!target) throw new ApiError('Status not found');
    if (method === 'PUT') {
      if (!body.name?.trim()) throw new ApiError('Status name is required');
      if (db.statuses.some((s) => s.name.toLowerCase() === body.name.trim().toLowerCase() && s.id !== target.id)) throw new ApiError('A status with this name already exists');
      target.name = body.name.trim();
      target.color = body.color ?? target.color;
      return { ok: true };
    }
    if (method === 'DELETE') {
      const inUse = db.students.filter((s) => s.status_id === target.id).length;
      if (inUse > 0) throw new ApiError(`Cannot delete: ${inUse} student(s) currently have this status. Move them to another status first.`);
      db.statuses = db.statuses.filter((s) => s.id !== target.id);
      return { ok: true };
    }
  }

  if (root === 'students') {
    if (!second && method === 'GET') {
      let list = db.students.map((s) => joinStudent(db, s));
      const search = query.get('search')?.trim().toLowerCase();
      if (search) {
        list = list.filter((s) =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(search) ||
          (s.email ?? '').toLowerCase().includes(search) ||
          (s.phone ?? '').toLowerCase().includes(search) ||
          (s.program ?? '').toLowerCase().includes(search));
      }
      if (query.get('status_id')) list = list.filter((s) => s.status_id === Number(query.get('status_id')));
      if (query.get('university_id')) list = list.filter((s) => s.university_id === Number(query.get('university_id')));
      if (query.get('intake_id')) list = list.filter((s) => s.intake_id === Number(query.get('intake_id')));
      if (query.get('assigned_to')) list = list.filter((s) => s.assigned_to === Number(query.get('assigned_to')));
      list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return { students: list };
    }
    if (!second && method === 'POST') {
      const v = studentValues(db, body);
      if (v.status_id === null) {
        const first = [...db.statuses].sort((a, b) => a.sort_order - b.sort_order)[0];
        v.status_id = first?.id ?? null;
      }
      const newId = db.nextId++;
      const ts = now();
      db.students.push({ id: newId, ...v, created_at: ts, updated_at: ts });
      logActivity(db, newId, me.id, 'created', `Student profile created for ${v.first_name} ${v.last_name}`);
      return { id: newId };
    }
    const target = db.students.find((s) => s.id === Number(second));
    if (!target) throw new ApiError('Student not found');

    if (third === 'status' && method === 'POST') {
      const status = db.statuses.find((s) => s.id === Number(body.status_id));
      if (!status) throw new ApiError('Invalid status');
      if (status.id !== target.status_id) {
        const oldName = db.statuses.find((s) => s.id === target.status_id)?.name ?? 'None';
        const note = body.note ? ` — ${String(body.note).trim()}` : '';
        target.status_id = status.id;
        target.updated_at = now();
        logActivity(db, target.id, me.id, 'status_change', `Status changed from ${oldName} to ${status.name}${note}`);
      }
      return { ok: true };
    }
    if (third === 'notes' && method === 'POST') {
      const content = String(body.content ?? '').trim();
      if (!content) throw new ApiError('Note cannot be empty');
      logActivity(db, target.id, me.id, 'note', content);
      target.updated_at = now();
      return { ok: true };
    }
    if (!third && method === 'GET') {
      const activities = db.activities
        .filter((a) => a.student_id === target.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .map((a) => joinActivity(db, a));
      return { student: joinStudent(db, target), activities };
    }
    if (!third && method === 'PUT') {
      const v = studentValues(db, body);
      const oldStatus = target.status_id;
      Object.assign(target, v, { status_id: v.status_id ?? oldStatus, updated_at: now() });
      if (v.status_id !== null && v.status_id !== oldStatus) {
        const oldName = db.statuses.find((s) => s.id === oldStatus)?.name ?? 'None';
        const newName = db.statuses.find((s) => s.id === v.status_id)?.name ?? 'None';
        logActivity(db, target.id, me.id, 'status_change', `Status changed from ${oldName} to ${newName}`);
      }
      return { ok: true };
    }
    if (!third && method === 'DELETE') {
      requireAdmin(me);
      db.activities = db.activities.filter((a) => a.student_id !== target.id);
      db.students = db.students.filter((s) => s.id !== target.id);
      return { ok: true };
    }
  }

  if (root === 'dashboard' && method === 'GET') {
    const byStatus = [...db.statuses]
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map((st) => ({ id: st.id, name: st.name, color: st.color, count: db.students.filter((s) => s.status_id === st.id).length }));
    const successCount = byStatus.find((s) => s.name.toLowerCase() === 'success')?.count ?? 0;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const newThisMonth = db.students.filter((s) => s.created_at >= monthStart.toISOString()).length;
    const byUniversity = db.universities
      .map((u) => ({ name: u.name, count: db.students.filter((s) => s.university_id === u.id).length }))
      .filter((u) => u.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const months: Array<{ key: string; label: string }> = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push({
        key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
        label: m.toLocaleString('en', { month: 'short' }),
      });
    }
    const monthlyTrend = months.map((m) => ({
      month: m.label,
      count: db.students.filter((s) => s.created_at.startsWith(m.key)).length,
    }));
    const recentActivities = [...db.activities]
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      .slice(0, 8)
      .map((a) => {
        const student = db.students.find((s) => s.id === a.student_id);
        return {
          ...joinActivity(db, a),
          student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
          student_id: a.student_id,
        };
      })
      .filter((a) => a.student_name !== 'Unknown');
    return {
      totalStudents: db.students.length,
      successCount,
      activeCount: db.students.length - successCount,
      newThisMonth,
      byStatus,
      byUniversity,
      monthlyTrend,
      recentActivities,
    };
  }

  throw new ApiError(`Demo API: unhandled route ${method} /${parts.join('/')}`);
}

export function resetDemoData() {
  localStorage.removeItem(DB_KEY);
}
