# DD-Trace Decorator

Decorator to facilitate tracing with Datadog in TypeScript applications, supporting both method and class decorators.

## Prerequisites

Make sure you have Datadog configured in your environment to validate the tracing functionality.

## Installation

### Install the library

```bash
npm install @aldofrota/dd-trace-decorator
```

## Usage

### Method Decorator

The `@TraceMethod` decorator can be applied to individual methods to add specific tracing.

#### Basic Configuration

```typescript
import { TraceMethod } from "@aldofrota/dd-trace-decorator";

export class UserService {
  @TraceMethod({
    includeParamsAsTags: true,
    includeResultAsTag: true,
  })
  async createUser(user: any): Promise<any> {
    return { id: 123, name: user.name };
  }
}
```

#### Advanced Configuration

```typescript
@TraceMethod({
  name: "custom.span.name",
  includeParamsAsTags: true,
  includeSpecificArgs: [0], // Only the first argument
  objectFieldsToInclude: {
    0: ["id", "status"], // Only specific fields from the first argument
  },
  excludeObjectFields: {
    0: ["password", "secret"], // Exclude sensitive fields
  },
  argsMap: ["user", "role", "config"], // Custom names for arguments
  tags: {
    "custom.tag": "value",
  },
})
async createUser(user: any, role: string, config: any): Promise<any> {
  // ...
}
```

### Class Decorator

The `@TraceClass` decorator automatically applies tracing to all methods in the class, except the constructor.

#### Basic Configuration

```typescript
import { TraceClass } from "@aldofrota/dd-trace-decorator";

@TraceClass({
  includeParamsAsTags: true,
  includeResultAsTag: true,
})
export class UserService {
  async createUser(user: any): Promise<any> {
    return { id: 123, name: user.name };
  }

  async updateUser(id: number, user: any): Promise<any> {
    return { id, ...user };
  }

  async deleteUser(id: number): Promise<void> {
    // Delete logic
  }
}
```

#### Combining Decorators

You can combine the class decorator with method decorators to override specific configurations:

```typescript
@TraceClass({
  includeParamsAsTags: true,
  includeResultAsTag: true,
})
export class UserService {
  // Uses class configurations
  async createUser(user: any): Promise<any> {
    return { id: 123, name: user.name };
  }

  // Overrides with specific configurations
  @TraceMethod({
    name: "user.update",
    includeParamsAsTags: false,
    tags: {
      "operation": "update",
      "priority": "high"
    }
  })
  async updateUser(id: number, user: any): Promise<any> {
    return { id, ...user };
  }
}
```

## Decorator Options

### Common Options

- `name`: Custom span name
- `tags`: Additional static tags
- `includeParamsAsTags`: Include parameters as tags
- `includeResultAsTag`: Include result as tag
- `argsMap`: Name mapping for arguments
- `includeSpecificArgs`: Indices of arguments to include
- `objectFieldsToInclude`: Specific fields of objects by index
- `excludeObjectFields`: Fields to exclude by index

### Decorator Behavior

#### Method Decorator (`@TraceMethod`)
- Applies tracing only to the decorated method
- Allows specific configurations per method
- Supports all configuration options

#### Class Decorator (`@TraceClass`)
- Automatically applies tracing to all methods in the class
- Excludes the constructor from application
- Can be overridden by method decorators
- Uses basic configurations by default

## Data Handling

### Safe Serialization
- Objects are serialized safely
- Sensitive fields can be excluded
- Arrays and nested objects are supported
- `undefined` and `null` values are handled appropriately

### Error Handling
- Errors are captured and added as tags
- The span is properly finalized even in case of error
- Stack traces are included when available

### Performance
- Decorators are applied at compile time
- Minimal runtime overhead
- Spans are automatically finalized

## Testing

Run tests with:

```bash
npm test
```

Tests cover:
- Method and class decorators
- Advanced configurations
- Error handling
- Data serialization
- Performance and async behavior
- Parameter inclusion and exclusion
- Object field filtering
- Span naming and tagging
- Constructor exclusion in class decorators
- Decorator combination and override behavior
