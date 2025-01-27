import mongoose, { Document, Schema } from 'mongoose';
import { ChannelDocument } from './channel';
import { KeywordDocument } from './keyword';

export interface IUpload {
  channelId: mongoose.Types.ObjectId | ChannelDocument;
  keywordId: mongoose.Types.ObjectId | KeywordDocument;
  videoType: 'short' | 'long';
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadDocument extends IUpload, Document {}

const UploadSchema = new Schema<UploadDocument>(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'channel',
      required: true,
    },
    keywordId: {
      type: Schema.Types.ObjectId,
      ref: 'keyword',
      required: true,
    },
    videoType: {
      type: String,
      enum: ['short', 'long'],
      required: true,
    },
  },
  { timestamps: true },
);

export const Upload = mongoose.model<UploadDocument>('upload', UploadSchema);
