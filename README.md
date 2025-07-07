# DD-Trace Decorator

Decorator para facilitar o tracing com Datadog em aplicações TypeScript.

## Configuração

### 1. TypeScript

O projeto já está configurado com suporte a decorators no `tsconfig.json`:

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

### 2. Datadog Agent Local

Para usar em ambiente local, você precisa ter o Datadog Agent rodando. Você pode usar Docker:

```bash
docker run -d --name datadog-agent \
  -p 8126:8126 \
  -e DD_APM_ENABLED=true \
  -e DD_APM_NON_LOCAL_TRAFFIC=true \
  -e DD_APM_RECEIVER_SOCKET=0.0.0.0:8126 \
  datadog/agent:latest
```

### 3. Instalação

```bash
npm install
npm run build
```

### 4. Executar Exemplo

```bash
npm run example
```

## Uso

### Configuração Básica

```typescript
import '../datadog-config'; // Importar primeiro
import { TraceDecorator } from "@aldofrota/dd-trace-decorator";

export class UserService {
  @TraceDecorator({
    includeParamsAsTags: true,
    includeResultAsTag: true,
  })
  async createUser(user: any): Promise<any> {
    return { id: 123, name: user.name };
  }
}
```

### Configurações Avançadas

```typescript
@TraceDecorator({
  name: "custom.span.name",
  includeParamsAsTags: true,
  includeSpecificArgs: [0], // Apenas o primeiro argumento
  objectFieldsToInclude: {
    0: ["id", "status"], // Apenas campos específicos do primeiro argumento
  },
  excludeObjectFields: {
    0: ["password", "secret"], // Excluir campos sensíveis
  },
  argsMap: ["user", "role", "config"], // Nomes customizados para argumentos
  tags: {
    "custom.tag": "value",
  },
})
async createUser(user: any, role: string, config: any): Promise<any> {
  // ...
}
```

## Opções do Decorator

- `name`: Nome customizado do span
- `tags`: Tags estáticas adicionais
- `includeParamsAsTags`: Incluir parâmetros como tags
- `includeResultAsTag`: Incluir resultado como tag
- `argsMap`: Mapeamento de nomes para argumentos
- `includeSpecificArgs`: Índices dos argumentos a incluir
- `objectFieldsToInclude`: Campos específicos de objetos por índice
- `excludeObjectFields`: Campos a excluir por índice

## Ambiente Local

O arquivo `datadog-config.js` está configurado para conectar ao Datadog Agent local em `host.internal.docker:8126`. Para outros ambientes, ajuste as configurações conforme necessário.
