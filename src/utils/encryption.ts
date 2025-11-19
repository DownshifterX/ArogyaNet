/**
 * Client-side ChaCha20-Poly1305 encryption utilities for medical documents
 * 
 * Security Features:
 * - ChaCha20-Poly1305 AEAD (Authenticated Encryption with Associated Data)
 * - 256-bit keys
 * - 96-bit nonces (never reused)
 * - Authenticated encryption prevents tampering
 * - Automatic key derivation from user ID (transparent to users)
 */

import { ChaCha20Poly1305 } from '@stablelib/chacha20poly1305';
import { randomBytes } from '@stablelib/random';
import { hash } from '@stablelib/sha256';
import { env } from '@/config/env';

const KEY_STORAGE_KEY = 'arogyanet_encryption_keys';
const KEY_SIZE = 32; // 256 bits
const NONCE_SIZE = 12; // 96 bits

// Get encryption salt from environment variable
// This makes keys unique to your application
const APP_SALT = env.encryptionSalt;

export interface EncryptionKey {
  id: string;
  key: Uint8Array;
  createdAt: string;
  label?: string;
}

/**
 * Derive a deterministic encryption key from user ID
 * This allows automatic encryption/decryption without manual key management
 * 
 * @param userId - The user's ID from authentication
 * @returns 256-bit encryption key derived from userId + APP_SALT
 */
export function deriveKeyFromUserId(userId: string): Uint8Array {
  if (!userId || userId.trim().length === 0) {
    throw new Error('User ID is required for key derivation');
  }
  
  // Create input: userId + salt
  const input = userId + APP_SALT;
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(input);
  
  // Hash to get 256-bit key
  const derivedKey = hash(inputBytes);
  
  return derivedKey;
}

/**
 * Create an EncryptionKey object from user ID (for compatibility with existing code)
 * This wraps deriveKeyFromUserId() in the EncryptionKey interface
 * 
 * @param userId - The user's ID from authentication
 * @returns EncryptionKey object with derived key
 */
export function deriveAutoEncryptionKey(userId: string): EncryptionKey {
  const key = deriveKeyFromUserId(userId);
  
  return {
    id: `auto-${userId}`, // Deterministic key ID
    key,
    createdAt: new Date().toISOString(),
    label: 'Automatic encryption (derived from account)',
  };
}

export interface EncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  keyId: string;
}

/**
 * Generate a new 256-bit encryption key
 */
