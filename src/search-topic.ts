import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Promise } from 'bluebird';
import _ from 'lodash';

import { classifyKeyword } from './services/classify';
import { Keyword, KeywordDocument } from './models/keyword';
import { getRelatedKeywords, getQuestions } from './services/script-generator';
import { sleep } from './utils/sleep.util';
import { isEnglishWord } from './utils/english.util';
import { getWordSimilarity } from './utils/similarity.util';
import Sentry from './configs/sentry';

const priotizeTopics = [
  'travel',
  'food',
  'exploration',
  'culture',
  'motivation',
  'mindfulness',
  'psychology',
  'leadership',
  // 'selfhelp',
  'life experiences',
  'personal growth',
];

class TopicManager {
  private topicPath: string;

  constructor(topicPath: string) {
    this.topicPath = topicPath;
  }

  getTopics(): string[] {
    try {
      return fs
        .readFileSync(this.topicPath, 'utf-8')
        .split('\n')
        .map((k) => k.trim())
        .filter((k) => !!k);
    } catch (error) {
      Sentry.captureException(error);

      console.error(`Failed to read topics: ${(error as Error).message}`);
      return [];
    }
  }

  updateTopics(topics: string[]): void {
    try {
      fs.writeFileSync(this.topicPath, topics.join('\n'));
    } catch (error) {
      Sentry.captureException(error);

      console.error(`Failed to write topics: ${(error as Error).message}`);
    }
  }

  removeTopic(topic: string): void {
    const topics = this.getTopics().filter((t) => t !== topic);
    this.updateTopics(topics);
  }
}

async function searchKeyword() {
  const topicManager = new TopicManager(
    path.join(__dirname, '../my-topic.txt'),
  );

  while (true) {
    let topics = topicManager.getTopics();
    topics = _.uniq(topics);
    topics = _.sampleSize(topics, topics.length);

    if (topics.length === 0) {
      console.log(
        `${chalk.green(`[searchKeyword]`)} No topics to process. Waiting...`,
      );

      return;
    }

    const currentTopic = topics.pop();
    if (!currentTopic) continue;

    try {
      console.log(
        `${chalk.green(`[searchKeyword]`)} Processing topic: ${chalk.magenta(
          currentTopic,
        )}`,
      );

      const relatedKeywords = await getRelatedKeywords(currentTopic);

      // Update topics list
      topics = topics.filter((t) => t !== currentTopic);
      if (currentTopic.length < 10_000) {
        topics.push(...relatedKeywords);
      }
      topicManager.updateTopics(topics);

      // Process keywords in batches
      await Promise.map(
        relatedKeywords,
        async (keyword) => {
          try {
            const questions = await getQuestions(keyword);
            await Promise.map(
              questions,
              async (question) => {
                const {
                  keyword: questionKeyword,
                  competition,
                  volume,
                  overall,
                  estimated_monthly_search,
                } = question;

                // Skip non-English keywords
                if (!isEnglishWord(questionKeyword)) {
                  console.log(
                    `${chalk.yellow(
                      `[searchKeyword]`,
                    )} Skipping non-English keyword: ${chalk.magenta(
                      questionKeyword,
                    )}`,
                  );
                  return;
                }

                const topic = await classifyKeyword(questionKeyword);
                const priority = priotizeTopics.includes(topic) ? 1 : 0;

                await Keyword.findOneAndUpdate(
                  { keyword: questionKeyword },
                  {
                    competition,
                    volume,
                    overall,
                    estimatedMonthlySearch: estimated_monthly_search,
                    topic,
                    priority,
                  },
                  { upsert: true },
                );

                console.log(
                  `${chalk.green(
                    `[searchKeyword]`,
                  )} Processed keyword: ${chalk.magenta(
                    questionKeyword,
                  )} under topic: ${chalk.magenta(topic)}`,
                );

                await sleep(1_000); // Rate limiting
              },
              {
                concurrency: 1,
              },
            );

            topicManager.removeTopic(keyword);
          } catch (error) {
            Sentry.captureException(error);

            console.error(
              `${chalk.red(
                `[searchKeyword]`,
              )} Failed to process keyword ${keyword}: ${
                (error as Error).message
              }`,
            );
            await sleep(60_000);
          }
        },
        {
          concurrency: 2,
        },
      );
    } catch (error) {
      Sentry.captureException(error);

      console.error(
        `${chalk.red(
          `[searchKeyword]`,
        )} Failed to process topic ${currentTopic}: ${
          (error as Error).message
        }`,
      );
      await sleep(60_000); // Wait 30 minutes before retrying
    }
  }
}

async function setPriorityKeywords() {
  while (true) {
    const keywords: KeywordDocument[] = await Keyword.find({})
      .sort({ updatedAt: 1 })
      .limit(1000);

    for (const keyword of keywords) {
      const [priority, topic] = calculatePriority(keyword.topic);
      // console.log(
      //   `${chalk.green(
      //     `[setPriorityKeywords]`,
      //   )} Setting priority for keyword: ${chalk.magenta(
      //     keyword.topic,
      //   )} to ${chalk.magenta(priority.toString())}`,
      // );

      await Keyword.updateOne(
        { _id: keyword._id },
        {
          $set: {
            priority,
            secondTopic: topic,
          },
        },
      );

      await sleep(1_000); // Rate limiting
    }
  }
}

function calculatePriority(comparedTopic: string): [number, string] {
  const priorityTopics = priotizeTopics.map((topic) => [
    getWordSimilarity(comparedTopic, topic),
    topic,
  ]);
  const [maxSimilarity, topic] = _.maxBy(
    priorityTopics,
    ([similarity]) => similarity,
  ) as [number, string];

  if (maxSimilarity >= 1) return [1, topic];
  if (maxSimilarity >= 0.7) return [0.7, topic];
  if (maxSimilarity >= 0.4) return [0.5, topic];
  return [0, topic];
}

export { searchKeyword, setPriorityKeywords };
