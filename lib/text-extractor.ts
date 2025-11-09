import pdf from 'pdf-parse';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export interface TextExtractionResult {
  success: boolean;
  text?: string;
  totalPages?: number;
  extractedPages?: number;
  error?: string;
}

/**
 * Get the number of preview pages from environment
 */
function getPreviewPages(): number {
  return parseInt(process.env.PDF_PREVIEW_PAGES || '3', 10);
}

/**
 * Extract text from the first N pages of a PDF
 */
export async function extractTextFromPdf(
  pdfPath: string,
  maxPages?: number
): Promise<TextExtractionResult> {
  try {
    // Validate file exists
    if (!existsSync(pdfPath)) {
      return {
        success: false,
        error: 'PDF file not found',
      };
    }

    // Read the PDF file
    const dataBuffer = await fs.readFile(pdfPath);

    // Determine how many pages to extract
    const pagesToExtract = maxPages || getPreviewPages();

    // Parse the PDF and extract text
    const data = await pdf(dataBuffer, {
      max: pagesToExtract, // Limit to first N pages
    });

    // Check if we got any text
    if (!data.text || data.text.trim() === '') {
      return {
        success: true,
        text: '[No extractable text found in the PDF. The PDF may contain only images or scanned content.]',
        totalPages: data.numpages,
        extractedPages: Math.min(pagesToExtract, data.numpages),
      };
    }

    return {
      success: true,
      text: data.text.trim(),
      totalPages: data.numpages,
      extractedPages: Math.min(pagesToExtract, data.numpages),
    };
  } catch (error: any) {
    console.error('Text extraction error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to extract text from PDF',
    };
  }
}

/**
 * Extract text from entire PDF (all pages)
 */
export async function extractFullTextFromPdf(
  pdfPath: string
): Promise<TextExtractionResult> {
  try {
    // Validate file exists
    if (!existsSync(pdfPath)) {
      return {
        success: false,
        error: 'PDF file not found',
      };
    }

    // Read the PDF file
    const dataBuffer = await fs.readFile(pdfPath);

    // Parse the entire PDF
    const data = await pdf(dataBuffer);

    // Check if we got any text
    if (!data.text || data.text.trim() === '') {
      return {
        success: true,
        text: '[No extractable text found in the PDF. The PDF may contain only images or scanned content.]',
        totalPages: data.numpages,
        extractedPages: data.numpages,
      };
    }

    return {
      success: true,
      text: data.text.trim(),
      totalPages: data.numpages,
      extractedPages: data.numpages,
    };
  } catch (error: any) {
    console.error('Full text extraction error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to extract text from PDF',
    };
  }
}

