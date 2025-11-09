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
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt or dueDate
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
      .select('pdfId summary.dueDate summary.statementDate summary.newBalance')
      .lean();

    // Create a map of pdfId to statement
    const statementMap = new Map();
    statements.forEach((stmt) => {
      statementMap.set(stmt.pdfId.toString(), stmt);
    });

    // Merge PDFs with statement data
    const pdfsWithStatements = pdfs.map((pdf) => {
      const statement = statementMap.get(pdf._id.toString());
      console.log('statement', statement);
      
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
        dueDate: statement?.summary?.dueDate || null,
        newBalance : statement?.summary?.newBalance || null,
        statementDate: statement?.summary?.statementDate || null,
      };
    });

    // Sort the results
    if (sortBy === 'dueDate') {
      pdfsWithStatements.sort((a, b) => {
        // Put PDFs without due dates at the end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;

        // Parse dates - assuming format like "15 JUL 2024" or similar
        const parseDate = (dateStr: string) => {
          try {
            // Try parsing different date formats
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) return date;
            
            // If direct parsing fails, try manual parsing for formats like "15 JUL"
            const parts = dateStr.trim().split(' ');
            if (parts.length >= 2) {
              const months: { [key: string]: number } = {
                JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
                JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
              };
              const day = parseInt(parts[0]);
              const month = months[parts[1].toUpperCase()];
              const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
              
              if (!isNaN(day) && month !== undefined) {
                return new Date(year, month, day);
              }
            }
            return new Date(0); // Return epoch if parsing fails
          } catch {
            return new Date(0);
          }
        };

        const dateA = parseDate(a.dueDate);
        const dateB = parseDate(b.dueDate);

        return sortOrder === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      });
    } else {
      // Sort by createdAt
      pdfsWithStatements.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

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

