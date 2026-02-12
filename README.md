# MarketPlace Multi-Mercado

Aplicação React Native de vitrine de produtos multi-mercado com gestão completa de pedidos e estoque.

## 📋 Características

### Para Clientes
- Seleção de mercado (A, B ou C)
- Visualização de produtos com filtro e busca
- Adição ao carrinho com validação de estoque
- Controle de quantidade limitada ao estoque disponível
- Finalização de pedido com decremento automático de estoque

### Para Administradores
- Cadastro, edição e exclusão de produtos
- Alteração de preços e aplicação de descontos
- Visualização de pedidos pendentes
- Confirmação ou cancelamento de pedidos
- Relatórios de vendas (entradas, saídas, valores e quantidades)

## 🏗️ Arquitetura

### Entidades Principais

1. **Market (Mercado)**
   - id, name, description, adminId

2. **Product (Produto)**
   - id, marketId, name, description, price, stock, discount, category

3. **User (Usuário)**
   - id, name, email, password, role (CUSTOMER | ADMIN), marketId

4. **Order (Pedido)**
   - id, customerId, marketId, items, totalAmount, status

5. **OrderItem (Item do Pedido)**
   - id, orderId, productId, productName, quantity, unitPrice, discount, subtotal

### Validações Implementadas

#### Frontend
- Validação de quantidade máxima (não pode exceder estoque)
- Validação de campos obrigatórios
- Validação de valores numéricos
- Feedback visual de erros

#### Backend (Services)
- Validação transacional de estoque
- Rollback automático em caso de erro
- Validação de produto pertencente ao mercado
- Validação de status de pedido antes de confirmar/cancelar

## 🚀 Como Executar

### Pré-requisitos
- Node.js 16+
- npm ou yarn
- Expo CLI

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar o servidor Expo
npm start

# Ou executar diretamente no Android
npm run android

# Ou executar diretamente no iOS (requer macOS)
npm run ios

