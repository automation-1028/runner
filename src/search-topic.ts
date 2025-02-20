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
import { Channel } from './models/channel';
import { TopicSearch } from './models/topic-search';

async function createReletedTopics(priotizeTopics: string[]) {
  for (const topic of priotizeTopics) {
    const isExist = await TopicSearch.exists({ topic });
    if (isExist) continue;
    const relatedTopics = await getRelatedKeywords(topic);

    await Promise.map(
      relatedTopics,
      async (relatedTopic) => {
        await TopicSearch.findOneAndUpdate(
          { topic, relatedTopic },
          {
            topic,
            relatedTopic,
            isHandled: false,
          },
          { upsert: true },
        );
      },
      {
        concurrency: 1,
      },
    );
  }
}
async function searchKeyword() {
  const channels = await Channel.find({ isRunningSearchKeyword: true });
  const priotizeTopics = channels.flatMap((channel) => channel.topics);

  await createReletedTopics(priotizeTopics);
  await Promise.map(
    channels,
    async (channel) => {
      const { topics } = channel;

      await Promise.map(
        topics,
        async (topic) => {
          try {
            console.log(
              `${chalk.green(
                `[searchKeyword]`,
              )} Processing topic: ${chalk.magenta(topic)}`,
            );

            const relatedTopics = await TopicSearch.find({
              topic,
              isHandled: false,
            });

            // Process keywords in batches
            await Promise.map(
              relatedTopics,
              async (relatedTopic) => {
                try {
                  const questions = await getQuestions(
                    relatedTopic.relatedTopic,
                  );

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

                      const isExist = await Keyword.exists({
                        keyword: questionKeyword,
                      });
                      if (isExist) {
                        console.log(
                          `${chalk.yellow(
                            `[searchKeyword]`,
                          )} Skipping existing keyword: ${chalk.magenta(
                            questionKeyword,
                          )}`,
                        );
                        return;
                      }

                      const keywordTopic = await classifyKeyword(
                        questionKeyword,
                      );
                      const priority = priotizeTopics.includes(keywordTopic)
                        ? 1
                        : 0;

                      await Keyword.findOneAndUpdate(
                        { keyword: questionKeyword },
                        {
                          competition,
                          volume,
                          overall,
                          estimatedMonthlySearch: estimated_monthly_search,
                          topic: keywordTopic,
                          priority,
                        },
                        { upsert: true },
                      );

                      console.log(
                        `${chalk.green(
                          `[searchKeyword]`,
                        )} Processed keyword: ${chalk.magenta(
                          questionKeyword,
                        )} under topic: ${chalk.magenta(keywordTopic)}`,
                      );

                      await sleep(2_000); // Rate limiting
                    },
                    {
                      concurrency: 1,
                    },
                  );

                  await TopicSearch.updateOne(
                    { _id: relatedTopic._id },
                    { isHandled: true },
                  );
                } catch (error) {
                  Sentry.captureException(error);

                  console.error(
                    `${chalk.red(
                      `[searchKeyword]`,
                    )} Failed to process related topic ${
                      relatedTopic.relatedTopic
                    }: ${(error as Error).message}`,
                  );
                  await sleep(60_000);
                }
              },
              {
                concurrency: 1,
              },
            );
          } catch (error) {
            Sentry.captureException(error);

            console.error(
              `${chalk.red(
                `[searchKeyword]`,
              )} Failed to process topic ${topic}: ${(error as Error).message}`,
            );
            await sleep(60_000); // Wait 30 minutes before retrying
          }
        },
        {
          concurrency: 1,
        },
      );
    },
    {
      concurrency: 2,
    },
  );
}

async function setPriorityKeywords() {
  const channels = await Channel.find({ isRunningSearchKeyword: true });
  const topics = channels.flatMap((channel) => channel.topics);

  while (true) {
    const keywords: KeywordDocument[] = await Keyword.find({})
      .sort({ updatedAt: 1 })
      .limit(1000);

    for (const keyword of keywords) {
      const [priority, topic] = calculatePriority(keyword.topic, topics);
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

function calculatePriority(
  comparedTopic: string,
  topics: string[],
): [number, string] {
  const priorityTopics = topics.map((topic) => [
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
  return [0, ''];
}

export { searchKeyword, setPriorityKeywords };
