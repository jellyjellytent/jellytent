import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationMemory } from '../../src/memory/conversation';
import { MemoryManager } from '../../src/memory/manager';

describe('ConversationMemory', () => {
  let memory: ConversationMemory;

  beforeEach(() => {
    memory = new ConversationMemory({ maxHistory: 10 });
  });

  describe('add', () => {
    it('should add message and return id', async () => {
      const id = await memory.add({
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should store multiple messages', async () => {
      await memory.add({ role: 'user', content: 'Hello', timestamp: 1 });
      await memory.add({ role: 'assistant', content: 'Hi!', timestamp: 2 });

      const all = memory.getAll();
      expect(all).toHaveLength(2);
    });

    it('should prune when over limit', async () => {
      for (let i = 0; i < 15; i++) {
        await memory.add({
          role: 'user',
          content: `Message ${i}`,
          timestamp: i,
        });
      }

      const all = memory.getAll();
      expect(all).toHaveLength(10);
      expect(all[0]?.content).toBe('Message 5');
    });
  });

  describe('getRecent', () => {
    it('should return recent messages', async () => {
      await memory.add({ role: 'user', content: 'First', timestamp: 1 });
      await memory.add({ role: 'user', content: 'Second', timestamp: 2 });
      await memory.add({ role: 'user', content: 'Third', timestamp: 3 });

      const recent = memory.getRecent(2);
      expect(recent).toHaveLength(2);
      expect(recent[0]?.content).toBe('Second');
      expect(recent[1]?.content).toBe('Third');
    });
  });

  describe('clear', () => {
    it('should clear all messages', async () => {
      await memory.add({ role: 'user', content: 'Hello', timestamp: 1 });
      await memory.clear();

      expect(memory.getAll()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      await memory.add({ role: 'user', content: 'Hello', timestamp: 100 });
      await memory.add({ role: 'user', content: 'World', timestamp: 200 });

      const stats = memory.getStats();
      expect(stats.messageCount).toBe(2);
      expect(stats.oldestTimestamp).toBe(100);
    });
  });
});

describe('MemoryManager', () => {
  describe('initialization', () => {
    it('should initialize with local provider', async () => {
      const manager = new MemoryManager({ enabled: true, provider: 'local' });
      await manager.initialize();

      const stats = await manager.getStats();
      expect(stats.messageCount).toBe(0);

      await manager.close();
    });

    it('should throw for unimplemented providers', async () => {
      const manager = new MemoryManager({ enabled: true, provider: 'pinecone' });

      await expect(manager.initialize()).rejects.toThrow('not yet implemented');
    });
  });

  describe('addMessage', () => {
    it('should add message to memory', async () => {
      const manager = new MemoryManager({ enabled: true, provider: 'local' });
      await manager.initialize();

      await manager.addMessage({
        role: 'user',
        content: 'Test message',
        timestamp: Date.now(),
      });

      const stats = await manager.getStats();
      expect(stats.messageCount).toBe(1);

      await manager.close();
    });
  });

  // TODO: Add tests for semantic search once embeddings are implemented
});
