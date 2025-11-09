import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IPdf extends Document {
  userId: Types.ObjectId;
  filename: string;
  originalFilename: string;
  fileSize: number;
  pageCount: number;
  extractedText: string;
  extractedPages: number;
  unlockStatus: 'success' | 'failed';
  documentType: 'statement' | 'other' | 'unknown';
  encryptedPassword?: string;
  processingMetadata: {
    method: string;
    processingTime: number;
    errorMessage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PdfSchema: Schema<IPdf> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    pageCount: {
      type: Number,
      required: true,
      default: 0,
    },
    extractedText: {
      type: String,
      default: '',
    },
    extractedPages: {
      type: Number,
      default: 0,
    },
    unlockStatus: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
      default: 'success',
    },
    documentType: {
      type: String,
      enum: ['statement', 'other', 'unknown'],
      default: 'unknown',
      index: true,
    },
    encryptedPassword: {
      type: String,
      required: false,
    },
    processingMetadata: {
      method: {
        type: String,
        default: 'qpdf',
      },
      processingTime: {
        type: Number,
        default: 0,
      },
      errorMessage: {
        type: String,
        required: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
PdfSchema.index({ userId: 1, createdAt: -1 });
PdfSchema.index({ userId: 1, filename: 1 });

const Pdf: Model<IPdf> =
  mongoose.models.Pdf || mongoose.model<IPdf>('Pdf', PdfSchema);

export default Pdf;

