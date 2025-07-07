import { tracer, Span } from "dd-trace";

export type TraceOptions = {
  name?: string;
  tags?: Record<string, any>;
  includeParamsAsTags?: boolean;
  includeResultAsTag?: boolean;
  argsMap?: string[];
};

export function TraceDecorator(options: TraceOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const spanName =
        options.name || `${target.constructor.name}.${propertyKey}`;
      const staticTags = options.tags || {};
      const includeParams = options.includeParamsAsTags;
      const includeResult = options.includeResultAsTag;
      const argsMap = options.argsMap || [];

      const parentSpan = tracer.scope().active();
      if (!parentSpan) return originalMethod.apply(this, args);

      const span: Span = tracer.startSpan(spanName, {
        childOf: parentSpan,
        tags: staticTags,
      });

      const run = () => {
        try {
          return tracer.scope().activate(span, () => {
            if (includeParams) {
              if (args.length === 1 && isPlainObject(args[0])) {
                Object.entries(args[0]).forEach(([key, value]) => {
                  span.setTag(key, safeSerialize(value));
                });
              } else {
                args.forEach((arg, index) => {
                  const tagKey = argsMap[index] || `arg${index}`;
                  span.setTag(tagKey, safeSerialize(arg));
                });
              }
            }

            const result = originalMethod.apply(this, args);

            if (isPromise(result)) {
              return result
                .then((res) => {
                  if (includeResult) {
                    span.setTag("result", safeSerialize(res));
                  }
                  return res;
                })
                .catch((err) => {
                  setErrorTags(span, err);
                  throw err;
                })
                .finally(() => {
                  span.finish();
                });
            } else {
              if (includeResult) {
                span.setTag("result", safeSerialize(result));
              }
              return result;
            }
          });
        } catch (err) {
          setErrorTags(span, err);
          throw err;
        } finally {
          if (!isPromise(originalMethod)) {
            span.finish();
          }
        }
      };

      return run();
    };

    return descriptor;
  };
}

function isPlainObject(obj: any): obj is Record<string, any> {
  return obj !== null && typeof obj === "object" && !Array.isArray(obj);
}

function isPromise(value: any): value is Promise<any> {
  return value && typeof value.then === "function";
}

function safeSerialize(value: any): string | number | boolean {
  if (["string", "number", "boolean"].includes(typeof value)) {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function setErrorTags(span: Span, error: any) {
  span.setTag("error", true);
  span.setTag("error.message", error?.message || "Unknown error");
  span.setTag("error.stack", error?.stack || "No stack trace");
  span.setTag("error.type", error?.name || typeof error);
}
