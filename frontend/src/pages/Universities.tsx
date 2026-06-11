import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { api, type University } from '../api';
import { useAuth } from '../auth';
import {
  EmptyState, ErrorBanner, inputClass, labelClass, Modal, primaryBtn, secondaryBtn, Spinner,
} from '../components/ui';

export default function Universities() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [universities, setUniversities] = useState<University[] | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<University | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ universities: University[] }>('/universities');
    setUniversities(data.universities);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function handleDelete(u: University) {
    if (!window.confirm(`Delete ${u.name}? Students linked to it will keep their profile but lose the university link.`)) return;
    try {
      await api(`/universities/${u.id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!universities) return error ? <ErrorBanner message={error} /> : <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Universities</h1>
          <p className="mt-1 text-sm text-slate-500">Partner institutions, their campuses and intakes.</p>
        </div>
        {isAdmin && (
          <button className={primaryBtn} onClick={() => { setEditing(null); setShowForm(true); }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add University
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {universities.length === 0 ? (
        <EmptyState title="No universities yet" hint={isAdmin ? 'Add your first partner university.' : 'An admin needs to add universities.'} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {universities.map((u) => (
            <div key={u.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{u.name}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {[u.city, u.country].filter(Boolean).join(', ') || 'Location not set'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {u.student_count} student{u.student_count === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Campuses</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {u.campuses.length === 0 && <span className="text-xs text-slate-400">None added</span>}
                    {u.campuses.map((c) => (
                      <span key={c.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{c.name}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Intakes</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {u.intakes.length === 0 && <span className="text-xs text-slate-400">None added</span>}
                    {u.intakes.map((i) => (
                      <span key={i.id} className="rounded-md bg-violet-50 px-2 py-1 text-xs text-violet-700">{i.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  <button className={`${secondaryBtn} flex-1`} onClick={() => { setEditing(u); setShowForm(true); }}>
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => handleDelete(u)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <UniversityForm
          university={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function TagInput({
  label, placeholder, values, onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function commit() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    }
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="rounded-lg border border-slate-300 bg-white p-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {v}
              <button
                type="button"
                className="text-slate-400 hover:text-rose-600"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="min-w-[140px] flex-1 border-0 bg-transparent p-1 text-sm focus:outline-none focus:ring-0"
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">Type a name and press Enter to add it.</p>
    </div>
  );
}

function UniversityForm({
  university, onClose, onSaved,
}: {
  university: University | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(university?.name ?? '');
  const [country, setCountry] = useState(university?.country ?? '');
  const [city, setCity] = useState(university?.city ?? '');
  const [campuses, setCampuses] = useState<string[]>(university?.campuses.map((c) => c.name) ?? []);
  const [intakes, setIntakes] = useState<string[]>(university?.intakes.map((i) => i.label) ?? []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { name, country, city, campuses, intakes };
      if (university) {
        await api(`/universities/${university.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/universities', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={university ? 'Edit University' : 'Add University'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className={labelClass}>University name *</label>
          <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. University of Toronto" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Country</label>
            <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Canada" />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Toronto" />
          </div>
        </div>
        <TagInput label="Campus locations" placeholder="e.g. Main Campus" values={campuses} onChange={setCampuses} />
        <TagInput label="Intakes" placeholder="e.g. Fall 2026" values={intakes} onChange={setIntakes} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Saving…' : university ? 'Save changes' : 'Add university'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