export function generateEncryptionKey(label?: string): EncryptionKey {
  const key = randomBytes(KEY_SIZE);
  const id = Array.from(randomBytes(16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    id,
    key,
    createdAt: new Date().toISOString(),
    label,
  };
}

/**
 * Check if localStorage is available and working
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get all stored encryption keys
 */
export function getStoredKeys(): EncryptionKey[] {
  try {
    if (!isStorageAvailable()) {
      console.warn('localStorage is not available (may be in private mode or storage is full)');
      return [];
    }
    
    const stored = localStorage.getItem(KEY_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((k: { id: string; key: number[]; createdAt: string; label?: string }) => ({
      ...k,
      key: new Uint8Array(Object.values(k.key)),
    }));
  } catch (error) {
    console.error('Failed to load encryption keys:', error);
    return [];
  }
}

/**
 * Save encryption key to local storage
 */
export function saveEncryptionKey(key: EncryptionKey): void {
  try {
    if (!isStorageAvailable()) {
      throw new Error('Storage is not available. You may be in private browsing mode or storage is full. Please use regular browsing mode.');
    }
    
    const keys = getStoredKeys();
    const existing = keys.findIndex(k => k.id === key.id);
    
    if (existing >= 0) {
      keys[existing] = key;
    } else {
      keys.push(key);
    }
    
    // Convert Uint8Array to plain object for JSON serialization
    const serializable = keys.map(k => ({
      ...k,
      key: Array.from(k.key),
    }));
    
    localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Failed to save encryption key:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to save encryption key. Please check your browser storage settings.');
  }
}

/**
 * Get encryption key by ID
 */
export function getEncryptionKey(keyId: string): EncryptionKey | null {
  const keys = getStoredKeys();
  return keys.find(k => k.id === keyId) || null;
}

/**
 * Get or create the default encryption key
 */
export function getOrCreateDefaultKey(): EncryptionKey {
  const keys = getStoredKeys();
  
  if (keys.length === 0) {
    const newKey = generateEncryptionKey('Default Key');
    saveEncryptionKey(newKey);
    return newKey;
  }
  
  return keys[0];
}

/**
 * Encrypt a file using ChaCha20-Poly1305
 */
export async function encryptFile(file: File, keyOrKeyId?: string | EncryptionKey): Promise<EncryptedData> {
  try {
    // Get encryption key
    let encKey: EncryptionKey | null;
    
    if (!keyOrKeyId) {
      // No key provided, use default
      encKey = getOrCreateDefaultKey();
    } else if (typeof keyOrKeyId === 'string') {
      // String keyId provided, look up stored key
      encKey = getEncryptionKey(keyOrKeyId);
    } else {
      // EncryptionKey object provided directly
      encKey = keyOrKeyId;
    }
    
    if (!encKey) {
      throw new Error('Encryption key not found');
    }
    
    // Generate unique nonce
    const nonce = randomBytes(NONCE_SIZE);
    
    // Read file as ArrayBuffer
    const fileData = await file.arrayBuffer();
    const plaintext = new Uint8Array(fileData);
    
    // Initialize ChaCha20-Poly1305
    const cipher = new ChaCha20Poly1305(encKey.key);
    
    // Encrypt (includes authentication tag)
    const ciphertext = cipher.seal(nonce, plaintext);
    
    return {
      ciphertext,
      nonce,
      keyId: encKey.id,
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Decrypt data using ChaCha20-Poly1305
 */
export function decryptData(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  keyOrKeyId: string | Uint8Array
): Uint8Array {
  try {
    let decryptionKey: Uint8Array;
    
    if (typeof keyOrKeyId === 'string') {
      // String keyId provided, look up stored key
      const encKey = getEncryptionKey(keyOrKeyId);
      
      if (!encKey) {
        throw new Error(`Encryption key not found: ${keyOrKeyId}`);
      }
      
      decryptionKey = encKey.key;
    } else {
      // Uint8Array key provided directly
      decryptionKey = keyOrKeyId;
    }
    
    // Initialize ChaCha20-Poly1305
    const cipher = new ChaCha20Poly1305(decryptionKey);
    
    // Decrypt and verify authentication tag
    const plaintext = cipher.open(nonce, ciphertext);
    
    if (!plaintext) {
      throw new Error('Decryption failed - authentication tag mismatch');
    }
    
    return plaintext;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Create an encrypted File/Blob from encrypted data
 */
export function createEncryptedBlob(
  encryptedData: EncryptedData,
  mimeType: string = 'application/octet-stream'
): Blob {
  return new Blob([new Uint8Array(encryptedData.ciphertext)], { type: mimeType });
}

/**
 * Decrypt and create a downloadable File/Blob
 */
export function decryptToBlob(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  keyOrKeyId: string | Uint8Array,
  originalMimeType: string
): Blob {
  const plaintext = decryptData(ciphertext, nonce, keyOrKeyId);
  return new Blob([new Uint8Array(plaintext)], { type: originalMimeType });
}

/**
 * Export encryption key as base64 for backup
 */
export function exportKey(keyId: string): string | null {
  const key = getEncryptionKey(keyId);
  if (!key) return null;
  
  const keyData = {
    id: key.id,
    key: Array.from(key.key),
    createdAt: key.createdAt,
    label: key.label,
  };
  
  return btoa(JSON.stringify(keyData));
}

/**
 * Import encryption key from base64 backup
 */
export function importKey(base64Key: string): EncryptionKey {
  try {
    const keyData = JSON.parse(atob(base64Key));
    const key: EncryptionKey = {
      id: keyData.id,
      key: new Uint8Array(keyData.key),
      createdAt: keyData.createdAt,
      label: keyData.label,
    };
    
    saveEncryptionKey(key);
    return key;
  } catch (error) {
    console.error('Failed to import key:', error);
    throw new Error('Invalid encryption key format');
  }
}

/**
 * Convert Uint8Array to base64 for transmission
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(array)));
}

/**
 * Convert base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Delete an encryption key
 */
export function deleteEncryptionKey(keyId: string): void {
  try {
    const keys = getStoredKeys().filter(k => k.id !== keyId);
    
    const serializable = keys.map(k => ({
      ...k,
      key: Array.from(k.key),
    }));
    
    localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Failed to delete encryption key:', error);
    throw new Error('Failed to delete encryption key');
  }
}

/**
 * Clear all encryption keys (use with caution!)
 */
export function clearAllKeys(): void {
  localStorage.removeItem(KEY_STORAGE_KEY);
}
