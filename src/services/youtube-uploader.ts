import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:3000',
});

export interface UploadVideoRequest {
  title: string;
  thumbnail: string;
  tags: string;
  description: string;
  filePath: string;
  chromeProfileId: string;
}

export const uploadVideo = async (payload: UploadVideoRequest) => {
  const response = await instance.post('/upload-video-v2', payload);
  return response.data;
};
