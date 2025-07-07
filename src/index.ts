import { tracer, Span } from "dd-trace";

export type TraceOptions = {
  name?: string;
  tags?: Record<string, any>;
  includeParamsAsTags?: boolean;
  includeResultAsTag?: boolean;
  argsMap?: string[];
  defaultParamName?: string;
};

export function TraceDecorator(options: TraceOptions = {}) {
  return function (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor
  ) {
    // If no propertyKey, it's a class decorator
    if (!propertyKey) {
      return traceClass(target, options);
    }

    // If propertyKey exists, it's a method decorator
    return traceMethod(target, propertyKey, descriptor!, options);
  };
}

function traceClass(target: any, options: TraceOptions) {
  // Validation: argsMap should not be used in class decorators
  if (options.argsMap && options.argsMap.length > 0) {
    throw new Error(
      `@TraceDecorator: argsMap cannot be used in class decorators. ` +
        `Use argsMap only in individual method decorators. ` +
        `Class: ${target.name}`
    );
  }

  // Apply decorator to all class methods
  const methods = Object.getOwnPropertyNames(target.prototype).filter(
    (name) => name !== "constructor"
  );

  methods.forEach((methodName) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      target.prototype,
      methodName
    );
    if (descriptor && typeof descriptor.value === "function") {
      Object.defineProperty(
        target.prototype,
        methodName,
        traceMethod(target, methodName, descriptor, options)
      );
    }
  });

  return target;
}

function traceMethod(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
  options: TraceOptions
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const spanName =
      options.name || `${target.constructor.name}.${propertyKey}`;
    const staticTags = options.tags || {};
    const includeParams = options.includeParamsAsTags;
    const includeResult = options.includeResultAsTag;
    const argsMap = options.argsMap || [];
    const defaultParamName = options.defaultParamName || "content";

    const parentSpan = tracer.scope().active();
    if (!parentSpan) return originalMethod.apply(this, args);

    const span: Span = tracer.startSpan(spanName, {
      childOf: parentSpan,
      tags: staticTags,
    });

    try {
      return tracer.scope().activate(span, () => {
        if (includeParams) {
          if (args.length === 1 && isPlainObject(args[0])) {
            // If it's a single object, use object keys as tag names
            Object.entries(args[0]).forEach(([key, value]) => {
              span.setTag(key, safeSerialize(value));
            });
          } else if (args.length === 1) {
            // If it's a single argument (not object), use default name
            span.setTag(defaultParamName, safeSerialize(args[0]));
          } else {
            // If multiple arguments, use mapping or default names
            // Note: argsMap only works when decorator is on individual method
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

  return descriptor;
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
