# Arquitetura da Aplicação

## Visão Geral

Esta aplicação segue uma arquitetura em camadas com separação clara de responsabilidades:

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                  │
│  (Screens, Components, Navigation)               │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐              │
│  │   Customer  │  │    Admin     │              │
│  │   Screens   │  │   Screens    │              │
│  └─────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              State Management                    │
│            (Context API)                         │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ AuthContext  │  │ CartContext  │             │
│  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Business Logic Layer                │
│                 (Services)                       │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Auth    │ │ Product  │ │  Order   │        │
│  │ Service  │ │ Service  │ │ Service  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                   │
│  ┌──────────┐ ┌──────────────────────┐          │
│  │ Report   │ │     Database         │          │
│  │ Service  │ │     Service          │          │
│  └──────────┘ └──────────────────────┘          │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Data Layer                          │
│           (Models & Mocks)                       │
│                                                   │
│  ┌────────┐ ┌─────────┐ ┌──────┐ ┌───────┐     │
│  │ Market │ │ Product │ │ User │ │ Order │     │
│  └────────┘ └─────────┘ └──────┘ └───────┘     │
└─────────────────────────────────────────────────┘
```

## Fluxo de Dados

### Fluxo de Autenticação

```
LoginScreen
    │
    ├─> AuthContext.login(email, password)
    │
    └─> AuthService.login()
        │
        └─> DatabaseService.getUserByEmail()
            │
            └─> USERS_MOCK
```

### Fluxo de Compra (Cliente)

```
MarketSelectionScreen
    │
    ├─> CartContext.setMarket(marketId)
    │
    └─> ProductsScreen
        │
        ├─> ProductService.getProductsByMarket()
        │   │
        │   └─> DatabaseService.getProductsByMarketId()
        │
        └─> ProductDetailScreen
            │
            ├─> CartContext.addToCart(product, quantity)
            │   │
            │   └─> Validação de estoque
            │
            └─> CartScreen
                │
                └─> OrderService.createOrder()
                    │
                    ├─> Validação de estoque (todos os produtos)
                    │
                    ├─> ProductService.updateStock() ⚠️ Decrementa ANTES
                    │
                    ├─> DatabaseService.createOrder()
                    │
                    └─> Em caso de erro: Rollback de estoque
```

### Fluxo de Gestão (Admin)

```
AdminDashboardScreen
    │
    ├─> ManageProductsScreen
    │   │
    │   ├─> ProductService.getProductsByMarket()
    │   │
    │   ├─> AddProductScreen
    │   │   └─> ProductService.createProduct()
    │   │
    │   └─> EditProductScreen
    │       └─> ProductService.updateProduct()
    │
    ├─> PendingOrdersScreen
    │   │
    │   ├─> OrderService.getOrdersByMarket()
    │   │
    │   ├─> OrderService.confirmOrder()
    │   │   └─> DatabaseService.updateOrder(status: CONFIRMED)
    │   │
    │   └─> OrderService.cancelOrder()
    │       ├─> ProductService.updateStock() ⚠️ Restaura estoque
    │       └─> DatabaseService.updateOrder(status: CANCELLED)
    │
    └─> ReportsScreen
        └─> ReportService.generateMarketReport()
            │
            └─> Agregação de dados de pedidos confirmados
