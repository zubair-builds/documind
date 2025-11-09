import { NextRequest, NextResponse } from 'next/server';
import { getFilePathByDownloadId, deleteTempFile } from '@/lib/file-utils';
import { existsSync } from 'fs';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

/**
 * GET /api/download-pdf/[id]
 * Download unlocked PDF by download ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const downloadId = params.id;

    // Validate download ID format (basic UUID validation)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(downloadId)) {
      return NextResponse.json(
        { error: 'Invalid download ID' },
        { status: 400 }
      );
    }

    // Get file path for download ID
    const filePath = getFilePathByDownloadId(downloadId);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found or has expired' },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath);

    // Create response with PDF file
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="unlocked.pdf"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

    // Delete file after sending (asynchronously to not delay response)
    deleteTempFile(filePath).catch((err) =>
      console.error('Error deleting file after download:', err)
    );

    return response;
  } catch (error: any) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to download PDF',
      },
      { status: 500 }
    );
  }
}

