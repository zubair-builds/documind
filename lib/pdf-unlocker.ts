import { decrypt } from 'node-qpdf2';
import { existsSync } from 'fs';
import path from 'path';

export interface UnlockResult {
  success: boolean;
  outputPath?: string;
  method?: 'qpdf';
  error?: string;
}

/**
 * Unlock PDF using node-qpdf2
 */
async function unlockWithQpdf(
  inputPath: string,
  password: string,
  outputPath: string
): Promise<UnlockResult> {
  try {
    await decrypt({
      input: inputPath,
      output: outputPath,
      password: password,
    });

    // Verify output file was created
    if (existsSync(outputPath)) {
      return {
        success: true,
        outputPath,
        method: 'qpdf',
      };
    } else {
      return {
        success: false,
        error: 'QPDF failed to create output file',
      };
    }
  } catch (error: any) {
    console.error('QPDF unlock error:', error);
    return {
      success: false,
      error: error?.message || 'QPDF unlock failed',
    };
  }
}

/**
 * Unlock a password-protected PDF using node-qpdf2
 */
export async function unlockPdf(
  inputPath: string,
  password: string,
  outputPath?: string
): Promise<UnlockResult> {
  // Validate input file exists
  if (!existsSync(inputPath)) {
    return {
      success: false,
      error: 'Input file does not exist',
    };
  }

  // Generate output path if not provided
  if (!outputPath) {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const nameWithoutExt = path.basename(inputPath, ext);
    outputPath = path.join(dir, `${nameWithoutExt}-unlocked${ext}`);
  }

  // Validate password
  if (!password || password.trim() === '') {
    return {
      success: false,
      error: 'Password is required',
    };
  }

  // Unlock using node-qpdf2
  console.log('Attempting to unlock PDF with node-qpdf2...');
  const result = await unlockWithQpdf(inputPath, password, outputPath);

  // If failed
  if (!result.success) {
    return {
      success: false,
      error: 'Failed to unlock PDF. Please check if the password is correct.',
    };
  }

  return result;
}

