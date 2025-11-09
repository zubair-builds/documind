import CryptoJS from 'crypto-js';

const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  return key;
};

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt a password using AES-256
 */
export function encryptPassword(password: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
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
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
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

