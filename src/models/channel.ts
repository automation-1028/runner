import mongoose, { Document, Schema } from 'mongoose';

export interface IChannel {
  name: string;
  topics: string[];
  maxDailyShortVideosLimit: number;
  maxDailyLongVideosLimit: number;
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
  },
  { timestamps: true },
);

export const Channel = mongoose.model<ChannelDocument>(
  'channel',
  ChannelSchema,
);
