import CryptoJS from 'crypto-js';

const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    console.warn('[WARN] ENCRYPTION_KEY is missing. Using development fallback key. Set ENCRYPTION_KEY in Railway environment variables for production.');
    // Development fallback (32 chars) to avoid build-time failures
    return 'development-encryption-key-32-bytes!!';
  }
  if (key.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    console.warn('[WARN] ENCRYPTION_KEY is shorter than 32 characters. Using provided key in development.');
  }
  return key;
};

/**
 * Encrypt a password using AES-256
 */
export function encryptPassword(password: string): string {
  try {
    const key = getEncryptionKey();
    const encrypted = CryptoJS.AES.encrypt(password, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * Decrypt a password using AES-256
 */
export function decryptPassword(encryptedPassword: string): string {
  try {
    const key = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Decryption produced empty result');
    }

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt password');
  }
}

