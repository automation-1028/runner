import 'dotenv/config';
import { classifyKeyword } from './classify';

describe('Classify', () => {
  it('should return valid topic name', async () => {
    const topic = await classifyKeyword('Why Chinese Food Is So Fast');

    expect(topic).toEqual('food');
  }, 60_000);
});
