import { trace, Span, SpanStatusCode, Tracer, context } from '@opentelemetry/api';
import { TelemetryConfig } from '../types';

let globalTracer: Tracer | null = null;

export class TracingProvider {
  private readonly config: TelemetryConfig;
  private tracer: Tracer | null = null;

  constructor(config: Partial<TelemetryConfig>) {
    this.config = {
      enabled: true,
      serviceName: 'jellytent',
      sampleRate: 0.1,
      exportInterval: 10000,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Dynamic import to avoid bundling when not used
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-base');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { SimpleSpanProcessor, BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-base');
    const { Resource } = await import('@opentelemetry/resources');
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = await import('@opentelemetry/semantic-conventions');

    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: this.config.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: '0.4.0',
    });

    const provider = new NodeTracerProvider({
      resource,
    });

    if (this.config.endpoint) {
      const exporter = new OTLPTraceExporter({
        url: this.config.endpoint,
      });

      // Use batch processor in production
      const processor = process.env['NODE_ENV'] === 'production'
        ? new BatchSpanProcessor(exporter, {
            maxQueueSize: 1000,
            scheduledDelayMillis: this.config.exportInterval,
          })
        : new SimpleSpanProcessor(exporter);

      provider.addSpanProcessor(processor);
    }

    provider.register();

    this.tracer = trace.getTracer(this.config.serviceName!, '0.4.0');
    globalTracer = this.tracer;
  }

  getTracer(): Tracer | null {
    return this.tracer;
  }

  async shutdown(): Promise<void> {
    globalTracer = null;
  }
}

export function createSpan(name: string, attributes?: Record<string, string | number | boolean>): Span | null {
  if (!globalTracer) {
    return null;
  }

  const span = globalTracer.startSpan(name, {
    attributes,
  });

  return span;
}

export function withSpan<T>(
  name: string,
  fn: (span: Span | null) => T | Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): T | Promise<T> {
  const span = createSpan(name, attributes);

  try {
    const result = fn(span);

    if (result instanceof Promise) {
      return result
        .then((value) => {
          span?.setStatus({ code: SpanStatusCode.OK });
          return value;
        })
        .catch((error) => {
          span?.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span?.recordException(error);
          throw error;
        })
        .finally(() => {
          span?.end();
        });
    }

    span?.setStatus({ code: SpanStatusCode.OK });
    span?.end();
    return result;
  } catch (error) {
    span?.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    span?.recordException(error as Error);
    span?.end();
    throw error;
  }
}

export function getCurrentSpan(): Span | undefined {
  return trace.getSpan(context.active());
}