```

## Validações de Estoque

### Frontend (Dupla Camada)

1. **CartContext**
   ```typescript
   addToCart(product, quantity) {
     if (quantity > product.stock) {
       throw new Error('Quantidade maior que estoque');
     }
   }
   ```

2. **ProductDetailScreen**
   ```typescript
   handleAddToCart() {
     if (qty > product.stock) {
       Alert.alert('Erro', 'Estoque insuficiente');
       return;
     }
   }
   ```

### Backend (Transacional)

```typescript
// order.service.ts
async createOrder(input) {
  // 1. Validação prévia
  for (const item of input.items) {
    if (!validateStock(item.productId, item.quantity)) {
      throw new Error('Estoque insuficiente');
    }
  }

  // 2. Transação (simulada)
  try {
    // Decrementa estoque
    for (const item of input.items) {
      updateStock(item.productId, product.stock - item.quantity);
    }

    // Cria pedido
    createOrder(order);

  } catch (error) {
    // 3. Rollback em caso de erro
    for (const item of processedItems) {
      updateStock(item.productId, product.stock + item.quantity);
    }
    throw error;
  }
}
```

## Padrões de Design Utilizados

### 1. Service Pattern
Toda a lógica de negócio está encapsulada em serviços:
- `AuthService`: Autenticação
- `ProductService`: Gestão de produtos
- `OrderService`: Gestão de pedidos
- `ReportService`: Geração de relatórios
- `DatabaseService`: Acesso aos dados

### 2. Context Pattern
Estado global gerenciado via Context API:
- `AuthContext`: Usuário autenticado
- `CartContext`: Carrinho de compras

### 3. Repository Pattern (Simplificado)
`DatabaseService` atua como um repositório centralizado:
```typescript
class Database {
  private markets: Market[]
  private products: Product[]
  private users: User[]
  private orders: Order[]

  getMarkets(): Market[]
  getProductsByMarketId(id): Product[]
  // ...
}
```

### 4. Provider Pattern
Providers encapsulam os Contexts:
```tsx
<AuthProvider>
  <CartProvider>
    <App />
  </CartProvider>
</AuthProvider>
```

## Segurança e Validações

### Validações Implementadas

1. **Autenticação**
   - Email e senha obrigatórios
   - Verificação de credenciais

2. **Estoque**
   - Quantidade não pode exceder estoque
   - Validação em múltiplas camadas
   - Transação com rollback

3. **Pedidos**
   - Produtos devem pertencer ao mercado
   - Apenas pedidos PENDING podem ser modificados
   - Validação de status

4. **Produtos**
   - Preço não pode ser negativo
   - Desconto entre 0-100%
   - Estoque não pode ser negativo

### Tratamento de Erros

```typescript
try {
  await orderService.createOrder(input);
} catch (error) {
  Alert.alert('Erro', error.message);
  // Estoque já foi revertido automaticamente
}
```

## Consistência de Dados

### Regras ACID (Simuladas)

1. **Atomicity**: Todas as operações de estoque são revertidas em caso de erro
2. **Consistency**: Validações garantem que dados sempre estão em estado válido
3. **Isolation**: Operações são sequenciais (sem concorrência real)
4. **Durability**: Estado persiste em memória durante sessão

### Decremento de Estoque

**Importante**: O estoque é decrementado ANTES da confirmação do admin.

**Justificativa**:
- Evita venda duplicada do mesmo produto
- Garante que o estoque reservado não seja vendido novamente
- Admin pode cancelar e estoque será restaurado automaticamente

**Fluxo**:
```
Cliente finaliza pedido
  ↓
Estoque decrementado ✓
  ↓
Pedido PENDING
  ↓
┌─────────────────┐
│ Admin confirma  │ → Status: CONFIRMED (estoque já estava decrementado)
└─────────────────┘
       OU
┌─────────────────┐
│ Admin cancela   │ → Status: CANCELLED + Estoque restaurado
└─────────────────┘
```

## Extensibilidade

A arquitetura permite fácil extensão:

### Adicionar novo tipo de usuário
1. Adicionar role em `UserRole`
2. Criar novo Navigator
3. Atualizar `AppNavigator`

### Adicionar persistência real
1. Substituir `DatabaseService` por implementação com SQLite/AsyncStorage
2. Serviços permanecem inalterados (mesma interface)

### Adicionar backend real
1. Criar `ApiService`
2. Atualizar serviços para usar API
3. Manter validações no frontend

## Performance

### Otimizações Implementadas

1. **Memoização de cálculos**
   - Preço final calculado apenas quando necessário
   - Relatórios agregados sob demanda

2. **Filtragem eficiente**
   - Filtros aplicados apenas quando texto muda
   - Debounce pode ser adicionado facilmente

3. **Navegação otimizada**
   - Stack Navigator para histórico natural
   - Telas desmontadas quando não visíveis

### Melhorias Possíveis

- Virtualização de listas longas (FlatList já implementa)
- Cache de produtos por mercado
- Paginação de produtos
- Debounce na busca
- Lazy loading de imagens
