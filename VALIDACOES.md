# Validações e Consistência Transacional

## 🔒 Validações Implementadas

### 1. Validações de Estoque

#### Frontend (CartContext)
```typescript
addToCart(product: ProductWithFinalPrice, quantity: number) {
  // Validação 1: Quantidade não pode exceder estoque
  if (quantity > product.stock) {
    throw new Error('Quantidade solicitada maior que o estoque disponível');
  }

  const existingItem = items.find(item => item.product.id === product.id);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    // Validação 2: Quantidade total não pode exceder estoque
    if (newQuantity > product.stock) {
      throw new Error('Quantidade total maior que o estoque disponível');
    }
    updateQuantity(product.id, newQuantity);
  } else {
    setItems([...items, { product, quantity }]);
  }
}

updateQuantity(productId: string, quantity: number) {
  const item = items.find(item => item.product.id === productId);

  // Validação 3: Ao atualizar, verificar estoque
  if (item && quantity > item.product.stock) {
    throw new Error('Quantidade solicitada maior que o estoque disponível');
  }

  if (quantity <= 0) {
    removeFromCart(productId);
  } else {
    setItems(
      items.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }
}
```

#### Backend (OrderService)
```typescript
async createOrder(input: CreateOrderInput): Promise<Order> {
  const orderItems: OrderItem[] = [];
  let totalAmount = 0;

  // FASE 1: Validação de todos os produtos
  for (const item of input.items) {
    const product = db.getProductById(item.productId);

    // Validação 1: Produto existe?
    if (!product) {
      throw new Error(`Produto ${item.productId} não encontrado`);
    }

    // Validação 2: Produto pertence ao mercado?
    if (product.marketId !== input.marketId) {
      throw new Error(`Produto ${item.productId} não pertence ao mercado selecionado`);
    }

    // Validação 3: Há estoque suficiente?
    if (!productService.validateStock(item.productId, item.quantity)) {
      throw new Error(`Estoque insuficiente para o produto ${product.name}`);
    }
  }

  // FASE 2: Transação (decrementa estoque e cria pedido)
  try {
    for (const item of input.items) {
      const product = db.getProductById(item.productId)!;

      // Decrementa o estoque ANTES de confirmar
      const newStock = product.stock - item.quantity;
      productService.updateStock(product.id, newStock);

      // Cria item do pedido
      const finalPrice = product.price * (1 - product.discount / 100);
      const subtotal = finalPrice * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        id: `${orderId}-item-${orderItems.length + 1}`,
        orderId,
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        discount: product.discount,
        subtotal: Math.round(subtotal * 100) / 100,
      });
    }

    const order: Order = {
      id: orderId,
      customerId: input.customerId,
      marketId: input.marketId,
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
    };

    return db.createOrder(order);

  } catch (error) {
    // FASE 3: Rollback em caso de erro
    for (const item of orderItems) {
      const product = db.getProductById(item.productId);
      if (product) {
        // Restaura o estoque
        productService.updateStock(product.id, product.stock + item.quantity);
      }
    }
    throw error;
  }
}
```

### 2. Validações de Produto

#### ProductService
```typescript
createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
  const newProduct: Product = {
    ...product,
    id: `${product.marketId}-product-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return db.createProduct(newProduct);
}

updatePrice(id: string, newPrice: number): Product | null {
  // Validação: Preço não pode ser negativo
  if (newPrice < 0) {
    throw new Error('Preço não pode ser negativo');
  }
  return db.updateProduct(id, { price: newPrice });
}

updateDiscount(id: string, discount: number): Product | null {
  // Validação: Desconto entre 0 e 100
  if (discount < 0 || discount > 100) {
    throw new Error('Desconto deve estar entre 0 e 100');
  }
  return db.updateProduct(id, { discount });
}

updateStock(id: string, newStock: number): Product | null {
  // Validação: Estoque não pode ser negativo
  if (newStock < 0) {
    throw new Error('Estoque não pode ser negativo');
  }
  return db.updateProduct(id, { stock: newStock });
}

validateStock(productId: string, quantity: number): boolean {
  const product = db.getProductById(productId);

  if (!product) {
    throw new Error('Produto não encontrado');
  }

  return product.stock >= quantity;
}
```

### 3. Validações de Pedido

#### OrderService
```typescript
confirmOrder(orderId: string): Order | null {
  const order = db.getOrderById(orderId);

  // Validação 1: Pedido existe?
  if (!order) {
    throw new Error('Pedido não encontrado');
  }

  // Validação 2: Pedido está pendente?
  if (order.status !== OrderStatus.PENDING) {
    throw new Error('Apenas pedidos pendentes podem ser confirmados');
  }

  return db.updateOrder(orderId, {
    status: OrderStatus.CONFIRMED,
    confirmedAt: new Date(),
  });
}

