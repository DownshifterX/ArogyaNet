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
  patientId?: string;
  patientName?: string | null;
  patientEmail?: string | null;
  createdAt: string;
  encrypted?: boolean;
  encryptionNonce?: string;
  encryptionKeyId?: string;
}

export interface LiverMeasurements {
  Age: number;
  TB: number;
  DB: number;
  ALKP: number;
  SGPT: number;
  SGOT: number;
  TP: number;
  ALB: number;
  AGR: number;
  Gender: number; // 0 or 1
}

export interface LiverAssessmentResult {
  prediction?: number;
  prediction_label?: string;
  probability?: { no_disease?: number; disease?: number };
  confidence?: number;
}

export interface LiverAssessment {
  id: string;
  patientId?: string;
  patientName?: string | null;
  patientEmail?: string | null;
  measurements: LiverMeasurements;
  result?: LiverAssessmentResult | null;
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

const parseUser = (raw: unknown): User | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = (r.id ?? r._id) as string | undefined;
  return {
    id: id ?? '',
    name: (r.name ?? r.full_name ?? '') as string,
    email: (r.email ?? '') as string,
    role: (r.role ?? 'patient') as User['role'],
    doctorApproved: (r.doctorApproved ?? r.doctor_approved) as boolean | undefined,
    phone: (r.phone ?? undefined) as string | undefined,
  };
};

const parseAppointment = (raw: unknown): Appointment => {
  const r = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  return {
    id: (r.id ?? r._id ?? '') as string,
    startAt: (r.startAt ?? r.start_at ?? '') as string,
    endAt: (r.endAt ?? r.end_at ?? undefined) as string | undefined,
    status: (r.status ?? 'requested') as Appointment['status'],
    notes: (r.notes ?? undefined) as string | undefined,
    patient: parseUser(r.patient),
    doctor: parseUser(r.doctor),
    createdAt: r.createdAt as string | undefined,
    updatedAt: r.updatedAt as string | undefined,
  };
};

const parsePrescription = (raw: unknown): Prescription => {
  const r = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  return {
    id: (r.id ?? r._id ?? '') as string,
    medication: (r.medication ?? '') as string,
    dosage: (r.dosage ?? '') as string,
    instructions: (r.instructions ?? null) as string | null,
    patient: parseUser(r.patient),
    doctor: parseUser(r.doctor),
    createdAt: (r.createdAt ?? new Date().toISOString()) as string,
  };
};

