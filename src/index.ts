/**
 * Jellytent - AI Video Chat Agent
 * @module jellytent
 */

import { Agent } from './core/agent';
import { AgentConfig } from './types';

export { Agent } from './core/agent';
export * from './types';

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
