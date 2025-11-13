// API client for backend communication
import { env } from '@/config/env';

const BACKEND_URL = env.backendUrl;

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  doctorApproved?: boolean;
  phone?: string;
}

export interface Appointment {
  id: string;
  startAt: string;
  endAt?: string;
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  patient?: User | null;
  doctor?: User | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  instructions?: string | null;
  patient?: User | null;
  doctor?: User | null;
  createdAt: string;
}

export interface MedicalDocument {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseUser = (raw: any | null | undefined): User | null => {
  if (!raw) return null;
  return {
    id: raw.id ?? raw._id ?? '',
    name: raw.name ?? raw.full_name ?? '',
    email: raw.email ?? '',
    role: raw.role ?? 'patient',
    doctorApproved: raw.doctorApproved ?? raw.doctor_approved ?? undefined,
    phone: raw.phone ?? undefined,
  };
};

const parseAppointment = (raw: any): Appointment => ({
  id: raw.id ?? raw._id ?? '',
  startAt: raw.startAt ?? raw.start_at ?? '',
  endAt: raw.endAt ?? raw.end_at ?? undefined,
  status: raw.status ?? 'requested',
  notes: raw.notes ?? undefined,
  patient: parseUser(raw.patient),
  doctor: parseUser(raw.doctor),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const parsePrescription = (raw: any): Prescription => ({
  id: raw.id ?? raw._id ?? '',
  medication: raw.medication ?? '',
  dosage: raw.dosage ?? '',
  instructions: raw.instructions ?? null,
  patient: parseUser(raw.patient),
  doctor: parseUser(raw.doctor),
  createdAt: raw.createdAt ?? new Date().toISOString(),
});

const parseDocument = (raw: any): MedicalDocument => ({
  id: raw.id ?? raw._id ?? '',
  originalName: raw.originalName ?? '',
  mimeType: raw.mimeType ?? '',
  size: raw.size ?? 0,
  url: raw.url ?? '',
  createdAt: raw.createdAt ?? new Date().toISOString(),
});

export const apiClient = {
  // Auth endpoints
  async signup(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fullName, email, password }),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      return { success: true, message: 'Registered', token: data.accessToken, user: parseUser(data.user) ?? undefined };
    }
    return { success: false, message: data.message || 'Registration failed' };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      return { success: true, message: 'Logged in', token: data.accessToken, user: parseUser(data.user) ?? undefined };
    }
    return { success: false, message: data.message || 'Login failed' };
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
    } finally {
      localStorage.removeItem('accessToken');
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;

      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        localStorage.removeItem('accessToken');
        return null;
      }

      const data = await res.json().catch(() => null);
      return parseUser(data?.user);
    } catch (err) {
      console.error('Error fetching current user:', err);
      return null;
    }
  },

  // Users endpoints
  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      return Array.isArray(data) ? data.map(parseUser).filter(Boolean) as User[] : [];
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  },

  async getDoctors(): Promise<User[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/doctors`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch doctors');
      const data = await res.json();
      return Array.isArray(data) ? data.map(parseUser).filter(Boolean) as User[] : [];
    } catch (err) {
      console.error('Error fetching doctors:', err);
      return [];
    }
  },

  async getProfile(userId: string): Promise<User | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return parseUser(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  },

  async updateProfile(userId: string, data: Partial<User>): Promise<User | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const payload = await res.json();
      return parseUser(payload);
    } catch (err) {
      console.error('Error updating profile:', err);
      return null;
    }
  },

  async updateUserRole(userId: string, role: User['role']): Promise<User | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ role }),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const payload = await res.json();
      return parseUser(payload);
    } catch (err) {
      console.error('Error updating user role:', err);
      return null;
    }
  },

  async updateDoctorApproval(userId: string, doctorApproved: boolean): Promise<User | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ doctorApproved }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update doctor approval');
      const payload = await res.json();
      return parseUser(payload);
    } catch (err) {
      console.error('Error updating doctor approval:', err);
      return null;
    }
  },

  // Appointments endpoints
  async getAppointments(): Promise<Appointment[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map(parseAppointment) : [];
    } catch (err) {
      console.error('Error fetching appointments:', err);
      return [];
    }
  },

  async createAppointment(appointmentData: { doctorId: string; startAt: string; endAt?: string; notes?: string }): Promise<Appointment | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(appointmentData),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create appointment');
      const payload = await res.json();
      return parseAppointment(payload);
    } catch (err) {
      console.error('Error creating appointment:', err);
      return null;
    }
  },

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update appointment');
      const payload = await res.json();
      return parseAppointment(payload);
    } catch (err) {
      console.error('Error updating appointment:', err);
      return null;
    }
  },

  // Prescriptions
  async getPrescriptions(): Promise<Prescription[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/prescriptions`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map(parsePrescription) : [];
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      return [];
    }
  },

  async createPrescription(payload: { patientId: string; medication: string; dosage: string; instructions?: string }): Promise<Prescription | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create prescription');
      const data = await res.json();
      return parsePrescription(data);
    } catch (err) {
      console.error('Error creating prescription:', err);
      return null;
    }
  },

  // Documents
  async listDocuments(): Promise<MedicalDocument[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map(parseDocument) : [];
    } catch (err) {
      console.error('Error fetching documents:', err);
      return [];
    }
  },

  async uploadDocument(file: File): Promise<MedicalDocument | null> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/documents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload document');
      const data = await res.json();
      return parseDocument(data);
    } catch (err) {
      console.error('Error uploading document:', err);
      return null;
    }
  },

  // Video endpoints
  async initiateVideoCall(recipientId: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/video/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ recipient_id: recipientId }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to initiate video call');
      return res.json();
    } catch (err) {
      console.error('Error initiating video call:', err);
      return null;
    }
  },
};
