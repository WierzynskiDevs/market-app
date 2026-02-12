# Guia de Uso - MarketPlace Multi-Mercado

## 🎯 Início Rápido

### 1. Executar a Aplicação

```bash
# No diretório MarketplaceApp
npm install
npm start
```

Depois escolha a plataforma:
- Pressione `a` para Android
- Pressione `i` para iOS
- Pressione `w` para Web

### 2. Primeiro Acesso

Ao abrir o app, você verá a tela de login com botões de acesso rápido.

## 👤 Testando como Cliente

### Login
Use o acesso rápido "👤 Cliente Comum" ou:
- **Email**: cliente@email.com
- **Senha**: 123456

### Passo a Passo

1. **Selecionar Mercado**
   - Após login, você verá 3 mercados disponíveis
   - Toque em qualquer um (A, B ou C)
   - ⚠️ Trocar de mercado limpa o carrinho!

2. **Buscar Produtos**
   - Use a barra de busca para filtrar por nome ou categoria
   - Cada mercado tem 100 produtos únicos

3. **Adicionar ao Carrinho**
   - Toque em um produto para ver detalhes
   - Ajuste a quantidade usando + e -
   - Ou digite diretamente
   - Toque em "Adicionar ao Carrinho"
   - ✅ Sistema valida se há estoque

4. **Ver Carrinho**
   - Toque no botão "Carrinho (X)" no topo
   - Ajuste quantidades
   - Remova itens se necessário
   - Veja o total

5. **Finalizar Pedido**
   - No carrinho, toque em "Finalizar Pedido"
   - ⚠️ **Importante**: O estoque é decrementado imediatamente!
   - Você receberá o número do pedido
   - Status inicial: PENDING (aguardando confirmação do admin)

## 🛒 Testando como Administrador

### Login
Use um dos acessos rápidos de admin ou:

**Admin Mercado A**
- **Email**: admin.a@email.com
- **Senha**: 123456

**Admin Mercado B**
- **Email**: admin.b@email.com
- **Senha**: 123456

**Admin Mercado C**
- **Email**: admin.c@email.com
- **Senha**: 123456

### Funcionalidades

#### 1. Gerenciar Produtos

**Listar Produtos**
- Dashboard → "Gerenciar Produtos"
- Veja todos os produtos do seu mercado
- Informações: nome, categoria, preço, desconto, estoque

**Adicionar Produto**
- Toque no botão "+ Novo"
- Preencha os campos:
  - Nome * (obrigatório)
  - Descrição
  - Categoria
  - Preço * (obrigatório)
  - Estoque * (obrigatório)
  - Desconto % (opcional, 0-100)
- Toque em "Cadastrar Produto"

**Editar Produto**
- Na lista, toque em "Editar"
- Altere os campos desejados:
  - Nome
  - Descrição
  - Categoria
  - Preço
  - Estoque
  - Desconto
- Toque em "Salvar Alterações"

**Excluir Produto**
- Na lista, toque em "Excluir"
- Confirme a exclusão
- ⚠️ Ação irreversível!

#### 2. Gerenciar Pedidos

**Ver Pedidos Pendentes**
- Dashboard → "Pedidos Pendentes"
- Veja todos os pedidos com status PENDING
- Informações:
  - Número do pedido
  - Data/hora
  - Itens (produtos, quantidades, preços)
  - Total

**Confirmar Pedido**
- Toque em "Confirmar"
- Pedido muda para status CONFIRMED
- ✅ Estoque já foi decrementado (quando cliente finalizou)

**Cancelar Pedido**
- Toque em "Cancelar"
- Confirme o cancelamento
- Pedido muda para status CANCELLED
- ✅ **Estoque é restaurado automaticamente!**

#### 3. Visualizar Relatórios

**Acessar Relatórios**
- Dashboard → "Relatórios"

**Métricas Disponíveis**

*Resumo Geral:*
- Receita Total (apenas pedidos confirmados)
- Total de Pedidos
- Pedidos Confirmados (verde)
- Pedidos Pendentes (laranja)
- Pedidos Cancelados (vermelho)
- Itens Vendidos
- Ticket Médio

*Produtos Mais Vendidos:*
- Ranking dos produtos
- Quantidade vendida
- Receita gerada por produto

## 🧪 Cenários de Teste

### Cenário 1: Fluxo Completo de Compra

1. **Login como cliente**
2. **Selecione Mercado A**
3. **Busque por "Arroz"**
4. **Adicione 3 unidades ao carrinho**
5. **Adicione outros produtos**
6. **Vá ao carrinho**
7. **Finalize o pedido**
8. **Anote o número do pedido**
9. **Faça logout** (botão Sair)
10. **Login como Admin Mercado A**
11. **Vá em "Pedidos Pendentes"**
12. **Confirme o pedido**
13. **Vá em "Relatórios"**
14. **Veja as estatísticas atualizadas**

### Cenário 2: Validação de Estoque

1. **Login como cliente**
2. **Selecione qualquer mercado**
3. **Encontre um produto com estoque baixo**
4. **Tente adicionar mais que o estoque**
   - ❌ Deve mostrar erro
