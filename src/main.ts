import 'dotenv/config';
import './configs/mongoose';

import { generateScripts } from './generate-script';
import { searchKeyword, setPriorityKeywords } from './search-topic';
import { scheduleToUpload, uploadVideoCronJob } from './upload-video';
import { processVideos } from './generate-video';

// setPriorityKeywords();
// searchKeyword();

generateScripts();
processVideos();

scheduleToUpload();
uploadVideoCronJob();
