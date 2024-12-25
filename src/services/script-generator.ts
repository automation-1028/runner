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

export const generateScript = async (
  keyword: string,
): Promise<ScriptResponse> => {
  const response = await instance.post('/generate-video', {
    keyword,
  });
  return response.data as ScriptResponse;
};
