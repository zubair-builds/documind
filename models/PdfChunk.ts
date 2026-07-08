import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IPdfChunk extends Document {
  pdfId: Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const PdfChunkSchema: Schema<IPdfChunk> = new Schema(
  {
    pdfId: {
      type: Schema.Types.ObjectId,
      ref: 'Pdf',
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const PdfChunk: Model<IPdfChunk> =
  mongoose.models.PdfChunk || mongoose.model<IPdfChunk>('PdfChunk', PdfChunkSchema);

export default PdfChunk;
