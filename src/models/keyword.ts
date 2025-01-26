import mongoose, { Document, Schema } from 'mongoose';

interface IScriptBase {
  title: string;
  description: string;
  thumbnail: string;
  tags: string;
}

export interface IScript extends IScriptBase {
  keyword: string;
  isShortGenerated: boolean;
  isLongGenerated: boolean;
}

export interface IKeyword {
  keyword: string;
  competition: number;
  volume: number;
  overall: number;
  estimatedMonthlySearch: number;
  topic: string;
  isGeneratedScript: boolean;
  script?: IScript;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeywordDocument extends IKeyword, Document {}

const KeywordSchema = new Schema<KeywordDocument>(
  {
    keyword: { type: String, required: true },
    competition: { type: Number, required: true },
    volume: { type: Number, required: true },
    overall: { type: Number, required: true },
    estimatedMonthlySearch: { type: Number, required: true },
    topic: {
      type: String,
      required: true,
    },
    isGeneratedScript: { type: Boolean, default: false },
    script: {
      type: {
        title: { type: String, required: true },
        description: { type: String, required: true },
        thumbnail: { type: String, required: true },
        tags: { type: String, required: true },
        keyword: { type: String, required: true },
        isShortGenerated: { type: Boolean, default: false },
        isLongGenerated: { type: Boolean, default: false },
      },
    },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Keyword = mongoose.model<KeywordDocument>(
  'keyword',
  KeywordSchema,
);
