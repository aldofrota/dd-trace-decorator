# @aldofrota/dd-trace-decorator

A TypeScript decorator to facilitate tracing with Datadog APM, allowing you to automatically add spans to your class methods.

## 📦 Installation

```bash
npm install @aldofrota/dd-trace-decorator
```

## 🚀 Usage

### Import

```typescript
import { TraceDecorator } from "@aldofrota/dd-trace-decorator";
```

### Basic Usage

#### Method Decorator

```typescript
import { TraceDecorator } from "@aldofrota/dd-trace-decorator";

class UserService {
  @TraceDecorator()
  async getUserById(id: string) {
    // Your code here
    return { id, name: "John Doe" };
  }

  @TraceDecorator()
  async createUser(userData: any) {
    // Your code here
    return { id: "123", ...userData };
  }

  @TraceDecorator()
  async updateUser(id: string, data: any) {
    // Your code here
    return { id, ...data };
  }
}
```

### Usage with Options

#### Method Decorator with Options

```typescript
class OrderService {
  @TraceDecorator({
    name: "order.create",
    tags: { service: "order-service" },
    includeParamsAsTags: true,
    includeResultAsTag: true,
  })
  async createOrder(orderData: any) {
    // Your code here
    return { orderId: "123", status: "created" };
  }

  @TraceDecorator({
    name: "order.update",
    tags: { service: "order-service" },
    includeParamsAsTags: true,
  })
  async updateOrder(id: string, data: any) {
    // Your code here
    return { id, ...data };
  }
}
```

## ⚙️ Options

| Option                | Type                  | Default                | Description                                    |
| --------------------- | --------------------- | ---------------------- | ---------------------------------------------- |
| `name`                | `string`              | `ClassName.methodName` | Custom name for the span                       |
| `tags`                | `Record<string, any>` | `{}`                   | Static tags to add to the span                 |
| `includeParamsAsTags` | `boolean`             | `false`                | Include method parameters as tags              |
| `includeResultAsTag`  | `boolean`             | `false`                | Include method result as tag                   |
| `argsMap`             | `string[]`            | `[]`                   | Custom mapping for parameter names             |
| `defaultParamName`    | `string`              | `'content'`            | Default name for single parameter (not object) |

## 📝 Examples

### Example with Custom Tags

```typescript
class PaymentService {
  @TraceDecorator({
    name: "payment.process",
    tags: {
      service: "payment-service",
      version: "1.0.0",
    },
  })
  async processPayment(paymentData: any) {
    // Payment logic
    return { success: true, transactionId: "tx_123" };
  }
}
```

### Example with Parameters as Tags

```typescript
class EmailService {
  @TraceDecorator({
    includeParamsAsTags: true,
    argsMap: ["recipient", "subject"],
  })
  async sendEmail(recipient: string, subject: string, body: string) {
    // Email sending
    return { sent: true };
  }
}
```

### Example with Result as Tag

```typescript
class DatabaseService {
  @TraceDecorator({
    includeParamsAsTags: true,
    includeResultAsTag: true
  })
  async queryDatabase(query: string) {
    // Database query
    return { rows: 10, data: [...] };
  }
}
```

### Example with Custom Default Parameter Name

```typescript
class NotificationService {
  @TraceDecorator({
    includeParamsAsTags: true,
    defaultParamName: "payload",
  })
  async sendNotification(data: any) {
    // Notification sending
    return { sent: true };
  }
}
```

## 🔄 Combined Usage

### Class + Specific Method

You can combine the class decorator with specific method decorators. The method decorator **overrides** the class configuration for that specific method.

**Behavior:**

- **Methods without individual decorator**: use class configuration
- **Methods with individual decorator**: use specific method configuration
- **Configurations are merged**: class tags + method tags

**Merging Example:**

```typescript
@TraceDecorator({
  tags: { service: "user-service" }, // Base tag
})
class UserService {
  @TraceDecorator({
    tags: { operation: "create" }, // Additional tag
  })
  async createUser(data: any) {
    // Final tags: service="user-service", operation="create"
  }
}
```

## ⚠️ Limitations

### argsMap in Class Decorators

When the decorator is applied to a class, the `argsMap` option **is not allowed** and will generate a runtime error. This happens because different methods can have different parameters.

```typescript
// ❌ Runtime error
@TraceDecorator({
  includeParamsAsTags: true,
  argsMap: ["userId", "action"], // ❌ Error: "argsMap cannot be used in class decorators"
})
class UserService {
  async getUser(id: string) {
    /* arg0="123" */
  }
  async createUser(data: any) {
    /* arg0="{...}" */
  }
}

// ✅ Works correctly
class UserService {
  @TraceDecorator({
    includeParamsAsTags: true,
    argsMap: ["userId", "action"],
  })
  async getUser(id: string) {
    /* userId="123" */
  }
}
```

## 🚨 Error Handling

The decorator includes validations that generate descriptive runtime errors:

### argsMap in Class Error

```typescript
// This code will generate an error:
@TraceDecorator({
  argsMap: ["userId", "action"], // ❌ Error!
})
class UserService {
  // ...
}

// Error: "@TraceDecorator: argsMap cannot be used in class decorators. Use argsMap only in individual method decorators. Class: UserService"
```

## 🔧 Datadog Configuration

Make sure the Datadog tracer is initialized in your application:

```typescript
import { tracer } from "dd-trace";

// Tracer initialization (usually at the beginning of the application)
tracer.init({
  service: "my-service",
  env: process.env.NODE_ENV,
});
```

## 🧪 Testing

The project includes comprehensive tests covering all decorator functionality:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

Tests cover:

- ✅ Method decorators (all options)
- ✅ Class decorators
- ✅ Combined usage (class + method)
- ✅ Error handling and validation
- ✅ Edge cases and parameter handling
- ✅ Async/sync method support

## 📋 Requirements

- Node.js 14+
- TypeScript 4.0+
- dd-trace 5.0+

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or pull requests.

## 📄 License

MIT - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Aldo Frota** - [aldofrotadev@gmail.com](mailto:aldofrotadev@gmail.com)

---

⭐ If this project was useful to you, consider giving it a star in the repository!
