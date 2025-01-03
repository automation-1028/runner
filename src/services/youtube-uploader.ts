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
  publishAt?: Date;
}

export const uploadVideo = async (payload: UploadVideoRequest) => {
  const response = await instance.post('/upload-video', payload);
  return response.data;
};