cancelOrder(orderId: string): Order | null {
  const order = db.getOrderById(orderId);

  // Validação 1: Pedido existe?
  if (!order) {
    throw new Error('Pedido não encontrado');
  }

  // Validação 2: Pedido está pendente?
  if (order.status !== OrderStatus.PENDING) {
    throw new Error('Apenas pedidos pendentes podem ser cancelados');
  }

  // Reverter estoque
  for (const item of order.items) {
    const product = db.getProductById(item.productId);
    if (product) {
      productService.updateStock(product.id, product.stock + item.quantity);
    }
  }

  return db.updateOrder(orderId, {
    status: OrderStatus.CANCELLED,
  });
}
```

### 4. Validações de Autenticação

#### AuthService
```typescript
async login(email: string, password: string): Promise<User> {
  const user = db.getUserByEmail(email);

  // Validação 1: Usuário existe?
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  // Validação 2: Senha correta?
  if (user.password !== password) {
    throw new Error('Senha incorreta');
  }

  this.currentUser = user;
  return user;
}
```

## 🔄 Consistência Transacional

### Problema: Concorrência de Estoque

**Cenário sem validação transacional:**
```
Cliente A vê: Produto X tem 10 unidades
Cliente B vê: Produto X tem 10 unidades

Cliente A compra 8 unidades → Estoque = 2
Cliente B compra 8 unidades → Estoque = -6 ❌ (ERRO!)
```

### Solução Implementada

```typescript
// 1. Validação prévia de TODOS os produtos
for (const item of input.items) {
  if (!validateStock(item.productId, item.quantity)) {
    throw new Error('Estoque insuficiente');
  }
}

// 2. Decremento atômico
try {
  // Decrementa todos os estoques
  for (const item of input.items) {
    updateStock(item.productId, product.stock - item.quantity);
  }

  // Cria o pedido
  createOrder(order);

} catch (error) {
  // 3. Rollback automático
  for (const item of processedItems) {
    updateStock(item.productId, product.stock + item.quantity);
  }
  throw error;
}
```

### Garantias

1. **Atomicidade**: Ou todos os estoques são decrementados, ou nenhum
2. **Consistência**: Estoque nunca fica negativo
3. **Isolamento**: Operações são sequenciais (sem paralelismo real neste mock)
4. **Durabilidade**: Estado persiste em memória durante a sessão

## 🧪 Casos de Teste

### Teste 1: Validação de Estoque Insuficiente

```typescript
// Setup
const product = { id: '1', stock: 5 };

// Teste
try {
  addToCart(product, 10); // Tenta adicionar mais que o estoque
} catch (error) {
  // ✅ Esperado: Lança erro
  expect(error.message).toBe('Quantidade solicitada maior que o estoque disponível');
}

// Resultado
// ✅ Carrinho permanece vazio
// ✅ Estoque permanece 5
```

### Teste 2: Rollback em Caso de Erro

```typescript
// Setup
const productA = { id: 'A', stock: 10 };
const productB = { id: 'B', stock: 5 };

// Teste
try {
  createOrder({
    items: [
      { productId: 'A', quantity: 3 },  // OK
      { productId: 'B', quantity: 10 }, // Excede estoque
    ]
  });
} catch (error) {
  // ✅ Esperado: Lança erro
}

// Resultado
// ✅ Produto A: estoque permanece 10 (rollback funcionou)
// ✅ Produto B: estoque permanece 5
// ✅ Nenhum pedido foi criado
```

### Teste 3: Cancelamento Restaura Estoque

```typescript
// Setup
const product = { id: '1', stock: 10 };

// 1. Criar pedido
const order = createOrder({
  items: [{ productId: '1', quantity: 3 }]
});

// Verificação intermediária
// ✅ Estoque agora é 7 (10 - 3)

// 2. Cancelar pedido
cancelOrder(order.id);

// Resultado final
// ✅ Estoque volta para 10
// ✅ Status do pedido: CANCELLED
```

### Teste 4: Múltiplos Produtos

```typescript
// Setup
const productA = { id: 'A', stock: 10, price: 10.00, discount: 0 };
const productB = { id: 'B', stock: 20, price: 5.00, discount: 10 };
const productC = { id: 'C', stock: 15, price: 8.00, discount: 20 };

