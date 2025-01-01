import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import 'dotenv/config';

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
import { sleep } from './utils/sleep.util';

interface ScriptBase {
  title: string;
  description: string;
  thumbnail: string;
  tags: string;
  script: string;
}

interface VideoScript extends ScriptBase {
  task_id: string;
}

interface Script extends ScriptBase {
  keyword: string;
  isShortGenerated: boolean;
  isLongGenerated: boolean;
}

function getScripts(): Script[] {
  const scripts = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../scripts.json'), 'utf-8'),
  );

  return scripts;
}

// generateScripts();
generateVideos();
generateShortVideos();
async function generateScripts() {
  const getKeywords = () => {
    const keywords = fs
      .readFileSync(path.join(__dirname, '../keywords.txt'), 'utf-8')
      .trim()
      .split('\n');

    return keywords;
  };

  while (true) {
    const keywords = getKeywords();

    if (keywords.length === 0) {
      console.log('No keywords found in keywords.txt');
      return;
    }
    const genScriptFromKeyword = async (keyword: string) => {
      try {
        console.log(`Generating script with ${keyword} keyword...`);
        await retry(async () => {
          let scripts = getScripts();
          if (scripts.find((s) => s.keyword === keyword)) {
            return;
          }
          const videoScript = await generateScript(keyword);

          scripts = getScripts();
          const newVideos = [
            ...scripts,
            {
              title: videoScript.title,
              description: videoScript.description,
              thumbnail: videoScript.thumbnail,
              tags: videoScript.tags,
              script: videoScript.script,
              keyword,
              isShortGenerated: false,
              isLongGenerated: false,
            },
          ];
          fs.writeFileSync('scripts.json', JSON.stringify(newVideos, null, 2));

          // Remove keyword from keywords.txt
          const keywords = getKeywords();
          const newKeywords = keywords.filter((k) => k !== keyword);
          fs.writeFileSync('keywords.txt', newKeywords.join('\n'));
        });
      } catch (error) {
        console.error(
          `Failed to create script with ${keyword} keyword due to error: ${
            (error as Error).message
          }`,
        );
      }
    };

    await Bluebird.Promise.map(keywords, genScriptFromKeyword, {
      concurrency: 1,
    });

    console.log('All scripts have been generated!');
    await sleep(30 * 60 * 1000); // 30 mins
  }
}

async function generateVideos() {
  while (true) {
    const scripts = getScripts();

    const genVideo = async (script: Script) => {
      try {
        console.log(
          `[generateVideos] Generating video with ${script.keyword} keyword...`,
        );
        await retry(async () => {
          // check if video already exists
          if (script.isLongGenerated) {
            return;
          }

          const videoTaskRes = await generateVideo({
            ...{
              video_subject: script.title,
              video_description: script.description,
              video_terms: script.tags,
              thumbnail: script.thumbnail,
              video_script: script.script,
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

          // Update videos.json
          const videos = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../videos.json'), 'utf-8'),
          );
          const newVideos = [
            ...videos,
            {
              ...{
                title: script.title,
                description: script.description,
                thumbnail: script.thumbnail,
                tags: script.tags,
                script: script.script,
              },
              ...videoTaskRes,
            },
          ];
          fs.writeFileSync('videos.json', JSON.stringify(newVideos, null, 2));

          // Update scripts.json
          const oldScripts = getScripts();
          const newScripts = oldScripts.map((s) => {
            if (s.keyword === script.keyword) {
              return {
                ...s,
                isLongGenerated: true,
              };
            }
            return s;
          });
          fs.writeFileSync('scripts.json', JSON.stringify(newScripts, null, 2));
        });
      } catch (error) {
        console.error(
          `[generateVideos] Failed to create video with ${
            script.keyword
          } keyword due to error: ${(error as Error).message}`,
        );
      }
    };

    await Bluebird.Promise.map(scripts, genVideo, {
      concurrency: 2,
    });

    console.log('All videos have been generated!');
    await sleep(30 * 60 * 1000); // 30 mins
  }
}

async function generateShortVideos() {
  while (true) {
    const scripts = getScripts();

    await Bluebird.Promise.map(
      scripts,
      async (script: Script) => {
        await retry(async () => {
          // check if video already exists
          if (script.isShortGenerated) {
            return;
          }

          const videoTaskRes = await generateVideo({
            ...DEFAULT_VIDEO_INFO,
            ...{
              video_subject: script.title,
              video_description: script.description,
              video_terms: script.tags,
              thumbnail: script.thumbnail,
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

          // Update short-videos.json
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
                title: script.title,
                description: script.description,
                thumbnail: script.thumbnail,
                tags: script.tags,
                script: script.script,
              },
              ...videoTaskRes,
            },
          ];
          fs.writeFileSync(
            'short-videos.json',
            JSON.stringify(newVideos, null, 2),
          );

          // Update scripts.json
          const oldScripts = getScripts();
          const newScripts = oldScripts.map((s) => {
            if (s.keyword === script.keyword) {
              return {
                ...s,
                isShortGenerated: true,
              };
            }
            return s;
          });
          fs.writeFileSync('scripts.json', JSON.stringify(newScripts, null, 2));
        });
      },
      {
        concurrency: 2,
      },
    );

    console.log('All short videos have been generated!');
    await sleep(30 * 60 * 1000); // 30 mins
  }
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
      filePath: `${process.env.VIDEO_TASK_DIR}/${task_id}/final-1.mp4`,
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
