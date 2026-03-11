import { Plugin, PluginContext, PluginResult } from './types';
import { MetricsCollector } from '../observability/metrics';
import { Logger, logger as rootLogger } from '../utils/logger';

interface PluginManagerOptions {
  metrics?: MetricsCollector | null;
  logger?: Logger;
}

interface RegisteredPlugin {
  plugin: Plugin;
  context: PluginContext;
  enabled: boolean;
}

export class PluginManager {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private logger: Logger;
  private metrics?: MetricsCollector | null;

  constructor(options: PluginManagerOptions = {}) {
    this.logger = options.logger ?? rootLogger.child('plugins');
    this.metrics = options.metrics;
  }

  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    const context: PluginContext = {
      logger: this.logger.child(plugin.name),
      config: {},
    };

    this.logger.info('Registering plugin', {
      name: plugin.name,
      version: plugin.version,
    });

    try {
      if (plugin.onInit) {
        await plugin.onInit(context);
      }

      this.plugins.set(plugin.name, {
        plugin,
        context,
        enabled: true,
      });

      this.metrics?.incrementCounter('plugins_loaded_total');
      this.logger.info('Plugin registered successfully', { name: plugin.name });
    } catch (error) {
      this.logger.error('Failed to initialize plugin', {
        name: plugin.name,
        error,
      });
      throw error;
    }
  }

  async unregister(name: string): Promise<void> {
    const registered = this.plugins.get(name);
    if (!registered) {
      return;
    }

    try {
      if (registered.plugin.onDestroy) {
        await registered.plugin.onDestroy(registered.context);
      }
    } catch (error) {
      this.logger.error('Error during plugin cleanup', { name, error });
    }

    this.plugins.delete(name);
    this.logger.info('Plugin unregistered', { name });
  }

  async processMessage(message: string): Promise<PluginResult> {
    let currentContent = message;
    let handled = false;

    const sortedPlugins = this.getSortedPlugins();

    for (const { plugin, context, enabled } of sortedPlugins) {
      if (!enabled || !plugin.onMessage) continue;

      try {
        const result = await plugin.onMessage(currentContent, context);

        if (result) {
          currentContent = result.content;
          if (result.handled) {
            handled = true;
            break;
          }
        }
      } catch (error) {
        this.logger.error('Plugin error during message processing', {
          plugin: plugin.name,
          error,
        });
        this.metrics?.incrementCounter('plugin_errors_total', {
          plugin: plugin.name,
        });
      }
    }

    return { handled, content: currentContent };
  }

  async processResponse(response: string): Promise<PluginResult> {
    let currentContent = response;

    const sortedPlugins = this.getSortedPlugins();

    for (const { plugin, context, enabled } of sortedPlugins) {
      if (!enabled || !plugin.onResponse) continue;

      try {
        const result = await plugin.onResponse(currentContent, context);
        if (result) {
          currentContent = result;
        }
      } catch (error) {
        this.logger.error('Plugin error during response processing', {
          plugin: plugin.name,
          error,
        });
      }
    }

    return { handled: false, content: currentContent };
  }

  async handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    for (const { plugin, context, enabled } of this.plugins.values()) {
      if (!enabled || !plugin.onToolCall) continue;

      try {
        const result = await plugin.onToolCall(toolName, args, context);
        if (result !== undefined) {
          return result;
        }
      } catch (error) {
        this.logger.error('Plugin error during tool call', {
          plugin: plugin.name,
          toolName,
          error,
        });
      }
    }

    return undefined;
  }

  setEnabled(name: string, enabled: boolean): void {
    const registered = this.plugins.get(name);
    if (registered) {
      registered.enabled = enabled;
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  listPlugins(): Array<{ name: string; version: string; enabled: boolean }> {
    return Array.from(this.plugins.values()).map(({ plugin, enabled }) => ({
      name: plugin.name,
      version: plugin.version,
      enabled,
    }));
  }

  private getSortedPlugins(): RegisteredPlugin[] {
    return Array.from(this.plugins.values()).sort(
      (a, b) => (b.plugin.priority ?? 0) - (a.plugin.priority ?? 0),
    );
  }
}
