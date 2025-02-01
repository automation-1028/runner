import 'dotenv/config';
import './configs/mongoose';

import { generateScripts } from './generate-script';
import { searchKeyword, setPriorityKeywords } from './search-topic';
import { scheduleToUpload, uploadVideoCronJob } from './upload-video';
import { generateShortVideos, generateVideos } from './generate-video';

setPriorityKeywords();
searchKeyword();

generateScripts();
generateVideos();
generateShortVideos();

// scheduleToUpload();
// uploadVideoCronJob();
