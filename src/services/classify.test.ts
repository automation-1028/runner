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
});
