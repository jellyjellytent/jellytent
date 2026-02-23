/**
 * Jellytent - AI Video Chat Agent
 * @module jellytent
 * @version 0.2.0
 */

import { Agent } from './core/agent';
import { AgentConfig } from './types';

export { Agent } from './core/agent';
export { WebSocketTransport } from './transport/websocket';
export * from './types';

const DEFAULT_ENDPOINT = 'wss://api.jellyjelly.io/v1/agent';

export function createAgent(config: AgentConfig): Agent {
  const resolvedConfig: AgentConfig = {
    ...config,
    endpoint: config.endpoint ?? DEFAULT_ENDPOINT,
  };

  return new Agent(resolvedConfig);
}

export default createAgent;
