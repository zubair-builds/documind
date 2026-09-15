import mongoose, { Schema, Document } from 'mongoose';

export interface ITrace extends Document {
  endpoint: string;
  provider: string;
  prompt: string;
  chunks: any[];
  latencyMs: number;
  tokens: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  pdfId?: mongoose.Types.ObjectId;
  userId: string;
  createdAt: Date;
}

const TraceSchema: Schema = new Schema({
  endpoint: { type: String, required: true },
  provider: { type: String, required: true },
  prompt: { type: String, required: true },
  chunks: { type: Array, default: [] },
  latencyMs: { type: Number, required: true },
  tokens: {
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    totalTokens: { type: Number },
  },
  pdfId: { type: Schema.Types.ObjectId, ref: 'Pdf' },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Trace || mongoose.model<ITrace>('Trace', TraceSchema);
