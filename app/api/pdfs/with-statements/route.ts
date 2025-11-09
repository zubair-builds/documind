import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Pdf from '@/models/Pdf';
import Statement from '@/models/Statement';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pdfs/with-statements
 * Get list of user's PDF documents with statement data joined
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Connect to database
    await connectDB();

    // Get pagination and sorting parameters from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'statementDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc or desc
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Pdf.countDocuments({ userId });

    // Fetch user's PDFs
    const pdfs = await Pdf.find({ userId })
      .select(
        '_id filename originalFilename pageCount extractedPages unlockStatus documentType fileSize createdAt'
      )
      .lean();

    // Get all statements for these PDFs
    const pdfIds = pdfs.map((pdf) => pdf._id);
    const statements = await Statement.find({
      pdfId: { $in: pdfIds },
    })
      .select('pdfId summary.statementDate summary.newBalance analysisMetadata.processingTime')
      .lean();

    // Create a map of pdfId to statement
    const statementMap = new Map();
    statements.forEach((stmt) => {
      statementMap.set(stmt.pdfId.toString(), stmt);
    });

    // Merge PDFs with statement data
    const pdfsWithStatements = pdfs.map((pdf) => {
      const statement = statementMap.get(pdf._id.toString());
      
      return {
        id: pdf._id.toString(),
        filename: pdf.filename,
        originalFilename: pdf.originalFilename,
        pageCount: pdf.pageCount,
        extractedPages: pdf.extractedPages,
        unlockStatus: pdf.unlockStatus,
        documentType: pdf.documentType,
        fileSize: pdf.fileSize,
        createdAt: pdf.createdAt,
        newBalance : statement?.summary?.newBalance || null,
        statementDate: statement?.summary?.statementDate || null,
        analysisTime: statement?.analysisMetadata?.processingTime || null,
      };
    });

    // Sort the results
    pdfsWithStatements.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a];
      const bVal = b[sortBy as keyof typeof b];

      // Handle null/undefined values by pushing them to the end
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (sortBy === 'createdAt' || sortBy === 'statementDate') {
        const dateA = new Date(aVal as string).getTime();
        const dateB = new Date(bVal as string).getTime();
        comparison = dateA - dateB;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination after sorting
    const paginatedPdfs = pdfsWithStatements.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      pdfs: paginatedPdfs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching PDFs with statements:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch PDFs',
      },
      { status: 500 }
    );
  }
}

