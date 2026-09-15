import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Pdf from '@/models/Pdf';
import Statement from '@/models/Statement';
import { getProvider } from '@/lib/llm';
import { writeTrace } from '@/lib/tracing';
export const dynamic = 'force-dynamic';

/**
 * POST /api/statements/analyze
 * Analyze PDF text with Gemini AI and save structured statement data
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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

    // Parse request body
    const { pdfId } = await request.json();

    if (!pdfId) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find PDF document
    const pdf = await Pdf.findById(pdfId);

    if (!pdf) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (pdf.userId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You do not own this PDF.' },
        { status: 403 }
      );
    }

    // Check if statement already exists
    const existingStatement = await Statement.findOne({ pdfId });
    if (existingStatement) {
      return NextResponse.json({
        success: true,
        message: 'Statement already analyzed',
        statement: {
          id: String(existingStatement._id),
          summary: existingStatement.summary,
          transactions: existingStatement.transactions,
          analysisMetadata: existingStatement.analysisMetadata,
        },
      });
    }

    // Check if PDF has extracted text
    if (!pdf.extractedText || pdf.extractedText.trim() === '') {
      return NextResponse.json(
        { error: 'No text available to analyze. Please ensure the PDF was processed correctly.' },
        { status: 400 }
      );
    }

    // Parse statement with Gemini AI
    let statementData;
    let analysisSuccess = true;
    let errorMessage;

    try {
      const provider = getProvider();
      const result = await provider.analyzeStatement(pdf.extractedText);
      statementData = result.data;
    } catch (error: any) {
      analysisSuccess = false;
      errorMessage = error?.message || 'Failed to analyze statement';
      console.error('Provider analysis error:', error);

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;
    
    // Write trace asynchronously
    if (analysisSuccess) {
        writeTrace({
            endpoint: '/api/statements/analyze',
            prompt: 'Statement Analysis Extraction (System Prompt + File Content)',
            latencyMs: result.latencyMs,
            tokens: result.tokens,
            pdfId: pdfId,
            userId: user.id
        });
    }

    // Save statement to database
    const statement = await Statement.create({
      userId,
      pdfId,
      summary: statementData.summary,
      transactions: statementData.transactions,
      analysisMetadata: {
        analyzedAt: new Date(),
        processingTime,
        success: analysisSuccess,
        errorMessage,
      },
    });

    // Update PDF documentType
    await Pdf.findByIdAndUpdate(pdfId, {
      documentType: 'statement',
    });

    return NextResponse.json({
      success: true,
      message: 'Statement analyzed successfully',
      statement: {
        id: String(statement._id),
        summary: statement.summary,
        transactions: statement.transactions,
        analysisMetadata: statement.analysisMetadata,
      },
      processingTime,
    });
  } catch (error: any) {
    console.error('Error analyzing statement:', error);
    return NextResponse.json(
      {
        error: error?.message || 'An error occurred during analysis',
      },
      { status: 500 }
    );
  }
}

