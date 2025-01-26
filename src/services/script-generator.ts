import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8081/api/v1',
});

export interface ScriptResponse {
  title: string;
  thumbnail: string;
  tags: string;
  description: string;
  script: string;
}

export interface QuestionResponse {
  keyword: string;
  competition: number;
  volume: number;
  overall: number;
  estimated_monthly_search: number;
}

export const generateScript = async (
  keyword: string,
): Promise<ScriptResponse> => {
  const response = await instance.post('/generate-video', {
    keyword,
  });
  return response.data as ScriptResponse;
};

export const getRelatedKeywords = async (
  keyword: string,
): Promise<string[]> => {
  const response = await instance.get(
    `/generate-video/related-keywords/?keyword=${keyword}`,
  );
  return response.data as string[];
};

export const getQuestions = async (
  keyword: string,
): Promise<QuestionResponse[]> => {
  const response = await instance.get(
    `/generate-video/question/?keyword=${keyword}`,
  );
  return response.data as QuestionResponse[];
};
