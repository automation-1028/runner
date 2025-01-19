import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://127.0.0.1:8080/api/v1',
});

export interface VideoRequestPayload {
  video_subject: string;
  video_script?: string;
  video_terms: string;
  video_aspect: string;
  video_concat_mode: string;
  video_clip_duration: number;
  video_count: number;
  video_source: string;
  video_materials: string | null;
  video_language: string;
  voice_name: string;
  voice_volume: number;
  voice_rate: number;
  bgm_type: string;
  bgm_file: string;
  bgm_volume: number;
  subtitle_enabled: boolean;
  subtitle_position: string;
  custom_position: number;
  font_name: string;
  text_fore_color: string;
  text_background_color: boolean;
  font_size: number;
  stroke_color: string;
  stroke_width: number;
  n_threads: number;
  paragraph_number: number;
}

export const DEFAULT_VIDEO_INFO = {
  video_aspect: '16:9',
  video_concat_mode: 'random',
  video_clip_duration: 10,
  video_count: 1,
  video_source: 'pexels',
  video_materials: null,
  video_language: 'en-US',
  voice_name: 'en-US-AndrewMultilingualNeural-Male',
  voice_volume: 1.0,
  voice_rate: 1.0,
  bgm_type: '',
  bgm_file: '',
  bgm_volume: 0.0,
  subtitle_enabled: true,
  subtitle_position: 'bottom',
  custom_position: 70.0,
  font_name: 'Montserrat.ttf',
  text_fore_color: '#FFFFFF',
  text_background_color: true,
  font_size: 60,
  stroke_color: '#000000',
  stroke_width: 1.5,
  n_threads: 8,
  paragraph_number: 1,
};

export const generateVideo = async (videoInfo: VideoRequestPayload) => {
  try {
    const response = await instance.post('/videos', videoInfo);
    return response.data.data;
  } catch (error) {
    console.error(error);
  }
};

export const getTask = async (taskId: string) => {
  try {
    const response = await instance.get(`/tasks/${taskId}`);
    return response.data.data;
  } catch (error) {
    console.error(error);
  }
};
