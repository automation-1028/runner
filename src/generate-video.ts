import _ from 'lodash';
import chalk from 'chalk';

import './configs/mongoose';
import {
  generateVideo,
  DEFAULT_VIDEO_INFO,
  VideoRequestPayload,
  getTask,
  ITaskResponse,
  deleteTask,
} from './services/video-generator';
import { retry } from './utils/retry.util';
import { sleep } from './utils/sleep.util';
import { IScript, Keyword, KeywordDocument } from './models/keyword';
import { Channel, ChannelDocument } from './models/channel';
import { Upload } from './models/upload';

import Sentry from './configs/sentry';

type VideoType = 'short' | 'long';

interface VideoTypeConfig {
  isGeneratedField: 'isShortGenerated' | 'isLongGenerated';
  videoField: 'shortVideo' | 'longVideo';
  maxDailyLimit: 'maxDailyShortVideosLimit' | 'maxDailyLongVideosLimit';
  videoSettings: Partial<VideoRequestPayload>;
}

const VIDEO_TYPE_CONFIGS: Record<VideoType, VideoTypeConfig> = {
  short: {
    isGeneratedField: 'isShortGenerated',
    videoField: 'shortVideo',
    maxDailyLimit: 'maxDailyShortVideosLimit',
    videoSettings: {
      video_aspect: '9:16',
      video_clip_duration: 5,
      subtitle_position: 'custom',
      custom_position: 70.0,
      text_fore_color: '#FFFFFF',
      font_size: 75,
      stroke_color: '#000000',
      stroke_width: 5,
      video_script: '',
    },
  },
  long: {
    isGeneratedField: 'isLongGenerated',
    videoField: 'longVideo',
    maxDailyLimit: 'maxDailyLongVideosLimit',
    videoSettings: {
      paragraph_number: 50,
      video_clip_duration: 10,
    },
  },
};

async function generateVideos(videoType: VideoType) {
  const config = VIDEO_TYPE_CONFIGS[videoType];

  const genVideo = async (keyword: KeywordDocument) => {
    const script = keyword.script as IScript;
    try {
      console.log(
        `${chalk.green(
          '[generateVideos]',
        )} Generating ${videoType} video with ${chalk.magenta(
          script.keyword,
        )} keyword...`,
      );

      const videoTaskRes = await generateVideo({
        ...DEFAULT_VIDEO_INFO,
        ...config.videoSettings,
        ...{
          video_subject: script.title,
          video_description: script.description,
          video_terms: '',
          thumbnail: script.thumbnail,
          video_source: 'pexels',
        },
      } as VideoRequestPayload);

      let taskRes;
      let isFinished = false;
      let lastProgress = -1;
      let lastProgressTime = Date.now();

      do {
        taskRes = (await retry(
          () => getTask(videoTaskRes.task_id),
          10,
        )) as ITaskResponse;
        const { progress } = taskRes;

        // Check if progress is stuck
        if (progress === lastProgress) {
          const timeDiff = Date.now() - lastProgressTime;
          // if (progress === 0 && timeDiff >= 1 * 60 * 1000) {
          //   // 1 minutes in milliseconds
          //   throw new Error(
          //     `Video generation progress stuck at ${chalk.yellow(
          //       progress,
          //     )}% for 1 minute`,
          //   );
          // } else
          if (timeDiff >= 30 * 60 * 1000) {
            await deleteTask(videoTaskRes.task_id);
            // 30 minutes in milliseconds
            throw new Error(
              `Video generation progress stuck at ${chalk.yellow(
                progress,
              )}% for 30 minutes`,
            );
          }
        } else {
          lastProgress = progress;
          lastProgressTime = Date.now();
        }

        console.log(
          `${chalk.green(
            '[generateVideos]',
          )} Generating ${videoType} video with ${chalk.magenta(
            script.keyword,
          )} keyword progress: ${chalk.yellow(progress)}`,
        );
        isFinished = progress === 100;
        if (!isFinished) {
          await sleep(10_000);
        }
      } while (!isFinished);

      // Update keyword
      await Keyword.updateOne(
        { _id: keyword._id },
        {
          $set: {
            [config.isGeneratedField]: true,
            [config.videoField]: { taskId: videoTaskRes.task_id },
          },
        },
      );

      console.log(
        `${chalk.green(
          '[generateVideos]',
        )} Generated ${videoType} video with ${chalk.magenta(
          script.keyword,
        )} keyword!`,
      );
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        `${chalk.green(
          '[generateVideos]',
        )} Failed to generate ${videoType} video with ${chalk.magenta(
          script.keyword,
        )} keyword due to error: ${(error as Error).message}`,
      );
    }
  };

  while (true) {
    const channels = await Channel.find({ isActive: true });

    // await Promise.all(
    //   channels.map(async (channel) => {
    //     const availabilityNum = await getAvaibilityNum(channel, videoType);
    //     console.log(
    //       `${chalk.green(
    //         '[generateVideos]',
    //       )} Available ${videoType} videos for channel ${chalk.magenta(
    //         channel.name,
    //       )} is ${chalk.yellow(availabilityNum)}`,
    //     );

    //     if (availabilityNum > channel[config.maxDailyLimit]) {
    //       console.log(
    //         `${chalk.green(
    //           '[generateVideos]',
    //         )} Skip generating ${videoType} video for channel ${chalk.magenta(
    //           channel.name,
    //         )}`,
    //       );

    //       return;
    //     }

    //     const keyword = await Keyword.findOne({
    //       isGeneratedScript: true,
    //       [config.isGeneratedField]: false,
    //       $or: [
    //         { topic: { $in: channel.topics } },
    //         { secondTopic: { $in: channel.topics } },
    //       ],
    //     }).sort({ priority: -1 });

    //     if (!keyword) {
    //       return;
    //     }

    //     await genVideo(keyword);
    //   }),
    // );

    for (const channel of channels) {
      const availabilityNum = await getAvaibilityNum(channel, videoType);
      console.log(
        `${chalk.green(
          '[generateVideos]',
        )} Available ${videoType} videos for channel ${chalk.magenta(
          channel.name,
        )} is ${chalk.yellow(availabilityNum)}`,
      );

      if (availabilityNum > channel[config.maxDailyLimit]) {
        console.log(
          `${chalk.green(
            '[generateVideos]',
          )} Skip generating ${videoType} video for channel ${chalk.magenta(
            channel.name,
          )}`,
        );

        return;
      }

      const keyword = await Keyword.findOne({
        isGeneratedScript: true,
        [config.isGeneratedField]: false,
        $or: [
          { topic: { $in: channel.topics } },
          { secondTopic: { $in: channel.topics } },
        ],
      }).sort({ priority: -1 });

      if (!keyword) {
        return;
      }

      await genVideo(keyword);
    }

    await sleep(60_000);
  }
}

async function getAvaibilityNum(
  channel: ChannelDocument,
  videoType: VideoType,
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

async function processVideos() {
  await Promise.all([generateVideos('short'), generateVideos('long')]);
  // await generateVideos('short');
  // await generateVideos('long');
}

export { processVideos };
