import _ from 'lodash';
import chalk from 'chalk';

import './configs/mongoose';
import { generateScript } from './services/script-generator';
import { sleep } from './utils/sleep.util';
import { Keyword, KeywordDocument } from './models/keyword';
import Sentry from './configs/sentry';
import { AxiosError } from 'axios';

async function generateScripts() {
  while (true) {
    const keyword = await Keyword.findOne({
      isGeneratedScript: false,
    }).sort({ priority: -1 });

    if (!keyword) {
      console.log(`${chalk.green('[generateScripts]')} No keywords found`);

      await sleep(60_000 * 30); // 30 mins
      return;
    }

    await _genScriptFromKeyword(keyword);

    await sleep(60_000 * 3); // 3 mins
  }
}

async function _genScriptFromKeyword(keywordDB: KeywordDocument) {
  const { keyword } = keywordDB;
  try {
    console.log(
      `${chalk.green(
        `[generateScripts]`,
      )} Generating script with ${chalk.magenta(keyword)} keyword...`,
    );

    let videoScript;
    try {
      videoScript = await generateScript(keyword);
    } catch (error) {
      if (
        error instanceof AxiosError &&
        error.response?.data.error === 'ValueError'
      ) {
        await keywordDB.deleteOne();
        return;
      }

      throw error;
    }

    keywordDB.isGeneratedScript = true;
    keywordDB.script = {
      title: videoScript.title,
      description: videoScript.description,
      thumbnail: videoScript.thumbnail,
      tags: videoScript.tags,
      keyword,
    };
    await keywordDB.save();

    console.log(
      `${chalk.green(
        '[generateScripts]',
      )} Generated script with ${chalk.magenta(keyword)} keyword!`,
    );
  } catch (error) {
    console.log(error);
    Sentry.captureException(error);

    console.error(
      `${chalk.green(
        '[generateScripts]',
      )} Failed to create script with ${chalk.magenta(
        keyword,
      )} keyword due to error: ${(error as Error).message}`,
    );
    await sleep(60_000 * 30); // 30 mins
  } finally {
    await sleep(60_000 * 5); // 1 mins
  }
}

export { generateScripts };
