import { Agent } from '../src/core/agent';

describe('Agent', () => {
  it('should initialize with idle state', () => {
    const agent = new Agent({ apiKey: 'test-key' });
    expect(agent.getState()).toBe('idle');
  });

  it('should process messages', async () => {
    const agent = new Agent({ apiKey: 'test-key' });
    const response = await agent.processMessage('Hello');
    expect(response).toContain('Hello');
  });
});
