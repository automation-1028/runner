import moment from 'moment-timezone';
import _ from 'lodash';
import chalk from 'chalk';

import { uploadVideo } from './services/youtube-uploader';
import { sleep } from './utils/sleep.util';
import { Channel, ChannelDocument } from './models/channel';
import { IScript, IVideo, Keyword } from './models/keyword';
import { Upload } from './models/upload';

async function _uploadVideoByType(
  channel: ChannelDocument,
  videoType: 'short' | 'long',
) {
  const { name, topics, maxDailyShortVideosLimit, maxDailyLongVideosLimit } =
    channel;

  console.log(
    `${chalk.green(
      '[autoUpload]',
    )} Uploading ${videoType} videos for channel: ${chalk.magenta(name)}`,
  );

  try {
    const keywords = await Keyword.find({
      topic: { $in: topics },
      isGeneratedScript: true,

      ...(videoType === 'short' && { isShortGenerated: true }),
      ...(videoType === 'long' && { isLongGenerated: true }),
    });

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
            '[autoUpload]',
          )} ${videoType} video limit reached for channel: ${chalk.magenta(
            name,
          )}`,
        );
        break;
      }

      const script = keyword.script as IScript;
      const { title, description, thumbnail, tags } = script;
      const video = (
        videoType === 'short' ? keyword.shortVideo : keyword.longVideo
      ) as IVideo;

      const videoTags = tags.substring(0, 480).split(',');
      videoTags.pop();

      await uploadVideo({
        title,
        description,
        thumbnail: videoType === 'short' ? '' : thumbnail,
        tags: videoTags.slice(0, 15).join(', '),
        filePath: `${process.env.VIDEO_TASK_DIR}/${video.taskId}/final-1.mp4`,
        publishAt: moment()
          .tz('America/New_York')
          .add(1, 'days')
          .hour(10 + Math.floor(Math.random() * 14))
          .minute(Math.floor(Math.random() * 60))
          .toDate(),
        channel: name,
      });

      await Upload.create({
        channelId: channel._id,
        keywordId: keyword._id,
        videoType,
      });

      console.log(
        `${chalk.green(
          '[autoUpload]',
        )} Uploaded ${videoType} video: ${chalk.magenta(title)}`,
      );
    }
  } catch (error) {
    console.error(
      `${chalk.green(
        '[autoUpload]',
      )} Failed to upload ${videoType} videos for channel: ${chalk.magenta(
        name,
      )} due to error: ${(error as Error).message}`,
    );
  } finally {
    await sleep(60_000 * 5); // Wait 5 minutes before uploading next video
  }
}
async function autoUpload() {
  const channels = await Channel.find({}).exec();

  for (const channel of channels) {
    await _uploadVideoByType(channel, 'short');
    await _uploadVideoByType(channel, 'long');
  }
}

export { autoUpload };
