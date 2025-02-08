import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 60_000 * 60,
});

export interface UploadVideoRequest {
  title: string;
  thumbnail: string;
  tags: string;
  description: string;
  filePath: string;
  chromeProfileId: string;
  videoType: 'short' | 'long';
}

interface UploadVideoResponse {
  youtubeLink: string;
}

export const uploadVideo = async (
  payload: UploadVideoRequest,
): Promise<UploadVideoResponse> => {
  const response = await instance.post('/upload-video-v2', payload);
  return response.data;
};
