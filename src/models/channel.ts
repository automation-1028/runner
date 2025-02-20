import mongoose, { Document, Schema } from 'mongoose';

export interface IChannel {
  name: string;
  topics: string[];
  maxDailyShortVideosLimit: number;
  maxDailyLongVideosLimit: number;
  chromeProfileId: string;
  isActive: boolean;
  isUploadingVideo: boolean;
  isRunningSearchKeyword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelDocument extends IChannel, Document {}

const ChannelSchema = new Schema<ChannelDocument>(
  {
    name: { type: String, required: true },
    topics: [{ type: String, required: true }],
    maxDailyShortVideosLimit: { type: Number, required: true },
    maxDailyLongVideosLimit: { type: Number, required: true },
    chromeProfileId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isUploadingVideo: { type: Boolean, default: true },
    isRunningSearchKeyword: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Channel = mongoose.model<ChannelDocument>(
  'channel',
  ChannelSchema,
);
