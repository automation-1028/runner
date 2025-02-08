import mongoose, { Document, Schema } from 'mongoose';
import { ChannelDocument } from './channel';
import { KeywordDocument } from './keyword';

export interface IUpload {
  channelId: mongoose.Types.ObjectId | ChannelDocument;
  keywordId: mongoose.Types.ObjectId | KeywordDocument;
  visibility: 'public' | 'private' | 'unlisted';
  videoType: 'short' | 'long';
  youtubeLink?: string;
  publishAt: Date;
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
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      required: true,
    },
    youtubeLink: { type: String },
    videoType: {
      type: String,
      enum: ['short', 'long'],
      required: true,
    },
    publishAt: { type: Date },
  },
  { timestamps: true },
);

export const Upload = mongoose.model<UploadDocument>('upload', UploadSchema);
