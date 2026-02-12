import { Order, OrderItem, OrderStatus, Product } from '../models';
import { db } from './database.service';
import { productService } from './product.service';

export interface CreateOrderInput {
  customerId: string;
  marketId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export class OrderService {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    // Validação de estoque e criação dos items
    const orderItems: OrderItem[] = [];
    let totalAmount = 0;

    // Primeira validação: verificar se todos os produtos têm estoque suficiente
    for (const item of input.items) {
      const product = db.getProductById(item.productId);

      if (!product) {
        throw new Error(`Produto ${item.productId} não encontrado`);
      }

      if (product.marketId !== input.marketId) {
        throw new Error(`Produto ${item.productId} não pertence ao mercado selecionado`);
      }

      if (!productService.validateStock(item.productId, item.quantity)) {
        throw new Error(`Estoque insuficiente para o produto ${product.name}`);
      }
    }

    // Segunda etapa: decrementar estoque e criar items (transação simulada)
    const orderId = `order-${Date.now()}`;

    try {
      for (const item of input.items) {
        const product = db.getProductById(item.productId)!;

        // Decrementa o estoque ANTES de confirmar (conforme requisito)
        const newStock = product.stock - item.quantity;
        productService.updateStock(product.id, newStock);

        // Calcula preço com desconto
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
      // Se houver erro, reverter alterações de estoque
      for (const item of orderItems) {
        const product = db.getProductById(item.productId);
        if (product) {
          productService.updateStock(product.id, product.stock + item.quantity);
        }
      }
      throw error;
    }
  }

  confirmOrder(orderId: string): Order | null {
    const order = db.getOrderById(orderId);

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

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

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

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

  getOrdersByMarket(marketId: string): Order[] {
    return db.getOrdersByMarketId(marketId);
  }

  getOrdersByCustomer(customerId: string): Order[] {
    return db.getOrdersByCustomerId(customerId);
  }

  getOrderById(orderId: string): Order | undefined {
    return db.getOrderById(orderId);
  }
}

export const orderService = new OrderService();
