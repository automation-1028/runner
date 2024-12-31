import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';

import {
  generateVideo,
  DEFAULT_VIDEO_INFO,
  VideoRequestPayload,
  getTask,
} from './services/video-generator';
import { generateScript } from './services/script-generator';
import { uploadVideo } from './services/youtube-uploader';
import Bluebird from 'bluebird';
import { retry } from './utils/retry.util';

interface VideoScript {
  title: string;
  description: string;
  thumbnail: string;
  tags: string;
  script: string;
  task_id: string;
}

// main();
async function main() {
  const keywords = `
what we do in life echoes in eternity
how to glitch deva in shindo life
what does e y e s spell gacha life meme
how to make the greatest comeback of your life
how to gamify your life
how to download gacha life in laptop
how to change your life in 90 days
how to be lucky in shindo life
how to save battery life laptop
why self improvement is ruining your life
how to document your life
how to get tailed beast in shindo life
how to complete mission black mesa inbound half life 2
how to level up in life
how to change your life in 2025
how did you die in your past life meme fnaf
how to get all achievment in life is a game
why reaction thug life
how to stop wasting your life
how to extend battery life on a laptop
how to organize your life
how to remember everything for the rest of your life
when the girls are drunk gacha life
how to get good players in war shindo life
how to download life is strange 2 on pc
why study abroad changed my life
how to change your life`
    .trim()
    .split('\n');

  const genVideoFromKeyword = async (keyword: string) => {
    try {
      console.log(`Generating video with ${keyword} keyword...`);
      await retry(async () => {
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let taskRes: any | null;
        let isFinished = false;
        do {
          taskRes = await retry(() => getTask(videoTaskRes.task_id), 10);
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
              script: videoScript.script,
            },
            ...videoTaskRes,
          },
        ];

        fs.writeFileSync('videos.json', JSON.stringify(newVideos, null, 2));
      });
    } catch (error) {
      console.error(
        `Failed to create video with ${keyword} keyword due to error: ${
          (error as Error).message
        }`,
      );
    }
  };

  for (const keyword of keywords) {
    await genVideoFromKeyword(keyword);
  }
  // await Bluebird.Promise.map(keywords, async (keyword) => {}, {
  //   concurrency: 1,
  // });

  console.log('All videos have been generated!');
}

convertLongtoShort();
async function convertLongtoShort() {
  const videoScripts = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../videos.json'), 'utf-8'),
  );

  await Bluebird.Promise.map(
    videoScripts,
    async (videoScript: VideoScript) => {
      await retry(async () => {
        const videoTaskRes = await generateVideo({
          ...DEFAULT_VIDEO_INFO,
          ...{
            video_subject: videoScript.title,
            video_description: videoScript.description,
            video_terms: videoScript.tags,
            thumbnail: videoScript.thumbnail,
            video_script: '',
            video_aspect: '9:16',
            video_clip_duration: 5,
            font_size: 50,
            subtitle_position: 'center',
          },
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
          fs.readFileSync(
            path.join(__dirname, '../short-videos.json'),
            'utf-8',
          ),
        );

        const newVideos = [
          ...videos,
          {
            ...{
              title: videoScript.title,
              description: videoScript.description,
              thumbnail: videoScript.thumbnail,
              tags: videoScript.tags,
              script: videoScript.script,
            },
            ...videoTaskRes,
          },
        ];

        fs.writeFileSync(
          'short-videos.json',
          JSON.stringify(newVideos, null, 2),
        );
      });
    },
    {
      concurrency: 1,
    },
  );

  console.log('All short videos have been generated!');
}

// autoUpload();
async function autoUpload() {
  const videoPath = path.join(__dirname, '../short-videos.json');
  // const videoPath = path.join(__dirname, '../videos.json');

  const videoScripts: VideoScript[] = JSON.parse(
    fs.readFileSync(videoPath, 'utf-8'),
  );

  for (const videoScript of videoScripts) {
    const { title, description, thumbnail, tags, task_id } = videoScript;

    await uploadVideo({
      title,
      description,
      thumbnail,
      tags,
      filePath: `/Users/thanhtuan/ind/video-generator/storage/tasks/${task_id}/final-1.mp4`,
      publishAt: moment()
        .tz('America/New_York')
        .add(1, 'days')
        .hour(10 + Math.floor(Math.random() * 14))
        .minute(Math.floor(Math.random() * 60))
        .toDate(),
    }).then(console.log);

    const oldVideoScripts = JSON.parse(fs.readFileSync(videoPath, 'utf-8'));

    const newVideoScripts = oldVideoScripts.filter(
      (video: VideoScript) => video.task_id !== task_id,
    );
    fs.writeFileSync(videoPath, JSON.stringify(newVideoScripts, null, 2));
  }

  console.log('All videos have been uploaded!');
}
