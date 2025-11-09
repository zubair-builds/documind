import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

/**
 * Get the temporary directory path from environment or use default
 */
export function getTempDir(): string {
  const tempDir = process.env.TEMP_DIR || './temp';
  return path.resolve(process.cwd(), tempDir);
}

/**
 * Ensure the temp directory exists
 */
export async function ensureTempDir(): Promise<void> {
  const tempDir = getTempDir();
  if (!existsSync(tempDir)) {
    await fs.mkdir(tempDir, { recursive: true });
  }
}

/**
 * Generate a unique filename using timestamp and random string
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  return `${nameWithoutExt}-${timestamp}-${random}${ext}`;
}

/**
 * Get full path for a temp file
 */
export function getTempFilePath(filename: string): string {
  return path.join(getTempDir(), filename);
}

/**
 * Write uploaded file buffer to temp directory
 */
export async function writeTempFile(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  await ensureTempDir();
  const uniqueFilename = generateUniqueFilename(originalName);
  const filePath = getTempFilePath(uniqueFilename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Delete a file from the temp directory
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.error(`Error deleting temp file ${filePath}:`, error);
    // Don't throw - cleanup should not break the main flow
  }
}

/**
 * Delete multiple temp files
 */
export async function deleteTempFiles(filePaths: string[]): Promise<void> {
  await Promise.all(filePaths.map(deleteTempFile));
}

/**
 * Get the maximum file size in bytes from environment
 */
export function getMaxFileSize(): number {
  const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
  return maxSizeMB * 1024 * 1024; // Convert to bytes
}

/**
 * Generate a unique download ID (UUID)
 */
export function generateDownloadId(): string {
  return randomUUID();
}

/**
 * Get file path for a download ID
 */
export function getFilePathByDownloadId(downloadId: string): string {
  return getTempFilePath(`download-${downloadId}.pdf`);
}

/**
 * Store file with download ID for later retrieval
 */
export async function storeFileForDownload(
  sourcePath: string,
  downloadId: string
): Promise<string> {
  await ensureTempDir();
  const downloadPath = getFilePathByDownloadId(downloadId);
  await fs.copyFile(sourcePath, downloadPath);
  return downloadPath;
}

/**
 * Get temp file timeout from environment (in seconds)
 */
export function getTempFileTimeout(): number {
  return parseInt(process.env.TEMP_FILE_TIMEOUT || '300', 10);
}

/**
 * Clean up old temp files based on timeout
 */
export async function cleanupOldTempFiles(): Promise<void> {
  try {
    const tempDir = getTempDir();
    if (!existsSync(tempDir)) {
      return;
    }

    const files = await fs.readdir(tempDir);
    const timeout = getTempFileTimeout() * 1000; // Convert to milliseconds
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        // Delete files older than timeout
        if (fileAge > timeout) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old temp file: ${file}`);
        }
      } catch (error) {
        // Ignore errors for individual files
        console.error(`Error checking/deleting file ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Error during temp file cleanup:', error);
  }
}

