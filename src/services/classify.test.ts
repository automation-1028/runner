import 'dotenv/config';
import { classifyKeyword } from './classify';

describe('Classify keyword', () => {
  it(
    'should return valid food topic',
    async () => {
      const topic = await classifyKeyword('Why Chinese Food Is So Fast');

      expect(topic).toEqual('food');
    },
    60_000 * 5,
  );

  it(
    'should return valid travel topic',
    async () => {
      const topic = await classifyKeyword('Where to visit in vietnam');

      expect(topic).toEqual('travel');
    },
    60_000 * 5,
  );

  it(
    'should return valid culture topic',
    async () => {
      const topic = await classifyKeyword('The culture of Japan');

      expect(topic).toEqual('culture');
    },
    60_000 * 5,
  );

  it(
    'should return valid psychology topic',
    async () => {
      const topic = await classifyKeyword('The psychology of human behavior');

      expect(topic).toEqual('psychology');
    },
    60_000 * 5,
  );

  it(
    'should return valid leadership topic',
    async () => {
      const topic = await classifyKeyword('The leadership of Elon Musk');

      expect(topic).toEqual('leadership');
    },
    60_000 * 5,
  );

  it(
    'should return valid selfhelp topic',
    async () => {
      const topic = await classifyKeyword('How to help yourself');

      expect(topic).toEqual('selfhelp');
    },
    60_000 * 5,
  );

  it(
    'should return not travel topic',
    async () => {
      const topic = await classifyKeyword(
        'when calls the heart 8x08 tvpromosdb',
      );

      console.log(1, topic);

      expect(topic).not.toEqual('travel');
    },
    60_000 * 5,
  );
});