5. **Adicione quantidade válida**
6. **No carrinho, tente aumentar além do estoque**
   - ❌ Deve mostrar erro

### Cenário 3: Cancelamento e Restauração de Estoque

1. **Login como cliente**
2. **Anote o estoque de um produto** (ex: Produto X tem 45 unidades)
3. **Adicione 10 unidades ao carrinho**
4. **Finalize o pedido**
5. **Volte à lista de produtos**
   - ✅ Estoque agora é 35 unidades (45 - 10)
6. **Logout e login como admin**
7. **Vá em "Pedidos Pendentes"**
8. **Cancele o pedido recém-criado**
9. **Logout e login como cliente**
10. **Volte ao produto**
    - ✅ Estoque voltou para 45 unidades!

### Cenário 4: Gestão de Produtos

1. **Login como Admin Mercado B**
2. **Vá em "Gerenciar Produtos"**
3. **Toque em "+ Novo"**
4. **Cadastre um produto**:
   - Nome: "Produto Teste Premium"
   - Categoria: "Alimentos"
   - Preço: 25.90
   - Estoque: 50
   - Desconto: 15
5. **Volte à lista**
   - ✅ Produto aparece na lista
6. **Toque em "Editar" no produto**
7. **Altere o desconto para 25%**
8. **Salve**
9. **Logout e login como cliente**
10. **Vá ao Mercado B**
11. **Busque "Produto Teste Premium"**
    - ✅ Deve aparecer com 25% de desconto
12. **Veja o preço riscado e o preço final**

### Cenário 5: Múltiplos Pedidos

1. **Login como cliente**
2. **Crie 3 pedidos em mercados diferentes**
3. **Login como Admin Mercado A**
   - ✅ Vê apenas pedidos do Mercado A
4. **Login como Admin Mercado B**
   - ✅ Vê apenas pedidos do Mercado B
5. **Login como Admin Mercado C**
   - ✅ Vê apenas pedidos do Mercado C

### Cenário 6: Trocar de Mercado (Limpa Carrinho)

1. **Login como cliente**
2. **Vá ao Mercado A**
3. **Adicione produtos ao carrinho**
4. **Veja que tem itens no carrinho**
5. **Volte (botão voltar)**
6. **Selecione Mercado B**
   - ⚠️ Carrinho é limpo automaticamente!
   - ✅ Isso evita misturar produtos de mercados diferentes

## 📊 Interpretando Relatórios

### Receita Total
Soma do valor de todos os pedidos **confirmados**.
- Pedidos pendentes NÃO contam
- Pedidos cancelados NÃO contam

### Ticket Médio
Receita Total ÷ Número de Pedidos Confirmados

### Produtos Mais Vendidos
Ordenado por quantidade vendida (decrescente).
Mostra:
- Ranking (#1, #2, #3...)
- Nome do produto
- Quantidade total vendida
- Receita total gerada

## ⚠️ Pontos Importantes

1. **Estoque é decrementado ao finalizar pedido**
   - Não espera confirmação do admin
   - Evita venda duplicada

2. **Cancelar pedido restaura estoque**
   - Automático
   - Transacional (se falhar, não cancela)

3. **Admin só vê seu mercado**
   - Admin A não vê produtos/pedidos do Mercado B

4. **Trocar de mercado limpa carrinho**
   - Não é possível comprar de múltiplos mercados simultaneamente

5. **Validação em múltiplas camadas**
   - Frontend valida (UX)
   - Backend valida (segurança)

## 🐛 Solucionando Problemas

### Produto não aparece após criar
- Verifique se está no mercado correto
- Logout e login novamente

### Estoque não atualiza
- Recarregue a tela
- Volte e entre novamente

### Pedido não aparece para admin
- Verifique se o admin é do mercado correto
- Verifique se o pedido foi finalizado (não apenas adicionado ao carrinho)

### Erro ao finalizar pedido
- Verifique se há estoque suficiente
- Verifique se está conectado
- Tente novamente

## 💡 Dicas

1. **Use acesso rápido** na tela de login para não precisar digitar
2. **Busque por categoria** para filtrar produtos similares
3. **Veja o relatório** após confirmar pedidos para ver estatísticas
4. **Teste cancelamento** para ver estoque sendo restaurado
5. **Crie produtos com desconto** para testar cálculo de preço final

## 📱 Atalhos

- **Voltar**: Botão nativo do Android ou gesture do iOS
- **Sair**: Botão no canto superior direito
- **Carrinho**: Botão no topo da lista de produtos (mostra quantidade)

## 🎓 Para Desenvolvedores

### Modificar Mocks
Edite os arquivos em `src/mocks/`:
- `markets.mock.ts` - Mercados
- `products.mock.ts` - Produtos
- `users.mock.ts` - Usuários
- `orders.mock.ts` - Pedidos iniciais

### Adicionar Validações
Veja `src/services/` para lógica de negócio:
- `product.service.ts` - Validações de produto
- `order.service.ts` - Validações de pedido

### Customizar UI
Componentes em `src/screens/`:
- `customer/` - Telas do cliente
- `admin/` - Telas do admin

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte o README.md
2. Consulte o ARCHITECTURE.md
3. Revise o código em `src/`

Boa exploração! 🚀
