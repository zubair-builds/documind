import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface ITransaction {
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
}

export interface IStatement extends Document {
  userId: Types.ObjectId;
  pdfId: Types.ObjectId;
  summary: {
    name: string;
    statementDate: string;
    dueDate: string;
    newBalance: number;
    minimumPayment: number;
    creditLimit: number;
  };
  transactions: ITransaction[];
  analysisMetadata: {
    analyzedAt: Date;
    processingTime: number;
    success: boolean;
    errorMessage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StatementSchema: Schema<IStatement> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pdfId: {
      type: Schema.Types.ObjectId,
      ref: 'Pdf',
      required: true,
    },
    summary: {
      name: {
        type: String,
        required: true,
      },
      statementDate: {
        type: String,
        required: true,
      },
      dueDate: {
        type: String,
        required: true,
      },
      newBalance: {
        type: Number,
        required: true,
      },
      minimumPayment: {
        type: Number,
        required: true,
      },
      creditLimit: {
        type: Number,
        required: true,
      },
    },
    transactions: [
      {
        date: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        type: {
          type: String,
          enum: ['DEBIT', 'CREDIT'],
          required: true,
        },
        category: {
          type: String,
          required: true,
        },
      },
    ],
    analysisMetadata: {
      analyzedAt: {
        type: Date,
        required: true,
      },
      processingTime: {
        type: Number,
        required: true,
      },
      success: {
        type: Boolean,
        required: true,
        default: true,
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

// Create indexes for efficient queries
StatementSchema.index({ userId: 1, createdAt: -1 });
StatementSchema.index({ pdfId: 1 }, { unique: true });

const Statement: Model<IStatement> =
  mongoose.models.Statement ||
  mongoose.model<IStatement>('Statement', StatementSchema);

export default Statement;

