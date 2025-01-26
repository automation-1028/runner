import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import 'dotenv/config';
import _ from 'lodash';
import chalk from 'chalk';

import './configs/mongoose';
import {
  generateVideo,
  DEFAULT_VIDEO_INFO,
  VideoRequestPayload,
  getTask,
} from './services/video-generator';
import { uploadVideo } from './services/youtube-uploader';
import { retry } from './utils/retry.util';
import { sleep } from './utils/sleep.util';
import { generateScripts } from './generate-script';
import { searchKeyword } from './search-topic';

interface ScriptBase {
  title: string;
  description: string;
  thumbnail: string;
  tags: string;
}

interface VideoScript extends ScriptBase {
  task_id: string;
  isShort?: boolean;
  isLong?: boolean;
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

searchKeyword();
generateScripts();
generateVideos();
generateShortVideos();
autoUpload();

async function generateVideos() {
  const genVideo = async (script: Script) => {
    try {
      console.log(
        `${chalk.green(
          '[generateVideos]',
        )} Generating video with ${chalk.magenta(script.keyword)} keyword...`,
      );

      // check if video already exists
      if (script.isLongGenerated) {
        return;
      }

      const tagNum = script.tags.split(',').length;
      const videoTaskRes = await generateVideo({
        ...DEFAULT_VIDEO_INFO,
        ...{
          video_subject: script.title,
          video_description: script.description,
          video_terms: tagNum >= 5 ? script.tags : '',
          thumbnail: script.thumbnail,
          paragraph_number: 50,
          video_source: 'pexels',
        },
      } as VideoRequestPayload);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let taskRes: any | null;
      let isFinished = false;
      do {
        taskRes = await retry(() => getTask(videoTaskRes.task_id), 10);
        const { progress } = taskRes;

        console.log(
          `${chalk.green(
            '[generateVideos]',
          )} Generating video with ${chalk.magenta(
            script.keyword,
          )} keyword progress: ${chalk.yellow(progress)}`,
        );
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

      console.log(
        `${chalk.green(
          '[generateVideos]',
        )} Generated video with ${chalk.magenta(script.keyword)} keyword!`,
      );
    } catch (error) {
      console.error(
        `${chalk.green(
          '[generateVideos]',
        )} Failed to generate video with ${chalk.magenta(
          script.keyword,
        )} keyword due to error: ${(error as Error).message}`,
      );
    }
  };

  while (true) {
    const scripts = getScripts();
    const longScripts = scripts.filter((script) => !script.isLongGenerated);
    if (!longScripts || longScripts.length === 0) {
      console.log('No long scripts found');
      await sleep(60_000 * 30); // 1 mins
      return;
    }

    await Promise.all([genVideo(longScripts[0]), genVideo(longScripts[1])]);
    await sleep(60_000);
  }
}

async function generateShortVideos() {
  const genVideo = async (script: Script) => {
    try {
      // check if video already exists
      if (script.isShortGenerated) {
        return;
      }
      console.log(
        `${chalk.green(
          '[generateShortVideos]',
        )} Generating short video with ${chalk.magenta(
          script.keyword,
        )} keyword...`,
      );

      const tagNum = script.tags.split(',').length;
      const videoTaskRes = await generateVideo({
        ...DEFAULT_VIDEO_INFO,
        ...{
          video_subject: script.title,
          video_description: script.description,
          video_terms: tagNum >= 5 ? script.tags : '',
          thumbnail: script.thumbnail,
          video_script: '',
          video_aspect: '9:16',
          video_clip_duration: 5,
          subtitle_position: 'custom',
          custom_position: 70.0,
          text_fore_color: '#FFFFFF',
          font_size: 75,
          stroke_color: '#000000',
          stroke_width: 5,
          video_source: 'pexels',
        },
      } as VideoRequestPayload);

      let taskRes;
      let isFinished = false;
      do {
        taskRes = await getTask(videoTaskRes.task_id);
        const { progress } = taskRes;

        console.log(
          `${chalk.green(
            '[generateShortVideos]',
          )} Generating short video with ${chalk.magenta(
            script.keyword,
          )} keyword progress: ${chalk.yellow(progress)}`,
        );
        isFinished = progress === 100;
        if (!isFinished) {
          await new Promise((resolve) => setTimeout(resolve, 10_000));
        }
      } while (!isFinished);

      // Update short-videos.json
      const videos = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../short-videos.json'), 'utf-8'),
      );
      const newVideos = [
        ...videos,
        {
          ...{
            title: script.title,
            description: script.description,
            thumbnail: script.thumbnail,
            tags: script.tags,
          },
          ...videoTaskRes,
        },
      ];
      fs.writeFileSync('short-videos.json', JSON.stringify(newVideos, null, 2));

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

      console.log(
        `${chalk.green(
          '[generateShortVideos]',
        )} Generated short video with ${chalk.magenta(
          script.keyword,
        )} keyword!`,
      );
    } catch (error) {
      console.error(
        `${chalk.green(
          '[generateShortVideos]',
        )} Failed to generate short video with ${chalk.magenta(
          script.keyword,
        )} keyword due to error: ${(error as Error).message}`,
      );
    }
  };

  while (true) {
    const scripts = getScripts();
    const shortScripts = scripts.filter((script) => !script.isShortGenerated);
    if (!shortScripts || shortScripts.length === 0) {
      console.log('No short scripts found');
      await sleep(60_000 * 30); // 1 mins
      return;
    }

    await Promise.all([genVideo(shortScripts[0]), genVideo(shortScripts[1])]);
    await sleep(60_000);
  }
}

async function autoUpload() {
  const shortVideoPath = path.join(__dirname, '../short-videos.json');
  const longVideoPath = path.join(__dirname, '../videos.json');

  const getVideoScripts = () => {
    let shortVideoScripts: VideoScript[] = JSON.parse(
      fs.readFileSync(shortVideoPath, 'utf-8'),
    );
    shortVideoScripts = shortVideoScripts.map((s) => ({ ...s, isShort: true }));

    let longVideoScripts: VideoScript[] = JSON.parse(
      fs.readFileSync(longVideoPath, 'utf-8'),
    );
    longVideoScripts = longVideoScripts.map((s) => ({ ...s, isLong: true }));

    const videoScripts = [...shortVideoScripts, ...longVideoScripts];

    return videoScripts;
  };

  while (true) {
    const videoScripts = getVideoScripts();
    const videoScript = videoScripts.pop();

    if (!videoScript) {
      console.log('No video scripts found');
      sleep(60_000 * 5); // 5 mins
      return;
    }

    const { title, description, thumbnail, tags, task_id, isShort } =
      videoScript;

    console.log(
      `${chalk.green('[autoUpload]')} Uploading ${
        isShort ? 'short' : 'long'
      } video: ${chalk.magenta(title)}`,
    );
    try {
      const videoTags = tags.substring(0, 480).split(',');
      videoTags.pop();

      await uploadVideo({
        title,
        description,
        thumbnail: isShort ? '' : thumbnail,
        tags: videoTags.slice(0, 15).join(', '),
        filePath: `${process.env.VIDEO_TASK_DIR}/${task_id}/final-1.mp4`,
        publishAt: moment()
          .tz('America/New_York')
          .add(1, 'days')
          .hour(10 + Math.floor(Math.random() * 14))
          .minute(Math.floor(Math.random() * 60))
          .toDate(),
      });

      const oldVideoScripts = JSON.parse(
        fs.readFileSync(isShort ? shortVideoPath : longVideoPath, 'utf-8'),
      );

      const newVideoScripts = oldVideoScripts.filter(
        (video: VideoScript) => video.task_id !== task_id,
      );
      fs.writeFileSync(
        isShort ? shortVideoPath : longVideoPath,
        JSON.stringify(newVideoScripts, null, 2),
      );

      console.log(
        `${chalk.green('[autoUpload]')} Uploaded ${
          isShort ? 'short' : 'long'
        } video: ${chalk.magenta(title)}`,
      );
    } catch (error) {
      console.log(error);
      console.error(
        `${chalk.green('[autoUpload]')} Failed to upload ${
          isShort ? 'short' : 'long'
        } video: ${chalk.magenta(title)} due to error: ${
          (error as Error).message
        }`,
      );
      await sleep(60_000 * 60); // 60 mins
    }

    await sleep(6_0000 * 3); // 3 mins
  }
}
