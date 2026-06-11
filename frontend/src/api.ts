export const DEMO_MODE = import.meta.env.MODE === 'demo';

const TOKEN_KEY = 'crm_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  if (DEMO_MODE) {
    const { demoApi } = await import('./demoApi');
    try {
      return await demoApi<T>(path, options);
    } catch (err: any) {
      if (err?.message === 'Authentication required' && !path.startsWith('/auth/login')) {
        clearToken();
        window.location.hash = '#/login';
      }
      throw err;
    }
  }
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    clearToken();
    window.location.hash = '#/login';
    throw new Error('Session expired');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error ?? 'Request failed');
  }
  return data as T;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'counselor';
  student_count?: number;
  created_at?: string;
}

export interface Status {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  student_count?: number;
}

export interface Campus {
  id: number;
  university_id: number;
  name: string;
}

export interface Intake {
  id: number;
  university_id: number;
  label: string;
}

export interface Course {
  id: number;
  university_id: number;
  name: string;
}

export interface University {
  id: number;
  name: string;
  country?: string | null;
  city?: string | null;
  student_count: number;
  campuses: Campus[];
  intakes: Intake[];
  courses: Course[];
}

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  program?: string | null;
  university_id?: number | null;
  campus_id?: number | null;
  intake_id?: number | null;
  course_id?: number | null;
  status_id?: number | null;
  assigned_to?: number | null;
  created_at: string;
  updated_at: string;
  university_name?: string | null;
  campus_name?: string | null;
  intake_label?: string | null;
  course_name?: string | null;
  status_name?: string | null;
  status_color?: string | null;
  assigned_name?: string | null;
}

export interface Activity {
  id: number;
  type: 'created' | 'status_change' | 'note' | string;
  content: string;
  created_at: string;
  user_name?: string | null;
}

export interface DashboardData {
  totalStudents: number;
  successCount: number;
  activeCount: number;
  newThisMonth: number;
  byStatus: Array<{ id: number; name: string; color: string; count: number }>;
  byUniversity: Array<{ name: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
  recentActivities: Array<Activity & { student_name: string; student_id: number }>;
}