# Ou executar no navegador
npm run web
```

## 👥 Usuários de Teste

A aplicação vem com usuários mockados para facilitar os testes:

### Cliente
- **Email**: cliente@email.com
- **Senha**: 123456
- **Acesso**: Visualização e compra de produtos

### Administradores

**Admin Mercado A**
- **Email**: admin.a@email.com
- **Senha**: 123456
- **Acesso**: Gestão do Mercado A

**Admin Mercado B**
- **Email**: admin.b@email.com
- **Senha**: 123456
- **Acesso**: Gestão do Mercado B

**Admin Mercado C**
- **Email**: admin.c@email.com
- **Senha**: 123456
- **Acesso**: Gestão do Mercado C

## 📊 Dados Mockados

### Mercados
- 3 mercados (A, B, C)

### Produtos
- 100 produtos por mercado (300 no total)
- Categorias variadas: Alimentos, Bebidas, Limpeza, Higiene, Padaria, Açougue, Hortifruti, Frios, Laticínios, Mercearia
- Estoque aleatório (1-100 unidades)
- Preços aleatórios (R$ 1,00 - R$ 51,00)
- Descontos aleatórios (0-30%)

## 🔄 Fluxo de Pedido

1. **Cliente seleciona um mercado**
   - Ao trocar de mercado, o carrinho é limpo

2. **Cliente adiciona produtos ao carrinho**
   - Validação de estoque em tempo real
   - Não permite quantidade maior que o disponível

3. **Cliente finaliza o pedido**
   - Validação final de estoque
   - **Estoque é decrementado imediatamente** (antes da confirmação)
   - Pedido entra no status PENDING

4. **Admin visualiza pedidos pendentes**
   - Pode confirmar ou cancelar

5. **Admin confirma pedido**
   - Status muda para CONFIRMED
   - Estoque já foi decrementado

6. **Admin cancela pedido**
   - Status muda para CANCELLED
   - **Estoque é restaurado automaticamente**

## 📂 Estrutura do Projeto

```
MarketplaceApp/
├── src/
│   ├── models/              # Interfaces TypeScript
│   │   ├── Market.ts
│   │   ├── Product.ts
│   │   ├── User.ts
│   │   └── Order.ts
│   │
│   ├── mocks/               # Dados mockados
│   │   ├── markets.mock.ts
│   │   ├── products.mock.ts
│   │   ├── users.mock.ts
│   │   └── orders.mock.ts
│   │
│   ├── services/            # Lógica de negócio
│   │   ├── database.service.ts    # Simulação de banco de dados
│   │   ├── auth.service.ts        # Autenticação
│   │   ├── product.service.ts     # Gestão de produtos
│   │   ├── order.service.ts       # Gestão de pedidos (com validação transacional)
│   │   └── report.service.ts      # Geração de relatórios
│   │
│   ├── contexts/            # Contextos React
│   │   ├── AuthContext.tsx
│   │   └── CartContext.tsx
│   │
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── customer/        # Telas do cliente
│   │   │   ├── MarketSelectionScreen.tsx
│   │   │   ├── ProductsScreen.tsx
│   │   │   ├── ProductDetailScreen.tsx
│   │   │   └── CartScreen.tsx
│   │   │
│   │   └── admin/           # Telas do administrador
│   │       ├── AdminDashboardScreen.tsx
│   │       ├── ManageProductsScreen.tsx
│   │       ├── EditProductScreen.tsx
│   │       ├── AddProductScreen.tsx
│   │       ├── PendingOrdersScreen.tsx
│   │       └── ReportsScreen.tsx
│   │
│   └── navigation/          # Navegação
│       ├── AppNavigator.tsx
│       ├── CustomerNavigator.tsx
│       └── AdminNavigator.tsx
│
└── App.tsx                  # Componente raiz
```

## 🔒 Regras de Negócio

1. **Estoque**
   - Cliente não pode selecionar quantidade maior que o estoque disponível
   - Estoque é decrementado ao criar o pedido (antes da confirmação)
   - Estoque é restaurado ao cancelar o pedido
   - Validação transacional garante consistência

2. **Pedidos**
   - Apenas pedidos PENDING podem ser confirmados ou cancelados
   - Produtos devem pertencer ao mercado selecionado
   - Validação de estoque antes de criar pedido

3. **Administração**
   - Cada mercado tem um administrador específico
   - Admin só visualiza produtos e pedidos do seu mercado
   - Preços não podem ser negativos
   - Descontos devem estar entre 0 e 100%
   - Estoque não pode ser negativo

## 🛠️ Tecnologias Utilizadas

- **React Native** - Framework mobile
- **Expo** - Plataforma de desenvolvimento
- **TypeScript** - Tipagem estática
- **React Navigation** - Navegação entre telas
- **Context API** - Gerenciamento de estado
- **Services Pattern** - Separação de lógica de negócio

## 📱 Telas Principais

### Cliente
1. Login
2. Seleção de Mercado
3. Lista de Produtos (com busca)
4. Detalhes do Produto
5. Carrinho de Compras

### Admin
1. Login
2. Dashboard
3. Gerenciar Produtos (listar, adicionar, editar, excluir)
4. Pedidos Pendentes (confirmar ou cancelar)
5. Relatórios (vendas, estoque, receita)

## 🧪 Testando o Sistema

### Cenário 1: Compra bem-sucedida
1. Login como cliente
2. Selecione um mercado
3. Adicione produtos ao carrinho
4. Finalize o pedido
5. Login como admin do mesmo mercado
6. Visualize o pedido em "Pedidos Pendentes"
7. Confirme o pedido

### Cenário 2: Validação de estoque
1. Login como cliente
2. Tente adicionar quantidade maior que o estoque
3. Observe a mensagem de erro

### Cenário 3: Cancelamento de pedido
1. Crie um pedido (como cliente)
2. Note o estoque do produto antes do pedido
3. Login como admin
4. Cancele o pedido
5. Verifique que o estoque foi restaurado

### Cenário 4: Gestão de produtos
1. Login como admin
2. Crie um novo produto
3. Edite preço e desconto
4. Visualize o produto na loja (como cliente)
5. Delete o produto

## 📈 Relatórios Disponíveis

O administrador tem acesso a:

- Receita total
- Total de pedidos (confirmados, pendentes, cancelados)
- Itens vendidos
- Ticket médio
- Produtos mais vendidos (com quantidade e receita)

## 🎯 Melhorias Futuras

- Persistência de dados (SQLite, AsyncStorage ou backend real)
- Imagens reais dos produtos
- Categorias filtráveis
- Histórico de pedidos do cliente
- Notificações push
- Pagamento integrado
- Geolocalização dos mercados
- Sistema de avaliações
- Chat entre cliente e admin
- Promoções e cupons

## 📝 Licença

Projeto de demonstração para fins educacionais.
