import { NextRequest, NextResponse } from 'next/server';
import {
  writeTempFile,
  deleteTempFile,
  getMaxFileSize,
  getTempFilePath,
  generateUniqueFilename,
  generateDownloadId,
  storeFileForDownload,
  cleanupOldTempFiles,
} from '@/lib/file-utils';
import { unlockPdf } from '@/lib/pdf-unlocker';
import { extractTextFromPdf } from '@/lib/text-extractor';
import { existsSync } from 'fs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Pdf from '@/models/Pdf';

// Disable body parser to handle file upload manually
export const dynamic = 'force-dynamic';

/**
 * Validate file type
 */
function isValidPdfFile(file: File): boolean {
  // Check file extension
  const validExtensions = ['.pdf'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some((ext) =>
    fileName.endsWith(ext)
  );

  // Check MIME type
  const validMimeTypes = ['application/pdf'];
  const hasValidMimeType = validMimeTypes.includes(file.type);

  return hasValidExtension && hasValidMimeType;
}

/**
 * POST /api/unlock-pdf
 * Accepts a password-protected PDF and password, unlocks it, extracts text, and returns JSON with preview
 */
export async function POST(request: NextRequest) {
  let inputPath = '';
  let outputPath = '';
  const startTime = Date.now();

  try {
    // Get authenticated user session
    // Get authenticated user session
    let session = await getServerSession(authOptions);
    let user;

    if (session?.user?.id) {
      user = session.user;
    } else {
      // Fallback: Check for Bearer token
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { verifyToken } = await import('@/lib/jwt');
        const decoded = verifyToken(token);
        if (decoded) {
          user = { id: decoded.userId, email: decoded.email, name: decoded.name };
        }
      }
    }

    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Connect to database
    await connectDB();

    // Trigger cleanup of old files
    cleanupOldTempFiles().catch((err) =>
      console.error('Error cleaning up old files:', err)
    );

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const password = formData.get('password') as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!password || password.trim() === '') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidPdfFile(file)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    const maxFileSize = getMaxFileSize();
    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum limit of ${Math.round(
            maxFileSize / (1024 * 1024)
          )}MB`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write uploaded file to temp directory
    inputPath = await writeTempFile(buffer, file.name);

    // Generate output file path
    const outputFilename = generateUniqueFilename(`unlocked-${file.name}`);
    outputPath = getTempFilePath(outputFilename);

    // Unlock the PDF
    const unlockResult = await unlockPdf(inputPath, password, outputPath);

    if (!unlockResult.success) {
      await deleteTempFile(inputPath);
      return NextResponse.json(
        {
          error: unlockResult.error || 'Failed to unlock PDF',
        },
        { status: 400 }
      );
    }

    // Verify output file exists
    if (!unlockResult.outputPath || !existsSync(unlockResult.outputPath)) {
      await deleteTempFile(inputPath);
      return NextResponse.json(
        { error: 'Unlocked PDF file was not created' },
        { status: 500 }
      );
    }

    // Extract text from unlocked PDF
    const textResult = await extractTextFromPdf(unlockResult.outputPath);

    if (!textResult.success) {
      await deleteTempFile(inputPath);
      await deleteTempFile(unlockResult.outputPath);
      return NextResponse.json(
        {
          error: textResult.error || 'Failed to extract text from PDF',
        },
        { status: 500 }
      );
    }

    // Generate download ID and store the file
    const downloadId = generateDownloadId();
    await storeFileForDownload(unlockResult.outputPath, downloadId);

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Save PDF data to MongoDB
    const pdfDocument = await Pdf.create({
      userId,
      filename: `unlocked-${file.name}`,
      originalFilename: file.name,
      fileSize: file.size,
      pageCount: textResult.totalPages || 0,
      extractedText: textResult.text || '',
      extractedPages: textResult.extractedPages || 0,
      unlockStatus: 'success',
      processingMetadata: {
        method: 'qpdf',
        processingTime,
      },
    });

    // Clean up temporary files (keep the download file)
    await deleteTempFile(inputPath);
    await deleteTempFile(unlockResult.outputPath);

    // Return JSON response with text and download URL
    return NextResponse.json({
      success: true,
      text: textResult.text || '',
      totalPages: textResult.totalPages || 0,
      extractedPages: textResult.extractedPages || 0,
      downloadId: downloadId,
      downloadUrl: `/api/download-pdf/${downloadId}`,
      filename: `unlocked-${file.name}`,
      pdfId: String(pdfDocument._id),
    });
  } catch (error: any) {
    console.error('Error processing PDF:', error);

    // Clean up temp files on error
    if (inputPath) await deleteTempFile(inputPath);
    if (outputPath) await deleteTempFile(outputPath);

    return NextResponse.json(
      {
        error: error?.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

