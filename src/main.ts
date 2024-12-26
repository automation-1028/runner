import fs from 'fs';
import path from 'path';
import {
  generateVideo,
  DEFAULT_VIDEO_INFO,
  VideoRequestPayload,
  getTask,
} from './services/video-generator';
import { generateScript } from './services/script-generator';

async function main() {
  const keywords = [
    'time management',
    'how i plan my week for maximum productivity',
    'productivity tips cat code',
    'happy planner plan with me',
    'happy planner winter release',
    'happy planner flip through',
  ];

  for (const keyword of keywords) {
    const videoScript = await generateScript(keyword);

    const videoTaskRes = await generateVideo({
      ...{
        video_subject: videoScript.title,
        video_description: videoScript.description,
        video_terms: videoScript.tags,
        thumbnail: videoScript.thumbnail,
        video_script: videoScript.script,
      },
      ...DEFAULT_VIDEO_INFO,
    } as VideoRequestPayload);

    let taskRes;
    let isFinished = false;
    do {
      taskRes = await getTask(videoTaskRes.task_id);
      const { progress } = taskRes;

      console.log({ progress });
      isFinished = progress === 100;
      if (!isFinished) {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
      }
    } while (!isFinished);

    const videos = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../videos.json'), 'utf-8'),
    );

    const newVideos = [
      ...videos,
      {
        ...{
          title: videoScript.title,
          description: videoScript.description,
          thumbnail: videoScript.thumbnail,
          tags: videoScript.tags,
        },
        ...videoTaskRes,
      },
    ];

    fs.writeFileSync('videos.json', JSON.stringify(newVideos, null, 2));
  }

  console.log('All videos have been generated!');
}

main();
