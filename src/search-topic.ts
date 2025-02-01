import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Promise } from 'bluebird';
import _ from 'lodash';

import { classifyKeyword } from './services/classify';
import { Keyword } from './models/keyword';
import { getRelatedKeywords, getQuestions } from './services/script-generator';
import { sleep } from './utils/sleep.util';
import { isEnglishWord } from './utils/english.util';

const priotizeTopics = [
  'travel',
  'food',
  'exploration',
  'culture',
  'motivation',
  'mindfulness',
  'psychology',
  'leadership',
  'selfhelp',
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
      console.error(`Failed to read topics: ${(error as Error).message}`);
      return [];
    }
  }

  updateTopics(topics: string[]): void {
    try {
      fs.writeFileSync(this.topicPath, topics.join('\n'));
    } catch (error) {
      console.error(`Failed to write topics: ${(error as Error).message}`);
    }
  }
}

async function searchKeyword() {
  const topicManager = new TopicManager(
    path.join(__dirname, '../my-topic.txt'),
  );

  while (true) {
    let topics = topicManager.getTopics();
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
      if (currentTopic.length < 3000) {
        topics.push(...relatedKeywords);
      }
      topicManager.updateTopics(topics);

      // Process keywords in batches
      for (let i = 0; i < relatedKeywords.length; i++) {
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

                  // await sleep(60_000 * 30); // Rate limiting
                },
                {
                  concurrency: 1,
                },
              );
            } catch (error) {
              console.error(
                `[searchKeyword] Failed to process keyword ${keyword}: ${
                  (error as Error).message
                }`,
              );
              await sleep(60_000 * 30); // Wait 5 minutes before retrying
            }
          },
          {
            concurrency: 1,
          },
        );
      }
    } catch (error) {
      console.error(
        `[searchKeyword] Failed to process topic ${currentTopic}: ${
          (error as Error).message
        }`,
      );
      await sleep(60_000 * 30); // Wait 30 minutes before retrying
    }
  }
}

async function setPriorityKeywords() {
  while (true) {
    const keywords = await Keyword.aggregate([
      { $match: { $sampleRate: 0.33, priority: { $ne: 1 } } },
    ]);
    for (const keyword of keywords) {
      const priority = priotizeTopics.includes(keyword.topic) ? 1 : 0;

      console.log(
        `${chalk.green(
          `[setPriorityKeywords]`,
        )} Setting priority for keyword: ${chalk.magenta(
          keyword.keyword,
        )} to ${chalk.magenta(priority.toString())}`,
      );
      await Keyword.updateOne(
        { _id: keyword._id },
        {
          $set: {
            priority,
          },
        },
      );
    }
  }
}

// function calculatePriority(comparedTopic: string): number {
//   let isVerySimilar = false;
//   let isSimilar = false;

//   priotizeTopics.forEach((topic) => tfidf.addDocument(topic));
//   tfidf.tfidfs(comparedTopic, (_, measure, key) => {
//     console.log(2, key, measure);
//   });

//   for (const topic of priotizeTopics) {
//     isVerySimilar = getSentenceSimilarity(comparedTopic, topic) > 0.7;
//     isSimilar = getSentenceSimilarity(comparedTopic, topic) > 0.5;
//   }

//   return isVerySimilar ? 1 : isSimilar ? 0.5 : 0;
// }

export { searchKeyword, setPriorityKeywords };
