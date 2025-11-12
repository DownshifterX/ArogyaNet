// API client for backend communication
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: string;
}

export const apiClient = {
  // Auth endpoints
  async signup(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
      credentials: 'include',
    });
    return res.json();
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      // For now, return null since backend doesn't have a /me endpoint
      // This prevents the frontend from hanging on mount
      return null;
    } catch (err) {
      console.error('Error fetching current user:', err);
      return null;
    }
  },

  // Users endpoints
  async getProfile(userId: string): Promise<User | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  },

  async updateProfile(userId: string, data: Partial<User>): Promise<User | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.error('Error updating profile:', err);
      return null;
    }
  },

  // Appointments endpoints
  async getAppointments(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments`, {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.appointments || [];
    } catch (err) {
      console.error('Error fetching appointments:', err);
      return [];
    }
  },

  async createAppointment(appointmentData: any): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create appointment');
      return res.json();
    } catch (err) {
      console.error('Error creating appointment:', err);
      return null;
    }
  },

  // Video endpoints
  async initiateVideoCall(recipientId: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/video/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