const parseDocument = (raw: unknown): MedicalDocument => {
  const r = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  return {
    id: (r.id ?? r._id ?? '') as string,
    originalName: (r.originalName ?? '') as string,
    mimeType: (r.mimeType ?? '') as string,
    size: (r.size ?? 0) as number,
    url: (r.url ?? '') as string,
    patientId: (r.patientId ?? undefined) as string | undefined,
    patientName: (r.patientName ?? null) as string | null,
    patientEmail: (r.patientEmail ?? null) as string | null,
    createdAt: (r.createdAt ?? new Date().toISOString()) as string,
    encrypted: (r.encrypted ?? false) as boolean,
    encryptionNonce: (r.encryptionNonce ?? undefined) as string | undefined,
    encryptionKeyId: (r.encryptionKeyId ?? undefined) as string | undefined,
  };
};

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

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, message: data.message || 'Failed to change password' };
      return { success: true, message: data.message || 'Password changed' };
    } catch (err) {
      console.error('Error changing password:', err);
      return { success: false, message: 'Network error' };
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

  // Documents - Using S3 presigned URLs
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

  async uploadDocument(file: File, enableEncryption: boolean = true): Promise<MedicalDocument | null> {
    try {
      let fileToUpload: File | Blob = file;
      let encryptionNonce: string | undefined;
      let encryptionKeyId: string | undefined;
      const originalSize = file.size;
      let uploadMimeType = file.type;

      console.log('[Upload] Starting upload:', {
        name: file.name,
        size: file.size,
        type: file.type,
        encryption: enableEncryption,
      });

      // Step 1: Encrypt file if enabled
      if (enableEncryption) {
        const { encryptFile, createEncryptedBlob, uint8ArrayToBase64 } = await import('@/utils/encryption');
        
        const encrypted = await encryptFile(file);
        encryptionNonce = uint8ArrayToBase64(encrypted.nonce);
        encryptionKeyId = encrypted.keyId;
        
        console.log('[Upload] File encrypted:', {
          keyId: encryptionKeyId,
          nonceLength: encrypted.nonce.length,
          ciphertextLength: encrypted.ciphertext.length,
          originalSize: file.size,
        });
        
        // Create blob from encrypted data
        fileToUpload = createEncryptedBlob(encrypted, 'application/octet-stream');
        uploadMimeType = 'application/octet-stream';
        
        console.log('[Upload] Encrypted blob created:', {
          size: fileToUpload.size,
          type: uploadMimeType,
        });
      }

      // Step 2: Get presigned upload URL from backend
      const urlRes = await fetch(`${BACKEND_URL}/api/documents/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          originalName: file.name,
          mimeType: uploadMimeType,
          size: fileToUpload.size,
        }),
      });

      if (!urlRes.ok) {
        const errData = await urlRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to get upload URL');
      }

      const { uploadUrl, s3Key } = await urlRes.json();

      // Step 3: Upload directly to S3 using presigned URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': uploadMimeType,
        },
        body: fileToUpload,
      });

      if (!uploadRes.ok) {
        const bodyText = await uploadRes.text().catch(() => '');
        console.error('S3 upload failed', { status: uploadRes.status, body: bodyText });
        throw new Error(`Failed to upload to S3 (${uploadRes.status})`);
      }

      // Step 4: Confirm upload with backend to save metadata
      const confirmRes = await fetch(`${BACKEND_URL}/api/documents/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          s3Key,
          originalName: file.name,
          mimeType: file.type, // Original MIME type
          size: originalSize, // Original file size
          encrypted: enableEncryption,
          encryptionNonce,
          encryptionKeyId,
        }),
      });

      if (!confirmRes.ok) {
        throw new Error('Failed to confirm upload');
      }

      const data = await confirmRes.json();
      return parseDocument(data);
    } catch (err) {
      console.error('Error uploading document:', err);
      return null;
    }
  },

  async getDocumentDownloadUrl(documentId: string): Promise<string | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${documentId}/download`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.downloadUrl;
    } catch (err) {
      console.error('Error getting download URL:', err);
      return null;
    }
  },

  async downloadAndDecryptDocument(document: MedicalDocument): Promise<Blob | null> {
    try {
      console.log('[Decrypt] Starting download for document:', {
        id: document.id,
        encrypted: document.encrypted,
        mimeType: document.mimeType,
        hasNonce: !!document.encryptionNonce,
        hasKeyId: !!document.encryptionKeyId,
      });

      // Get download URL
      const downloadUrl = await this.getDocumentDownloadUrl(document.id);
      if (!downloadUrl) {
        throw new Error('Failed to get download URL');
      }

      // Download file from S3
      const fileRes = await fetch(downloadUrl);
      if (!fileRes.ok) {
        throw new Error('Failed to download file');
      }

      const fileData = await fileRes.arrayBuffer();
      console.log('[Decrypt] Downloaded file size:', fileData.byteLength);

      // If not encrypted, return as-is
      if (!document.encrypted || !document.encryptionNonce || !document.encryptionKeyId) {
        console.log('[Decrypt] File not encrypted, returning as-is');
        return new Blob([fileData], { type: document.mimeType });
      }

      // Decrypt file
      const { decryptToBlob, base64ToUint8Array, getEncryptionKey } = await import('@/utils/encryption');
      
      // Check if key exists
      const key = getEncryptionKey(document.encryptionKeyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${document.encryptionKeyId}. Please import the key used to encrypt this file.`);
      }

      console.log('[Decrypt] Found encryption key:', key.id, key.label);
      
      const ciphertext = new Uint8Array(fileData);
      const nonce = base64ToUint8Array(document.encryptionNonce);
      
      console.log('[Decrypt] Decrypting:', {
        ciphertextSize: ciphertext.length,
        nonceSize: nonce.length,
        keyId: document.encryptionKeyId,
      });

      const decryptedBlob = decryptToBlob(
        ciphertext,
        nonce,
        document.encryptionKeyId,
        document.mimeType
      );

      console.log('[Decrypt] Decryption successful, blob size:', decryptedBlob.size, 'type:', decryptedBlob.type);
      return decryptedBlob;
    } catch (err) {
      console.error('[Decrypt] Error downloading/decrypting document:', err);
      throw err;
    }
  },

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting document:', err);
      return false;
    }
  },

  // Liver Assessments (Health data)
  async submitLiverAssessment(measurements: LiverMeasurements): Promise<LiverAssessment | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/assessments/liver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(measurements),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit assessment');
      }
      const data = await res.json();
      const a = data.assessment;
      return a ? {
        id: a.id ?? a._id ?? '',
        patientId: a.patientId ?? undefined,
        patientName: a.patientName ?? null,
        patientEmail: a.patientEmail ?? null,
        measurements: a.measurements,
        result: a.result ?? null,
        createdAt: a.createdAt ?? new Date().toISOString(),
      } as LiverAssessment : null;
    } catch (err) {
      console.error('Error submitting liver assessment:', err);
      return null;
    }
  },

  async listLiverAssessments(): Promise<LiverAssessment[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/assessments/liver`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      const arr = Array.isArray(data?.assessments) ? data.assessments : [];
      return arr.map((a) => ({
        id: a.id ?? a._id ?? '',
        patientId: a.patientId ?? undefined,
        patientName: a.patientName ?? null,
        patientEmail: a.patientEmail ?? null,
        measurements: a.measurements,
        result: a.result ?? null,
        createdAt: a.createdAt ?? new Date().toISOString(),
      } as LiverAssessment));
    } catch (err) {
      console.error('Error listing liver assessments:', err);
      return [];
    }
  },

  // Video endpoints
  async initiateVideoCall(recipientId: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/video/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ recipient_id: recipientId }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to initiate video call');
  return (await res.json()) as Record<string, unknown>;
    } catch (err) {
      console.error('Error initiating video call:', err);
      return null;
    }
  },
};
