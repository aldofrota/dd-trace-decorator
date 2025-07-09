import { tracer, Span } from "dd-trace";

export type TraceOptions = {
  name?: string;
  tags?: Record<string, any>;
  includeParamsAsTags?: boolean;
  includeResultAsTag?: boolean;
  argsMap?: string[];
  defaultParamName?: string;
  // New options for granular control
  includeSpecificArgs?: number[]; // indices of arguments that should be included
  objectFieldsToInclude?: Record<number, string[]>; // argument index -> object fields to include
  excludeObjectFields?: Record<number, string[]>; // argument index -> object fields to exclude
};

// Helper function to create the method wrapper
function createMethodWrapper(
  originalMethod: Function,
  options: TraceOptions,
  className: string,
  methodName: string
): Function {
  return function (this: any, ...args: any[]) {
    const spanName = options.name || `${className}.${methodName}`;
    const staticTags = options.tags || {};
    const includeParams = options.includeParamsAsTags;
    const includeResult = options.includeResultAsTag;
    const argsMap = options.argsMap || [];
    const defaultParamName = options.defaultParamName || "content";
    const includeSpecificArgs = options.includeSpecificArgs;
    const objectFieldsToInclude = options.objectFieldsToInclude || {};
    const excludeObjectFields = options.excludeObjectFields || {};

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
            // If it's a single object, apply specific filters
            const argIndex = 0;
            const fieldsToInclude = objectFieldsToInclude[argIndex] || [];
            const fieldsToExclude = excludeObjectFields[argIndex] || [];
            
            Object.entries(args[0]).forEach(([key, value]) => {
              // Check if this field should be included/excluded
              const shouldInclude = fieldsToInclude.length === 0 || fieldsToInclude.includes(key);
              const shouldExclude = fieldsToExclude.includes(key);
              
              if (shouldInclude && !shouldExclude) {
                span.setTag(key, safeSerialize(value));
              }
            });
          } else if (args.length === 1) {
            // If it's a single argument (not object), use default name
            span.setTag(defaultParamName, safeSerialize(args[0]));
          } else {
            // If multiple arguments, apply specific filters
            args.forEach((arg, index) => {
              // Check if this argument should be included
              const shouldIncludeArg = !includeSpecificArgs || includeSpecificArgs.includes(index);
              
              if (!shouldIncludeArg) return;
              
              const tagKey = argsMap[index] || `arg${index}`;
              
              if (isPlainObject(arg)) {
                // If the argument is an object, apply specific filters
                const fieldsToInclude = objectFieldsToInclude[index] || [];
                const fieldsToExclude = excludeObjectFields[index] || [];
                
                if (fieldsToInclude.length > 0 || fieldsToExclude.length > 0) {
                  // Apply specific filters
                  Object.entries(arg).forEach(([key, value]) => {
                    const shouldInclude = fieldsToInclude.length === 0 || fieldsToInclude.includes(key);
                    const shouldExclude = fieldsToExclude.includes(key);
                    
                    if (shouldInclude && !shouldExclude) {
                      span.setTag(`${tagKey}.${key}`, safeSerialize(value));
                    }
                  });
                } else {
                  // Include all object fields
                  Object.entries(arg).forEach(([key, value]) => {
                    span.setTag(`${tagKey}.${key}`, safeSerialize(value));
                  });
                }
              } else {
                // Argument is not an object, include as simple tag
                span.setTag(tagKey, safeSerialize(arg));
              }
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
}

// Method decorator
export function TraceMethod(options: TraceOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = createMethodWrapper(
      originalMethod,
      options,
      target.constructor.name,
      propertyKey
    );
    
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
