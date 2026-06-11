import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type Status } from '../api';
import {
  COLOR_OPTIONS, dotColors, ErrorBanner, inputClass, labelClass, Modal,
  primaryBtn, secondaryBtn, Spinner, StatusBadge,
} from '../components/ui';

export default function Statuses() {
  const [statuses, setStatuses] = useState<Status[] | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Status | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ statuses: Status[] }>('/statuses');
    setStatuses(data.statuses);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function handleDelete(s: Status) {
    if (!window.confirm(`Delete status "${s.name}"?`)) return;
    setError('');
    try {
      await api(`/statuses/${s.id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!statuses) return error ? <ErrorBanner message={error} /> : <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Statuses</h1>
          <p className="mt-1 text-sm text-slate-500">The stages of your student pipeline. Statuses appear in the order below.</p>
        </div>
        <button className={primaryBtn} onClick={() => { setEditing(null); setShowForm(true); }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Status
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Order', 'Status', 'Color', 'Students', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {statuses.map((s, idx) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                <td className="px-4 py-3"><StatusBadge name={s.name} color={s.color} /></td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm capitalize text-slate-600">
                    <span className={`h-3 w-3 rounded-full ${dotColors[s.color] ?? dotColors.slate}`} />
                    {s.color}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{s.student_count}</td>
                <td className="px-4 py-3 text-right">
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
                    <button
                      title="Delete"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => handleDelete(s)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <StatusForm
          status={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function StatusForm({
  status, onClose, onSaved,
}: {
  status: Status | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(status?.name ?? '');
  const [color, setColor] = useState(status?.color ?? 'blue');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (status) {
        await api(`/statuses/${status.id}`, { method: 'PUT', body: JSON.stringify({ name, color }) });
      } else {
        await api('/statuses', { method: 'POST', body: JSON.stringify({ name, color }) });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={status ? 'Edit Status' : 'Add Status'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className={labelClass}>Status name *</label>
          <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Visa Applied" />
        </div>
        <div>
          <label className={labelClass}>Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full ${dotColors[c]} transition ${
                  color === c ? 'ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Preview</p>
          <div className="mt-1.5"><StatusBadge name={name || 'Status name'} color={color} /></div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Saving…' : status ? 'Save changes' : 'Add status'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
