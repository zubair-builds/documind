import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Pdf from '@/models/Pdf';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const { getAuthenticatedUser } = await import('@/lib/api-auth');
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        const userId = user.id;

        // Connect to database
        await connectDB();

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Invalid file type. Only PDFs are allowed.' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalFilename = file.name;
        const fileSize = file.size;

        // Generate content hash (used both for filename and duplicate detection)
        const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const filename = `${contentHash}.pdf`;

        // Check for existing PDF with same content for this user
        const existingPdf = await Pdf.findOne({ userId, contentHash })
          .select('_id filename originalFilename createdAt')
          .lean();

        if (existingPdf) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This PDF has already been uploaded.',
                    isDuplicate: true,
                    pdf: {
                        id: existingPdf._id,
                        filename: existingPdf.filename,
                        originalFilename: existingPdf.originalFilename,
                        createdAt: existingPdf.createdAt,
                    },
                },
                { status: 409 }
            );
        }

        // Ensure uploads directory exists
        // In production (Railway), we might need ephemeral storage or cloud storage (S3).
        // For this MVP, local filesystem in 'uploads' or 'temp' dir is fine, 
        // but note that filesystem is not persistent on some serverless platforms.
        // We'll use a 'data/uploads' directory or similar relative to project root.

        const uploadDir = path.join(process.cwd(), 'data', 'uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (err) {
            // Ignore if exists
        }

        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // Create PDF record in database
        const pdf = await Pdf.create({
            userId,
            filename, // stored filename
            originalFilename,
            fileSize,
            contentHash,
            // We start with locked status until we check/unlock it
            unlockStatus: 'locked',
        });

        // Limit initial processing: just save it. 
        // A separate background job or immediate trigger could process it.
        // For now, let's just return success.

        return NextResponse.json({
            success: true,
            message: 'File uploaded successfully',
            pdf: {
                id: pdf._id,
                filename: pdf.filename,
                originalFilename: pdf.originalFilename,
            }
        });

    } catch (error: any) {
        console.error('Error uploading PDF:', error);

        // Handle potential race conditions on unique index (duplicate contentHash per user)
        if (error?.code === 11000 && error?.keyPattern?.contentHash) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This PDF has already been uploaded.',
                    isDuplicate: true,
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                error: error?.message || 'Failed to upload file',
            },
            { status: 500 }
        );
    }
}
