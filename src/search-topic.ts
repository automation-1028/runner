import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Promise } from 'bluebird';

import { classifyKeyword } from './services/open-ai';
import { Keyword } from './models/keyword';
import { getRelatedKeywords, getQuestions } from './services/script-generator';
import { sleep } from './utils/sleep.util';
import { isEnglishWord } from './utils/english.util';

class TopicManager {
  // travel
  // food
  // exploration
  // culture
  // motivation
  // mindfulness
  // psychology
  // leadership
  // selfhelp
  // Life Experiences
  // Personal Growth
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

    const currentTopic = topics.shift();
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

                  await Keyword.findOneAndUpdate(
                    { keyword: questionKeyword },
                    {
                      competition,
                      volume,
                      overall,
                      estimatedMonthlySearch: estimated_monthly_search,
                      topic,
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

                  await sleep(1000); // Rate limiting
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
            }
          },
          {
            concurrency: 1,
          },
        );
        await sleep(10_000); // Rate limiting
      }
    } catch (error) {
      console.error(
        `[searchKeyword] Failed to process topic ${currentTopic}: ${
          (error as Error).message
        }`,
      );
      await sleep(60000); // Wait 1 minute before retrying
    }
  }
}

export { searchKeyword };
