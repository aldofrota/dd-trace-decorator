# @aldofrota/dd-trace-decorator

Um decorator TypeScript para facilitar o tracing com Datadog APM, permitindo adicionar spans automaticamente aos métodos de suas classes.

## 📦 Instalação

```bash
npm install @aldofrota/dd-trace-decorator
```

## 🚀 Uso

### Importação

```typescript
import { TraceDecorator } from "@aldofrota/dd-trace-decorator";
```

### Uso Básico

```typescript
import { TraceDecorator } from "@aldofrota/dd-trace-decorator";

class UserService {
  @TraceDecorator()
  async getUserById(id: string) {
    // Seu código aqui
    return { id, name: "John Doe" };
  }
}
```

### Uso com Opções

```typescript
class OrderService {
  @TraceDecorator({
    name: "order.create",
    tags: { service: "order-service" },
    includeParamsAsTags: true,
    includeResultAsTag: true,
  })
  async createOrder(orderData: any) {
    // Seu código aqui
    return { orderId: "123", status: "created" };
  }
}
```

## ⚙️ Opções

| Opção                 | Tipo                  | Padrão                 | Descrição                                          |
| --------------------- | --------------------- | ---------------------- | -------------------------------------------------- |
| `name`                | `string`              | `ClassName.methodName` | Nome personalizado para o span                     |
| `tags`                | `Record<string, any>` | `{}`                   | Tags estáticas para adicionar ao span              |
| `includeParamsAsTags` | `boolean`             | `false`                | Incluir parâmetros do método como tags             |
| `includeResultAsTag`  | `boolean`             | `false`                | Incluir o resultado do método como tag             |
| `argsMap`             | `string[]`            | `[]`                   | Mapeamento personalizado para nomes dos parâmetros |

## 📝 Exemplos

### Exemplo com Tags Personalizadas

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
    // Lógica de pagamento
    return { success: true, transactionId: "tx_123" };
  }
}
```

### Exemplo com Parâmetros como Tags

```typescript
class EmailService {
  @TraceDecorator({
    includeParamsAsTags: true,
    argsMap: ["recipient", "subject"],
  })
  async sendEmail(recipient: string, subject: string, body: string) {
    // Envio de email
    return { sent: true };
  }
}
```

### Exemplo com Resultado como Tag

```typescript
class DatabaseService {
  @TraceDecorator({
    includeParamsAsTags: true,
    includeResultAsTag: true
  })
  async queryDatabase(query: string) {
    // Query no banco
    return { rows: 10, data: [...] };
  }
}
```

## 🔧 Configuração do Datadog

Certifique-se de que o Datadog tracer está inicializado em sua aplicação:

```typescript
import { tracer } from "dd-trace";

// Inicialização do tracer (geralmente no início da aplicação)
tracer.init({
  service: "my-service",
  env: process.env.NODE_ENV,
});
```

## 📋 Requisitos

- Node.js 14+
- TypeScript 4.0+
- dd-trace 5.0+

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## 📄 Licença

MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**Aldo Frota** - [aldofrotadev@gmail.com](mailto:aldofrotadev@gmail.com)

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no repositório!
