# EduFlow CRM — Student Recruitment

**🌐 Live demo: https://golamrabbani99.github.io/student-crm/** — log in with the demo accounts below. The demo runs entirely in your browser (each visitor gets their own sandbox data).

A role-based CRM for student recruitment agencies. Admins manage universities (with campus locations and intakes), pipeline statuses, and team accounts. Counselors manage students through the pipeline: **Pending → Interview → Documents Sent → Follow Up → Documents Received → Success**.

## How to start the CRM (easiest way)

1. Open the `crm student` folder in File Explorer.
2. Double-click **`start-crm.bat`**.
3. Wait — the first run installs packages (a few minutes). After that it takes seconds.
4. Your browser opens at **http://localhost:4500** automatically.
5. Keep the two black command windows open while you use the CRM. Close them to stop it.

## Login accounts

| Role | Email | Password | Can do |
|---|---|---|---|
| Admin | `admin@crm.com` | `admin123` | Everything: universities, statuses, team, delete students |
| Counselor | `counselor@crm.com` | `counselor123` | Manage students, change statuses, add notes |

> Change these passwords from the **Team** page (login as admin → Team → Edit).

## What's inside

- **Dashboard** — student totals, pipeline chart, monthly trend, top universities, recent activity.
- **Students** — search and filter by status / university / counselor; click a row for full details, status changes, notes, and a complete timeline.
- **Universities** — admin adds university name, country/city, campus locations, intakes, and courses. These appear as dropdowns when adding a student (pick a university first, then its campuses, intakes, and courses).
- **Statuses** — admin can rename, recolor, add, or remove pipeline stages.
- **Team** — admin adds counselors or other admins.

## Resetting the data

All data lives in one file: `backend\data\crm.db`. Delete that file and restart the CRM — it recreates itself with the demo accounts and sample students.

## Technical notes (for developers)

- Backend: Node.js + Express + TypeScript, SQLite via the built-in `node:sqlite` (no database server needed), JWT auth, bcrypt password hashing. Runs on port 4000 (`cd backend && npm run dev`).
- Frontend: React 18 + TypeScript + Vite + Tailwind + Recharts + React Router. Runs on port 4500 (`cd frontend && npm run dev`), proxies `/api` to the backend.
- Architecture notes: `docs/CRM_BLUEPRINT.md`.
