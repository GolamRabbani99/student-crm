import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'crm.db'));

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'counselor',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS universities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT,
    city TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS intakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    label TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT 'slate',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    country TEXT,
    program TEXT,
    university_id INTEGER REFERENCES universities(id) ON DELETE SET NULL,
    campus_id INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
    intake_id INTEGER REFERENCES intakes(id) ON DELETE SET NULL,
    status_id INTEGER REFERENCES statuses(id),
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Migration for databases created before the courses feature existed.
try {
  db.exec('ALTER TABLE students ADD COLUMN course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL');
} catch {
  // Column already exists.
}

function now(): string {
  return new Date().toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const SAMPLE_UNIVERSITIES: Array<{
  name: string; country: string; city: string; campuses: string[]; intakes: string[]; courses: string[];
}> = [
  {
    name: 'University of Toronto', country: 'Canada', city: 'Toronto',
    campuses: ['St. George Campus', 'Mississauga Campus', 'Scarborough Campus'],
    intakes: ['Fall 2026', 'Winter 2027'],
    courses: ['MSc Computer Science', 'MSc Artificial Intelligence', 'MBA', 'LLM International Law', 'BSc Economics'],
  },
  {
    name: 'University of Melbourne', country: 'Australia', city: 'Melbourne',
    campuses: ['Parkville Campus', 'Southbank Campus'],
    intakes: ['July 2026', 'February 2027'],
    courses: ['BBA', 'MEng Civil Engineering', 'MSc Finance', 'BSc Biomedicine'],
  },
  {
    name: 'University of Manchester', country: 'United Kingdom', city: 'Manchester',
    campuses: ['Main Campus'],
    intakes: ['September 2026', 'January 2027'],
    courses: ['MSc Data Science', 'MSc Public Health', 'PhD Economics', 'LLB Law'],
  },
  {
    name: 'Arizona State University', country: 'United States', city: 'Tempe',
    campuses: ['Tempe Campus', 'Downtown Phoenix Campus', 'Online'],
    intakes: ['Fall 2026', 'Spring 2027'],
    courses: ['BSc Computer Engineering', 'BSc Nursing', 'MSc Software Engineering', 'MBA'],
  },
];

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  if (userCount.c > 0) return;

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const adminId = insertUser.run('Golam Rabbani', 'admin@crm.com', hash('admin123'), 'admin', now())
    .lastInsertRowid as number;
  const counselorId = insertUser.run('Sarah Ahmed', 'counselor@crm.com', hash('counselor123'), 'counselor', now())
    .lastInsertRowid as number;

  const insertStatus = db.prepare('INSERT INTO statuses (name, color, sort_order) VALUES (?, ?, ?)');
  const statusIds: Record<string, number> = {};
  const defaultStatuses: Array<[string, string]> = [
    ['Pending', 'amber'],
    ['Interview', 'blue'],
    ['Documents Sent', 'violet'],
    ['Follow Up', 'orange'],
    ['Documents Received', 'cyan'],
    ['Success', 'emerald'],
  ];
  defaultStatuses.forEach(([name, color], i) => {
    statusIds[name] = insertStatus.run(name, color, i + 1).lastInsertRowid as number;
  });

  const insertUni = db.prepare('INSERT INTO universities (name, country, city, created_at) VALUES (?, ?, ?, ?)');
  const insertCampus = db.prepare('INSERT INTO campuses (university_id, name) VALUES (?, ?)');
  const insertIntake = db.prepare('INSERT INTO intakes (university_id, label) VALUES (?, ?)');
  const insertCourse = db.prepare('INSERT INTO courses (university_id, name) VALUES (?, ?)');

  const unis = SAMPLE_UNIVERSITIES;

  const uniData: Array<{ id: number; campusIds: number[]; intakeIds: number[]; courseIds: Record<string, number> }> = [];
  for (const u of unis) {
    const uid = insertUni.run(u.name, u.country, u.city, now()).lastInsertRowid as number;
    const campusIds = u.campuses.map((c) => insertCampus.run(uid, c).lastInsertRowid as number);
    const intakeIds = u.intakes.map((i) => insertIntake.run(uid, i).lastInsertRowid as number);
    const courseIds: Record<string, number> = {};
    u.courses.forEach((c) => {
      courseIds[c] = insertCourse.run(uid, c).lastInsertRowid as number;
    });
    uniData.push({ id: uid, campusIds, intakeIds, courseIds });
  }

  const insertStudent = db.prepare(`
    INSERT INTO students (first_name, last_name, email, phone, country, program,
      university_id, campus_id, intake_id, course_id, status_id, assigned_to, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertActivity = db.prepare(
    'INSERT INTO activities (student_id, user_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  const sampleStudents: Array<{
    first: string; last: string; email: string; phone: string; country: string; program: string;
    uni: number; status: string; assigned: number; age: number;
  }> = [
    { first: 'Ayesha', last: 'Khan', email: 'ayesha.khan@gmail.com', phone: '+880 1711-234567', country: 'Bangladesh', program: 'MSc Computer Science', uni: 0, status: 'Interview', assigned: counselorId, age: 4 },
    { first: 'Rahim', last: 'Uddin', email: 'rahim.uddin@gmail.com', phone: '+880 1812-345678', country: 'Bangladesh', program: 'BBA', uni: 1, status: 'Pending', assigned: counselorId, age: 2 },
    { first: 'Fatima', last: 'Begum', email: 'fatima.b@gmail.com', phone: '+880 1913-456789', country: 'Bangladesh', program: 'MSc Data Science', uni: 2, status: 'Documents Sent', assigned: adminId, age: 12 },
    { first: 'Tanvir', last: 'Hossain', email: 'tanvir.h@gmail.com', phone: '+880 1614-567890', country: 'Bangladesh', program: 'MBA', uni: 0, status: 'Follow Up', assigned: counselorId, age: 20 },
    { first: 'Nusrat', last: 'Jahan', email: 'nusrat.j@gmail.com', phone: '+880 1515-678901', country: 'Bangladesh', program: 'BSc Nursing', uni: 3, status: 'Documents Received', assigned: adminId, age: 28 },
    { first: 'Imran', last: 'Chowdhury', email: 'imran.c@gmail.com', phone: '+880 1716-789012', country: 'Bangladesh', program: 'MEng Civil Engineering', uni: 1, status: 'Success', assigned: counselorId, age: 45 },
    { first: 'Sadia', last: 'Islam', email: 'sadia.islam@gmail.com', phone: '+880 1817-890123', country: 'Bangladesh', program: 'MSc Public Health', uni: 2, status: 'Success', assigned: adminId, age: 60 },
    { first: 'Arif', last: 'Rahman', email: 'arif.r@gmail.com', phone: '+880 1918-901234', country: 'Bangladesh', program: 'BSc Computer Engineering', uni: 3, status: 'Pending', assigned: counselorId, age: 1 },
    { first: 'Mehnaz', last: 'Akter', email: 'mehnaz.a@gmail.com', phone: '+880 1619-012345', country: 'Bangladesh', program: 'LLM International Law', uni: 0, status: 'Interview', assigned: adminId, age: 8 },
    { first: 'Shakib', last: 'Hasan', email: 'shakib.h@gmail.com', phone: '+880 1520-123456', country: 'Bangladesh', program: 'MSc Finance', uni: 1, status: 'Follow Up', assigned: counselorId, age: 35 },
    { first: 'Rumana', last: 'Sultana', email: 'rumana.s@gmail.com', phone: '+880 1721-234567', country: 'Bangladesh', program: 'PhD Economics', uni: 2, status: 'Documents Sent', assigned: adminId, age: 15 },
    { first: 'Jamil', last: 'Ahmed', email: 'jamil.a@gmail.com', phone: '+880 1822-345678', country: 'Bangladesh', program: 'MSc Artificial Intelligence', uni: 0, status: 'Documents Received', assigned: counselorId, age: 50 },
  ];

  for (const s of sampleStudents) {
    const u = uniData[s.uni];
    const created = daysAgo(s.age);
    const studentId = insertStudent.run(
      s.first, s.last, s.email, s.phone, s.country, s.program,
      u.id, u.campusIds[0], u.intakeIds[0], u.courseIds[s.program] ?? null,
      statusIds[s.status], s.assigned, created, created
    ).lastInsertRowid as number;
    insertActivity.run(studentId, s.assigned, 'created', `Student profile created for ${s.first} ${s.last}`, created);
    if (s.status !== 'Pending') {
      insertActivity.run(
        studentId, s.assigned, 'status_change',
        `Status changed from Pending to ${s.status}`, daysAgo(Math.max(0, s.age - 1))
      );
    }
  }

  console.log('Database seeded with demo accounts and sample data.');
}

// Backfill for databases created before the courses feature: give each existing
// university its sample course list (or a generic one) and link students whose
// program text matches a course name.
function ensureCourses() {
  const courseCount = (db.prepare('SELECT COUNT(*) AS c FROM courses').get() as { c: number }).c;
  const uniCount = (db.prepare('SELECT COUNT(*) AS c FROM universities').get() as { c: number }).c;
  if (courseCount > 0 || uniCount === 0) return;

  const genericCourses = ['BBA', 'MBA', 'BSc Computer Science', 'MSc Computer Science', 'MSc Data Science'];
  const insertCourse = db.prepare('INSERT INTO courses (university_id, name) VALUES (?, ?)');
  const unis = db.prepare('SELECT id, name FROM universities').all() as Array<{ id: number; name: string }>;
  for (const uni of unis) {
    const sample = SAMPLE_UNIVERSITIES.find((s) => s.name === uni.name);
    for (const course of sample?.courses ?? genericCourses) {
      insertCourse.run(uni.id, course);
    }
  }
  db.exec(`
    UPDATE students SET course_id = (
      SELECT c.id FROM courses c
      WHERE c.university_id = students.university_id AND c.name = students.program
    )
    WHERE course_id IS NULL
  `);
  console.log('Added course lists to existing universities.');
}

seed();
ensureCourses();
