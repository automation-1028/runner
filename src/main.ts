import 'dotenv/config';
import './configs/mongoose';

import { generateScripts } from './generate-script';
import { searchKeyword } from './search-topic';
import { scheduleToUpload, uploadVideoCronJob } from './upload-video';
import { generateShortVideos, generateVideos } from './generate-video';

searchKeyword();

// generateScripts();
// generateVideos();
// generateShortVideos();

// scheduleToUpload();
// uploadVideoCronJob();
