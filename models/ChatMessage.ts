import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  pdfId?: Types.ObjectId;
  userId: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  responseTime?: number;
  tokens?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  suggestedQuestions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema<IChatMessage> = new Schema(
  {
    pdfId: {
      type: Schema.Types.ObjectId,
      ref: 'Pdf',
      required: false,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    responseTime: {
      type: Number,
    },
    tokens: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },
    suggestedQuestions: {
      type: [String],
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast retrieval of chat history for a specific PDF/user
ChatMessageSchema.index({ pdfId: 1, userId: 1, createdAt: 1 });

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
