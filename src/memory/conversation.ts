/**
 * Conversation Memory - Local in-memory storage
 *
 * This is a simple implementation for development and testing.
 * Production deployments should use a vector database.
 */

import { v4 as uuidv4 } from 'uuid';

export interface MemoryEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

interface ConversationMemoryConfig {
  maxHistory: number;
}

export class ConversationMemory {
  private entries: MemoryEntry[] = [];
  private config: ConversationMemoryConfig;

  constructor(config: ConversationMemoryConfig) {
    this.config = config;
  }

  async add(entry: Omit<MemoryEntry, 'id'>): Promise<string> {
    const id = uuidv4();

    this.entries.push({
      ...entry,
      id,
    });

    // Prune if over limit
    if (this.entries.length > this.config.maxHistory) {
      // TODO: Implement smarter pruning
      // - Summarize old messages before removing
      // - Keep important/relevant messages
      this.entries = this.entries.slice(-this.config.maxHistory);
    }

    return id;
  }

  getRecent(limit: number): MemoryEntry[] {
    return this.entries.slice(-limit);
  }

  getAll(): MemoryEntry[] {
    return [...this.entries];
  }

  async search(embedding: number[], limit: number): Promise<MemoryEntry[]> {
    // TODO: Implement proper similarity search
    // For now, just return recent entries
    // This should use cosine similarity or dot product

    if (!this.entries.some(e => e.embedding)) {
      // No embeddings available, fall back to recent
      return this.getRecent(limit);
    }

    // Placeholder: compute cosine similarity
    const withScores = this.entries
      .filter(e => e.embedding)
      .map(entry => ({
        entry,
        score: this.cosineSimilarity(embedding, entry.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return withScores.map(({ entry }) => entry);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async clear(): Promise<void> {
    this.entries = [];
  }

  getStats(): { messageCount: number; oldestTimestamp?: number } {
    return {
      messageCount: this.entries.length,
      oldestTimestamp: this.entries[0]?.timestamp,
    };
  }

  async close(): Promise<void> {
    // No cleanup needed for in-memory storage
  }
}

// TODO: Implement summarization
// export class MemorySummarizer {
//   async summarize(entries: MemoryEntry[]): Promise<string> {
//     // Use LLM to summarize conversation
//   }
// }
