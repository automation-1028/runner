import moment from 'moment-timezone';
import _ from 'lodash';
import chalk from 'chalk';

import { uploadVideo } from './services/youtube-uploader';
import { sleep } from './utils/sleep.util';
import { Channel, ChannelDocument } from './models/channel';
import { IScript, IVideo, Keyword } from './models/keyword';
import { Upload } from './models/upload';
import Sentry from './configs/sentry';

async function _scheduleUploadVideoByType(
  channel: ChannelDocument,
  videoType: 'short' | 'long',
) {
  const { name, topics, maxDailyShortVideosLimit, maxDailyLongVideosLimit } =
    channel;

  console.log(
    `${chalk.green(
      '[scheduleToUpload]',
    )} Scheduling ${videoType} videos for channel: ${chalk.magenta(name)}`,
  );

  try {
    // Get uploaded
    const uploaded = await Upload.find({
      channelId: channel._id,
      videoType,
    });
    const uploadedKeywordIds = uploaded.map((upload) => upload.keywordId);

    const keywords = await Keyword.find({
      _id: { $nin: uploadedKeywordIds },
      $or: [{ topic: { $in: topics } }, { secondTopic: { $in: topics } }],
      isGeneratedScript: true,

      ...(videoType === 'short' && { isShortGenerated: true }),
      ...(videoType === 'long' && { isLongGenerated: true }),
    }).sort({ priority: -1 });

    for (const keyword of keywords) {
      const todayUpload = await Upload.find({
        channelId: channel._id,
        videoType,
        createdAt: {
          $gte: moment().startOf('day').toDate(),
          $lte: moment().endOf('day').toDate(),
        },
      });

      if (
        todayUpload.length >=
        (videoType === 'short'
          ? maxDailyShortVideosLimit
          : maxDailyLongVideosLimit)
      ) {
        console.log(
          `${chalk.green(
            '[scheduleToUpload]',
          )} ${videoType} video limit reached for channel: ${chalk.magenta(
            name,
          )}`,
        );
        break;
      }

      await Upload.create({
        channelId: channel._id,
        keywordId: keyword._id,
        videoType,
        visibility: 'unlisted',
        publishAt: moment()
          .tz('America/New_York')
          .add(1, 'days')
          .hour(10 + Math.floor(Math.random() * 14))
          .minute(Math.floor(Math.random() * 60))
          .toDate(),
      });

      console.log(
        `${chalk.green(
          '[scheduleToUpload]',
        )} Scheduled ${videoType} video upload for channel: ${chalk.magenta(
          name,
        )}`,
      );
    }
  } catch (error) {
    Sentry.captureException(error);

    console.error(
      `${chalk.red(
        '[scheduleToUpload]',
      )} Error Scheduling ${videoType} videos for channel: ${chalk.magenta(
        name,
      )}`,
      error,
    );
  } finally {
    await sleep(60_000 * 5); // Wait 5 minutes before uploading next video
  }
}
async function scheduleToUpload() {
  const channels = await Channel.find({
    isActive: true,
  }).exec();

  for (const channel of channels) {
    await _scheduleUploadVideoByType(channel, 'short');
    await _scheduleUploadVideoByType(channel, 'long');
  }
}

async function uploadVideoCronJob() {
  const _uploadVideo = async (channel: ChannelDocument) => {
    const uploads = await Upload.find({
      publishAt: {
        $lte: new Date(),
      },
      visibility: 'unlisted',
      channelId: channel._id,
    });
    console.log(
      `${chalk.green('[uploadVideoCronJob]')} Found ${
        uploads.length
      } videos to upload for channel: ${chalk.magenta(channel.name)}`,
    );

    for (const upload of uploads) {
      const keyword = await Keyword.findById(upload.keywordId);
      if (!keyword) {
        continue;
      }

      const script = keyword.script as IScript;
      const { title, description, thumbnail, tags = '' } = script;
      const video = (
        upload.videoType === 'short' ? keyword.shortVideo : keyword.longVideo
      ) as IVideo;

      console.log(
        `${chalk.green('[uploadVideoCronJob]')} Uploading ${
          upload.videoType
        } video with keyword: ${chalk.magenta(keyword.keyword)}`,
      );

      const videoTags = tags.substring(0, 480).split(',');
      videoTags.pop();

      const videoRes = await uploadVideo({
        videoType: upload.videoType,
        title,
        description,
        thumbnail: upload.videoType === 'short' ? '' : thumbnail,
        tags: videoTags.slice(0, 15).join(', '),
        filePath: `${process.env.VIDEO_TASK_DIR}/${video.taskId}/final-1.mp4`,
        chromeProfileId: channel.chromeProfileId,
      });
      const youtubeLink = videoRes.youtubeLink;

      await Upload.findByIdAndUpdate(upload._id, {
        visibility: 'public',
        youtubeLink,
      });

      console.log(
        `${chalk.green(
          '[uploadVideoCronJob]',
        )} Uploaded video for channel: ${chalk.magenta(channel.name)}`,
      );

      await sleep(60_000);
    }
  };
  while (true) {
    try {
      const channels = await Channel.find({
        isUploadingVideo: true,
      }).exec();

      await Promise.all(
        channels.map(async (channel) => {
          await _uploadVideo(channel);
        }),
      );
    } catch (error) {
      Sentry.captureException(error);

      console.error(
        `${chalk.red('[uploadVideoCronJob]')} Error uploading video`,
        error,
      );
    } finally {
      await sleep(60_000 * 5); // Wait 5 minutes before checking next
    }
  }
}

export { scheduleToUpload, uploadVideoCronJob };