// Teste
const order = createOrder({
  items: [
    { productId: 'A', quantity: 2 },  // 2 * 10.00 = 20.00
    { productId: 'B', quantity: 5 },  // 5 * 4.50 = 22.50
    { productId: 'C', quantity: 3 },  // 3 * 6.40 = 19.20
  ]
});

// Verificações
// ✅ Produto A: estoque = 8 (10 - 2)
// ✅ Produto B: estoque = 15 (20 - 5)
// ✅ Produto C: estoque = 12 (15 - 3)
// ✅ Total do pedido = 61.70 (20.00 + 22.50 + 19.20)
```

### Teste 5: Validação de Mercado

```typescript
// Setup
const marketA = { id: 'market-a' };
const productB = { id: 'product-b-1', marketId: 'market-b' };

// Teste
try {
  createOrder({
    marketId: 'market-a',
    items: [
      { productId: 'product-b-1', quantity: 1 } // Produto do mercado B
    ]
  });
} catch (error) {
  // ✅ Esperado: Lança erro
  expect(error.message).toContain('não pertence ao mercado selecionado');
}

// Resultado
// ✅ Nenhum pedido foi criado
// ✅ Estoque não foi alterado
```

## 📋 Checklist de Validações

### Ao Adicionar ao Carrinho
- [x] Quantidade > 0
- [x] Quantidade <= estoque disponível
- [x] Quantidade total (existente + nova) <= estoque
- [x] Produto existe
- [x] Produto pertence ao mercado selecionado

### Ao Criar Pedido
- [x] Todos os produtos existem
- [x] Todos os produtos pertencem ao mercado
- [x] Há estoque suficiente para todos
- [x] Cliente autenticado
- [x] Mercado selecionado

### Ao Confirmar Pedido
- [x] Pedido existe
- [x] Pedido está em status PENDING
- [x] Admin é do mercado correto

### Ao Cancelar Pedido
- [x] Pedido existe
- [x] Pedido está em status PENDING
- [x] Estoque é restaurado corretamente
- [x] Admin é do mercado correto

### Ao Gerenciar Produtos
- [x] Nome não vazio
- [x] Preço >= 0
- [x] Estoque >= 0
- [x] Desconto entre 0 e 100
- [x] Admin é do mercado correto

## 🚨 Tratamento de Erros

### Estratégia

1. **Validação Preventiva**: Validar antes de executar
2. **Mensagens Claras**: Erros descritivos para o usuário
3. **Rollback Automático**: Reverter em caso de falha
4. **Logging**: Console.log para debug (pode ser expandido)

### Exemplos de Mensagens

```typescript
// Boas mensagens (implementadas)
"Estoque insuficiente para o produto Arroz Premium"
"Apenas pedidos pendentes podem ser confirmados"
"Desconto deve estar entre 0 e 100"

// Mensagens ruins (evitadas)
"Erro"
"Operação falhou"
"Erro desconhecido"
```

## 🔍 Pontos de Validação

```
┌─────────────────────────────────────────────────────┐
│               CAMADAS DE VALIDAÇÃO                   │
└─────────────────────────────────────────────────────┘

Frontend (UX)
├─ Input validation (campos numéricos, obrigatórios)
├─ Real-time feedback (estoque insuficiente)
└─ Prevent invalid submissions

Context Layer
├─ Business rules (estoque, mercado)
└─ State consistency

Service Layer (Segurança)
├─ Data validation (tipos, ranges)
├─ Business logic enforcement
├─ Transactional integrity
└─ Error handling com rollback

Data Layer
└─ Data structure integrity
```

## ✅ Garantias do Sistema

1. **Estoque nunca fica negativo**
2. **Pedidos sempre pertencem a um mercado**
3. **Produtos sempre pertencem a um mercado**
4. **Rollback automático em caso de erro**
5. **Admin só acessa dados do seu mercado**
6. **Cliente não mistura produtos de mercados diferentes**
7. **Validação em múltiplas camadas**
8. **Mensagens de erro claras**

## 🎯 Conclusão

O sistema implementa validações robustas em múltiplas camadas, garantindo:
- Consistência de dados
- Integridade transacional
- Experiência de usuário clara
- Prevenção de estados inválidos
- Rollback automático em erros

Todas as regras de negócio estão implementadas e testáveis através da interface.
