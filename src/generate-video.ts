import _ from 'lodash';
import chalk from 'chalk';

import './configs/mongoose';
import {
  generateVideo,
  DEFAULT_VIDEO_INFO,
  VideoRequestPayload,
  getTask,
} from './services/video-generator';
import { retry } from './utils/retry.util';
import { sleep } from './utils/sleep.util';
import { IScript, Keyword, KeywordDocument } from './models/keyword';
import { Channel, ChannelDocument } from './models/channel';
import { Upload } from './models/upload';

import Sentry from './configs/sentry';

async function generateVideos() {
  const genVideo = async (keyword: KeywordDocument) => {
    const script = keyword.script as IScript;
    try {
      console.log(
        `${chalk.green(
          '[generateVideos]',
        )} Generating video with ${chalk.magenta(script.keyword)} keyword...`,
      );

      const tagNum = (script.tags || '').split(',').length;
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

      // Update keyword
      await Keyword.updateOne(
        { _id: keyword._id },
        {
          $set: {
            isLongGenerated: true,
            longVideo: { taskId: videoTaskRes.task_id },
          },
        },
      );

      console.log(
        `${chalk.green(
          '[generateVideos]',
        )} Generated video with ${chalk.magenta(script.keyword)} keyword!`,
      );
    } catch (error) {
      Sentry.captureException(error);

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
    const channels = await Channel.find({});
    for (const channel of channels) {
      const availabilityNum = await getAvaibilityNum(channel, 'long');
      console.log(
        `${chalk.green(
          '[generateShortVideos]',
        )} Available long videos for channel ${chalk.magenta(
          channel.name,
        )} is ${chalk.yellow(availabilityNum)}`,
      );

      if (availabilityNum > 100) {
        console.log(
          `${chalk.green(
            '[generateShortVideos]',
          )} Skip generating long videos for channel ${chalk.magenta(
            channel.name,
          )}`,
        );
        continue;
      }

      const keywords = await Keyword.find({
        isGeneratedScript: true,
        isLongGenerated: false,

        $or: [
          { topic: { $in: channel.topics } },
          { secondTopic: { $in: channel.topics } },
        ],
      }).sort({ priority: -1 });

      if (_.isEmpty(keywords)) {
        await sleep(60_000);
        continue;
      }

      await Promise.all([genVideo(keywords[0]), genVideo(keywords[1])]);
      await sleep(60_000);
    }

    await sleep(60_000 * 10);
  }
}

async function generateShortVideos() {
  const genVideo = async (keyword: KeywordDocument) => {
    const script = keyword.script as IScript;
    try {
      console.log(
        `${chalk.green(
          '[generateShortVideos]',
        )} Generating short video with ${chalk.magenta(
          script.keyword,
        )} keyword...`,
      );

      const tagNum = (script.tags || '').split(',').length;
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

      // Update keyword
      await Keyword.updateOne(
        { _id: keyword._id },
        {
          $set: {
            isShortGenerated: true,
            shortVideo: { taskId: videoTaskRes.task_id },
          },
        },
      );

      console.log(
        `${chalk.green(
          '[generateShortVideos]',
        )} Generated short video with ${chalk.magenta(
          script.keyword,
        )} keyword!`,
      );
    } catch (error) {
      Sentry.captureException(error);

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
    const channels = await Channel.find({});
    for (const channel of channels) {
      const availabilityNum = await getAvaibilityNum(channel, 'short');
      console.log(
        `${chalk.green(
          '[generateShortVideos]',
        )} Available short videos for channel ${chalk.magenta(
          channel.name,
        )} is ${chalk.yellow(availabilityNum)}`,
      );

      if (availabilityNum > 100) {
        console.log(
          `${chalk.green(
            '[generateShortVideos]',
          )} Skip generating short video for channel ${chalk.magenta(
            channel.name,
          )}`,
        );
        continue;
      }

      const keywords = await Keyword.find({
        isGeneratedScript: true,
        isShortGenerated: false,

        $or: [
          { topic: { $in: channel.topics } },
          { secondTopic: { $in: channel.topics } },
        ],
      }).sort({ priority: -1 });

      if (_.isEmpty(keywords)) {
        await sleep(60_000);
        continue;
      }

      await Promise.all([
        genVideo(keywords[0]),
        //  genVideo(keywords[1])
      ]);
      await sleep(60_000);
    }

    await sleep(60_000 * 10);
  }
}

async function getAvaibilityNum(
  channel: ChannelDocument,
  videoType: 'short' | 'long',
) {
  const uploadNum = await Upload.countDocuments({
    channelId: channel._id,
    videoType,
  });

  const shortVideoNum = await Keyword.countDocuments({
    ...(videoType === 'short' ? { isShortGenerated: true } : {}),
    ...(videoType === 'long' ? { isLongGenerated: true } : {}),

    $or: [
      { topic: { $in: channel.topics } },
      { secondTopic: { $in: channel.topics } },
    ],
  });

  const availabilityNum = shortVideoNum - uploadNum;

  return availabilityNum;
}
export { generateVideos, generateShortVideos };
