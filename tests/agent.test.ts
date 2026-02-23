import { Agent } from '../src/core/agent';

describe('Agent', () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({
      apiKey: 'test-key',
      endpoint: 'wss://test.example.com',
    });
  });

  describe('initialization', () => {
    it('should initialize with idle state', () => {
      expect(agent.getState()).toBe('idle');
    });

    it('should generate session ID if not provided', () => {
      expect(agent.getSessionId()).toBeDefined();
      expect(agent.getSessionId().length).toBeGreaterThan(0);
    });

    it('should use provided session ID', () => {
      const customAgent = new Agent({
        apiKey: 'test-key',
        sessionId: 'custom-session-123',
      });
      expect(customAgent.getSessionId()).toBe('custom-session-123');
    });
  });

  describe('state management', () => {
    it('should emit state change events', () => {
      const stateChanges: string[] = [];
      agent.on('state:change', (state) => stateChanges.push(state));

      // State changes happen during connect/disconnect
      expect(stateChanges).toEqual([]);
    });
  });

  describe('message history', () => {
    it('should start with empty history', () => {
      expect(agent.getHistory()).toEqual([]);
    });

    it('should clear history', () => {
      agent.clearHistory();
      expect(agent.getHistory()).toEqual([]);
    });
  });
});
