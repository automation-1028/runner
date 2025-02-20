import mongoose, { Document, Schema } from 'mongoose';

export interface ITopicSearch {
  topic: string;
  relatedTopic: string;
  isHandled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicSeachDocument extends ITopicSearch, Document {}

const TopicSearchSchema = new Schema<TopicSeachDocument>(
  {
    topic: { type: String, required: true },
    relatedTopic: { type: String, required: true },
    isHandled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const TopicSearch = mongoose.model<TopicSeachDocument>(
  'topic_search',
  TopicSearchSchema,
);
