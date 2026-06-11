import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type User } from '../api';
import { useAuth } from '../auth';
import {
  Avatar, ErrorBanner, formatDate, inputClass, labelClass, Modal,
  primaryBtn, secondaryBtn, Spinner,
} from '../components/ui';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ users: User[] }>('/users');
    setUsers(data.users);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function handleDelete(u: User) {
    if (!window.confirm(`Delete ${u.name}? Their students will become unassigned.`)) return;
    setError('');
    try {
      await api(`/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!users) return error ? <ErrorBanner message={error} /> : <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="mt-1 text-sm text-slate-500">Manage who can sign in and what they can do.</p>
        </div>
        <button className={primaryBtn} onClick={() => { setEditing(null); setShowForm(true); }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Team Member
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Member', 'Role', 'Assigned Students', 'Joined', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {u.name} {u.id === me?.id && <span className="text-xs font-normal text-slate-400">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      u.role === 'admin'
                        ? 'bg-violet-50 text-violet-700 ring-violet-600/20'
                        : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                    }`}
                  >
                    {u.role === 'admin' ? 'Admin' : 'Counselor'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{u.student_count}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{u.created_at ? formatDate(u.created_at) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      title="Edit"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                      onClick={() => { setEditing(u); setShowForm(true); }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    {u.id !== me?.id && (
                      <button
                        title="Delete"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => handleDelete(u)}
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

      {showForm && (
        <UserForm
          user={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function UserForm({
  user, onClose, onSaved,
}: {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(user?.role ?? 'counselor');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload: Record<string, string> = { name, email, role };
      if (password) payload.password = password;
      if (user) {
        await api(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        if (!password) {
          setError('Password is required for a new team member');
          setBusy(false);
          return;
        }
        await api('/users', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={user ? 'Edit Team Member' : 'Add Team Member'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className={labelClass}>Full name *</label>
          <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>{user ? 'New password (leave blank to keep current)' : 'Password *'}</label>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label className={labelClass}>Role</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'counselor', label: 'Counselor', hint: 'Manage students and notes' },
              { value: 'admin', label: 'Admin', hint: 'Full access incl. settings' },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`rounded-lg border p-3 text-left transition ${
                  role === r.value
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                <p className="text-xs text-slate-500">{r.hint}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Saving…' : user ? 'Save changes' : 'Add member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
