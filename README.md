# DD-Trace Decorator

Decorator para facilitar o tracing com Datadog em aplicações TypeScript.

## Pré-requisitos

Certifique-se de que o Datadog está configurado no seu ambiente para validar a funcionalidade de tracing.

## Instalação

### Instale a biblioteca

```bash
npm install @aldofrota/dd-trace-decorator
```

## Uso

### Decorator de Método

O decorator `@TraceMethod` pode ser aplicado a métodos individuais para adicionar tracing específico.

#### Configuração Básica

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

#### Configuração Avançada

```typescript
@TraceMethod({
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

### Opções Disponíveis

**Configurações Independentes:**

- `name`: Nome customizado do span
- `tags`: Tags estáticas adicionais
- `includeParamsAsTags`: Incluir parâmetros como tags
- `includeResultAsTag`: Incluir resultado como tag

**Configurações que dependem de `includeParamsAsTags: true`:**

- `includeParamsAsTags`: Habilita a inclusão de parâmetros como tags
- `argsMap`: Mapeamento de nomes para argumentos
- `includeSpecificArgs`: Índices dos argumentos a serem incluídos
- `objectFieldsToInclude`: Campos específicos de objetos por índice
- `excludeObjectFields`: Campos a serem excluídos por índice

### Comportamento do Decorator

O decorator `@TraceMethod`:

- Aplica tracing apenas ao método decorado
- Permite configurações específicas por método
- Suporta todas as opções de configuração
- Funciona com métodos síncronos e assíncronos

### Configurações Detalhadas

#### Configurações Básicas

**`name`**: Define um nome customizado para o span

```typescript
@TraceMethod({ name: "custom.operation.name" })
method() { /* ... */ }
```

**`tags`**: Adiciona tags estáticas ao span

```typescript
@TraceMethod({ 
  tags: { 
    service: "user-service", 
    version: "1.0.0" 
  } 
})
method() { /* ... */ }
```

**`includeParamsAsTags`**: Habilita a inclusão de parâmetros como tags

```typescript
@TraceMethod({ includeParamsAsTags: true })
method(user: any) { /* ... */ }
// Resultado: user = { id: 123, name: "John" }
```

**`includeResultAsTag`**: Inclui o resultado do método como tag

```typescript
@TraceMethod({ includeResultAsTag: true })
method() { return { success: true }; }
// Resultado: result = {"success":true}
```

#### Configurações de Parâmetros

**`argsMap`**: Define nomes customizados para argumentos *(requer `includeParamsAsTags: true`)*

**⚠️ Importante**: O `argsMap` deve ter exatamente o mesmo número de nomes que o número de parâmetros, na ordem correta.

```typescript
@TraceMethod({
  includeParamsAsTags: true, // ← Obrigatório
  argsMap: ["user", "role", "config"] // ← Deve corresponder aos parâmetros na ordem
})
method(user: any, role: string, config: any) { /* ... */ }
// Resultado: user = {...}, role = "admin", config = {...}
```

**❌ Exemplo incorreto:**

```typescript
@TraceMethod({
  includeParamsAsTags: true,
  argsMap: ["user", "role"] // ← Faltando nome para o terceiro parâmetro
})
method(user: any, role: string, config: any) { /* ... */ }
// Resultado: user = {...}, role = "admin", config = "arg2" (nome padrão)
```

**`includeSpecificArgs`**: Inclui apenas argumentos específicos *(requer `includeParamsAsTags: true`)*

```typescript
@TraceMethod({
  includeParamsAsTags: true, // ← Obrigatório
  includeSpecificArgs: [0, 2] // Apenas primeiro e terceiro argumentos
})
method(user: any, role: string, config: any) { /* ... */ }
// Resultado: user = {...}, config = {...} (role é ignorado)
```

#### Configurações de Filtragem de Objetos

**Importante**: Estas configurações só funcionam quando `includeParamsAsTags: true`

**`objectFieldsToInclude`**: Inclui apenas campos específicos de objetos *(requer `includeParamsAsTags: true`)*

```typescript
@TraceMethod({
  includeParamsAsTags: true, // ← Obrigatório
  objectFieldsToInclude: {
    0: ["id", "name"], // Apenas id e name do primeiro argumento
    2: ["enabled"]     // Apenas enabled do terceiro argumento
  }
})
method(user: any, role: string, config: any) { /* ... */ }
// Resultado: user.id = 123, user.name = "John", config.enabled = true
```

**`excludeObjectFields`**: Exclui campos específicos de objetos *(requer `includeParamsAsTags: true`)*

```typescript
@TraceMethod({
  includeParamsAsTags: true, // ← Obrigatório
  excludeObjectFields: {
    0: ["password", "secret"], // Exclui campos sensíveis
    2: ["internal"]            // Exclui campo interno
  }
})
method(user: any, role: string, config: any) { /* ... */ }
// Resultado: todos os campos exceto password, secret e internal
```

#### Combinações Avançadas

**Filtragem completa com nomes customizados:**

```typescript
@TraceMethod({
  includeParamsAsTags: true,
  argsMap: ["user", "role", "config"],
  includeSpecificArgs: [0, 2],
  objectFieldsToInclude: {
    0: ["id", "name"],
    2: ["enabled"]
  },
  excludeObjectFields: {
    0: ["password"],
    2: ["internal"]
  }
})
method(user: any, role: string, config: any) { /* ... */ }
```

**Configuração para objeto único:**

```typescript
@TraceMethod({
  includeParamsAsTags: true,
  objectFieldsToInclude: {
    0: ["id", "name", "email"]
  },
  excludeObjectFields: {
    0: ["password", "secret"]
  }
})
createUser(user: any) { /* ... */ }
// Resultado: apenas id, name e email são incluídos como tags
```

#### Comportamentos Especiais

**Objeto único sem filtros:**

```typescript
@TraceMethod({ includeParamsAsTags: true })
createUser(user: any) { /* ... */ }
// Resultado: todos os campos do objeto são incluídos
```

**Argumento único (não objeto):**

```typescript
@TraceMethod({ 
  includeParamsAsTags: true,
  defaultParamName: "content" // Nome padrão para argumento único
})
processId(id: number) { /* ... */ }
// Resultado: content = 123
```

**Múltiplos argumentos sem filtros:**

```typescript
@TraceMethod({ includeParamsAsTags: true })
updateUser(id: number, user: any, config: any) { /* ... */ }
// Resultado: arg0 = 123, arg1 = {...}, arg2 = {...}
```

**Comportamento padrão sem `argsMap`:**

```typescript
@TraceMethod({ includeParamsAsTags: true })
method(param1: any, param2: any, param3: any) { /* ... */ }
// Resultado: arg0 = {...}, arg1 = {...}, arg2 = {...}
// Nomes padrão: arg0, arg1, arg2, etc.
```

## Manipulação de Dados

### Serialização Segura

- Objetos são serializados de forma segura
- Campos sensíveis podem ser excluídos
- Arrays e objetos aninhados são suportados
- Valores `undefined` e `null` são tratados adequadamente

### Tratamento de Erros

- Erros são capturados e adicionados como tags
- O span é finalizado adequadamente mesmo em caso de erro
- Stack traces são incluídos quando disponíveis

### Performance

- Decorators são aplicados em tempo de compilação
- Overhead mínimo em runtime
- Spans são finalizados automaticamente

#### 1. Overhead por Chamada de Método

- **Criação do span**: ~1-5μs (microssegundos)
- **Serialização de parâmetros**: Depende do tamanho dos dados
- **Finalização do span**: ~1-2μs

#### 2. Impactos Específicos

**Baixo impacto:**

- Métodos simples com poucos parâmetros
- Objetos pequenos
- Chamadas síncronas

**Impacto moderado:**

- Objetos grandes (serialização JSON)
- Muitos parâmetros
- Arrays complexos

**Alto impacto:**

- Objetos circulares (requer tratamento especial)
- Dados muito grandes
- Chamadas muito frequentes

#### 3. Recomendações

**Use em:**

- Métodos críticos para observabilidade
- APIs importantes
- Métodos com lógica complexa

**Evite em:**

- Métodos chamados milhares de vezes por segundo
- Loops internos muito frequentes
- Métodos com objetos muito grandes

#### 4. Benchmark Simples

```typescript
// Método sem decorator: ~0.001ms
// Método com decorator: ~0.005ms
// Overhead: ~0.004ms por chamada
```
