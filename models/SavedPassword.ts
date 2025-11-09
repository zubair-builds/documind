import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface ISavedPassword extends Document {
  userId: Types.ObjectId;
  label: string;
  encryptedPassword: string;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavedPasswordSchema: Schema<ISavedPassword> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    encryptedPassword: {
      type: String,
      required: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
SavedPasswordSchema.index({ userId: 1, lastUsed: -1 });
SavedPasswordSchema.index({ userId: 1, label: 1 });

const SavedPassword: Model<ISavedPassword> =
  mongoose.models.SavedPassword ||
  mongoose.model<ISavedPassword>('SavedPassword', SavedPasswordSchema);

export default SavedPassword;

