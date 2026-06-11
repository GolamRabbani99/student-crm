import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  api, type Activity, type Status, type Student, type University, type User,
} from '../api';
import { useAuth } from '../auth';
import {
  Avatar, dangerBtn, EmptyState, ErrorBanner, formatDate, inputClass, labelClass,
  Modal, primaryBtn, secondaryBtn, Spinner, StatusBadge, timeAgo,
} from '../components/ui';

interface Lists {
  statuses: Status[];
  universities: University[];
  users: User[];
}

export default function Students() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [uniFilter, setUniFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [detailId, setDetailId] = useState<number | null>(
    searchParams.get('focus') ? Number(searchParams.get('focus')) : null
  );

  const loadLists = useCallback(async () => {
    const [st, un, us] = await Promise.all([
      api<{ statuses: Status[] }>('/statuses'),
      api<{ universities: University[] }>('/universities'),
      api<{ users: User[] }>('/users'),
    ]);
    setLists({ statuses: st.statuses, universities: un.universities, users: us.users });
  }, []);

  const loadStudents = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status_id', statusFilter);
    if (uniFilter) params.set('university_id', uniFilter);
    if (assignedFilter) params.set('assigned_to', assignedFilter);
    const data = await api<{ students: Student[] }>(`/students?${params.toString()}`);
    setStudents(data.students);
  }, [search, statusFilter, uniFilter, assignedFilter]);

  useEffect(() => {
    loadLists().catch((e) => setError(e.message));
  }, [loadLists]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadStudents().catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [loadStudents]);

  function refresh() {
    loadStudents().catch((e) => setError(e.message));
    loadLists().catch(() => undefined);
  }

  async function quickStatusChange(student: Student, statusId: number) {
    try {
      await api(`/students/${student.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status_id: statusId }),
      });
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(student: Student) {
    if (!window.confirm(`Delete ${student.first_name} ${student.last_name}? This cannot be undone.`)) return;
    try {
      await api(`/students/${student.id}`, { method: 'DELETE' });
      setDetailId(null);
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!lists) return error ? <ErrorBanner message={error} /> : <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            {students ? `${students.length} student${students.length === 1 ? '' : 's'}` : 'Loading…'}
          </p>
        </div>
        <button className={primaryBtn} onClick={() => { setEditing(null); setShowForm(true); }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Student
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search name, email, phone, program…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`${inputClass} w-auto`}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setSearchParams(e.target.value ? { status: e.target.value } : {}); }}
        >
          <option value="">All statuses</option>
          {lists.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={`${inputClass} w-auto`} value={uniFilter} onChange={(e) => setUniFilter(e.target.value)}>
          <option value="">All universities</option>
          {lists.universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className={`${inputClass} w-auto`} value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}>
          <option value="">All counselors</option>
          {lists.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {!students ? (
        <Spinner />
      ) : students.length === 0 ? (
        <EmptyState title="No students found" hint="Try changing the filters, or add your first student." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Student', 'University & Program', 'Intake', 'Status', 'Counselor', 'Updated', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => setDetailId(s.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${s.first_name} ${s.last_name}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-slate-500">{s.email ?? s.phone ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{s.university_name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{s.program ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.intake_label ?? '—'}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <StatusQuickSelect
                      student={s}
                      statuses={lists.statuses}
                      onChange={(statusId) => quickStatusChange(s, statusId)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.assigned_name ?? 'Unassigned'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(s.updated_at)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button
                        title="Edit"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                        onClick={() => { setEditing(s); setShowForm(true); }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          title="Delete"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => handleDelete(s)}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <StudentForm
          student={editing}
          lists={lists}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
        />
      )}

      {detailId !== null && (
        <StudentDrawer
          studentId={detailId}
          lists={lists}
          isAdmin={user?.role === 'admin'}
          onClose={() => setDetailId(null)}
          onChanged={refresh}
          onEdit={(s) => { setEditing(s); setShowForm(true); }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function StatusQuickSelect({
  student, statuses, onChange,
}: {
  student: Student;
  statuses: Status[];
  onChange: (statusId: number) => void;
}) {
  return (
    <div className="group relative inline-block">
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={student.status_id ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        title="Change status"
      >
        {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <StatusBadge name={student.status_name} color={student.status_color} />
    </div>
  );
}

function StudentForm({
  student, lists, onClose, onSaved,
}: {
  student: Student | null;
  lists: Lists;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    first_name: student?.first_name ?? '',
    last_name: student?.last_name ?? '',
    email: student?.email ?? '',
    phone: student?.phone ?? '',
    country: student?.country ?? '',
    program: student?.program ?? '',
    university_id: student?.university_id ? String(student.university_id) : '',
    campus_id: student?.campus_id ? String(student.campus_id) : '',
    intake_id: student?.intake_id ? String(student.intake_id) : '',
    status_id: student?.status_id ? String(student.status_id) : (lists.statuses[0] ? String(lists.statuses[0].id) : ''),
    assigned_to: student?.assigned_to ? String(student.assigned_to) : '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedUni = useMemo(
    () => lists.universities.find((u) => String(u.id) === form.university_id) ?? null,
    [lists.universities, form.university_id]
  );

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'university_id') {
        next.campus_id = '';
        next.intake_id = '';
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        ...form,
        university_id: form.university_id || null,
        campus_id: form.campus_id || null,
        intake_id: form.intake_id || null,
        status_id: form.status_id || null,
        assigned_to: form.assigned_to || null,
      };
      if (student) {
        await api(`/students/${student.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/students', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={student ? 'Edit Student' : 'Add Student'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First name *</label>
            <input className={inputClass} required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Last name *</label>
            <input className={inputClass} required value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input className={inputClass} value={form.country} onChange={(e) => set('country', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Program / Course</label>
            <input className={inputClass} placeholder="e.g. MSc Computer Science" value={form.program} onChange={(e) => set('program', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>University</label>
            <select className={inputClass} value={form.university_id} onChange={(e) => set('university_id', e.target.value)}>
              <option value="">Not selected</option>
              {lists.universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Campus</label>
            <select className={inputClass} value={form.campus_id} onChange={(e) => set('campus_id', e.target.value)} disabled={!selectedUni}>
              <option value="">Not selected</option>
              {selectedUni?.campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Intake</label>
            <select className={inputClass} value={form.intake_id} onChange={(e) => set('intake_id', e.target.value)} disabled={!selectedUni}>
              <option value="">Not selected</option>
              {selectedUni?.intakes.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={form.status_id} onChange={(e) => set('status_id', e.target.value)}>
              {lists.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Assigned counselor</label>
            <select className={inputClass} value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">Unassigned</option>
              {lists.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Saving…' : student ? 'Save changes' : 'Add student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StudentDrawer({
  studentId, lists, isAdmin, onClose, onChanged, onEdit, onDelete,
}: {
  studentId: number;
  lists: Lists;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (s: Student) => void;
  onDelete: (s: Student) => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ student: Student; activities: Activity[] }>(`/students/${studentId}`);
    setStudent(data.student);
    setActivities(data.activities);
  }, [studentId]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function changeStatus(statusId: number) {
    try {
      await api(`/students/${studentId}/status`, { method: 'POST', body: JSON.stringify({ status_id: statusId }) });
      await load();
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api(`/students/${studentId}/notes`, { method: 'POST', body: JSON.stringify({ content: note }) });
      setNote('');
      await load();
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!student ? (
          <div className="p-8">{error ? <ErrorBanner message={error} /> : <Spinner />}</div>
        ) : (
          <>
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar name={`${student.first_name} ${student.last_name}`} size="lg" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {student.first_name} {student.last_name}
                    </h2>
                    <p className="text-sm text-slate-500">{student.program ?? 'No program set'}</p>
                    <div className="mt-1.5">
                      <StatusBadge name={student.status_name} color={student.status_color} />
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600" aria-label="Close">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button className={secondaryBtn} onClick={() => onEdit(student)}>Edit details</button>
                {isAdmin && <button className={dangerBtn} onClick={() => onDelete(student)}>Delete</button>}
              </div>
            </div>

            <div className="flex-1 space-y-6 px-6 py-6">
              {error && <ErrorBanner message={error} />}

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Details</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Detail label="Email" value={student.email} />
                  <Detail label="Phone" value={student.phone} />
                  <Detail label="Country" value={student.country} />
                  <Detail label="University" value={student.university_name} />
                  <Detail label="Campus" value={student.campus_name} />
                  <Detail label="Intake" value={student.intake_label} />
                  <Detail label="Counselor" value={student.assigned_name ?? 'Unassigned'} />
                  <Detail label="Added" value={formatDate(student.created_at)} />
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Move to status</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lists.statuses.map((s) => (
                    <button
                      key={s.id}
                      disabled={s.id === student.status_id}
                      onClick={() => changeStatus(s.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
                        s.id === student.status_id
                          ? 'cursor-default bg-slate-900 text-white ring-slate-900'
                          : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50 hover:ring-blue-400'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Add note</h3>
                <form onSubmit={addNote} className="mt-3 flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="Write a note about this student…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <button type="submit" className={primaryBtn} disabled={busy || !note.trim()}>Add</button>
                </form>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h3>
                <ul className="mt-4 space-y-0">
                  {activities.map((act, idx) => (
                    <li key={act.id} className="relative flex gap-3 pb-5">
                      {idx !== activities.length - 1 && (
                        <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />
                      )}
                      <span
                        className={`mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-white ${
                          act.type === 'status_change' ? 'bg-blue-500' : act.type === 'note' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700">{act.content}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {act.user_name ?? 'System'} · {timeAgo(act.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-700">{value || '—'}</dd>
    </div>
  );
}
