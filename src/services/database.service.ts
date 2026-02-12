import { Market, Product, User, Order } from '../models';
import { MARKETS_MOCK, PRODUCTS_MOCK, USERS_MOCK, ORDERS_MOCK } from '../mocks';

class Database {
  private markets: Market[] = [...MARKETS_MOCK];
  private products: Product[] = [...PRODUCTS_MOCK];
  private users: User[] = [...USERS_MOCK];
  private orders: Order[] = [...ORDERS_MOCK];

  // Markets
  getMarkets(): Market[] {
    return [...this.markets];
  }

  getMarketById(id: string): Market | undefined {
    return this.markets.find(m => m.id === id);
  }

  // Products
  getProducts(): Product[] {
    return [...this.products];
  }

  getProductsByMarketId(marketId: string): Product[] {
    return this.products.filter(p => p.marketId === marketId);
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  createProduct(product: Product): Product {
    this.products.push(product);
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.products[index] = {
      ...this.products[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.products[index];
  }

  deleteProduct(id: string): boolean {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.products.splice(index, 1);
    return true;
  }

  // Users
  getUsers(): User[] {
    return [...this.users];
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email === email);
  }

  // Orders
  getOrders(): Order[] {
    return [...this.orders];
  }

  getOrdersByMarketId(marketId: string): Order[] {
    return this.orders.filter(o => o.marketId === marketId);
  }

  getOrdersByCustomerId(customerId: string): Order[] {
    return this.orders.filter(o => o.customerId === customerId);
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  createOrder(order: Order): Order {
    this.orders.push(order);
    return order;
  }

  updateOrder(id: string, updates: Partial<Order>): Order | null {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return null;

    this.orders[index] = {
      ...this.orders[index],
      ...updates,
    };
    return this.orders[index];
  }

  // Reset - útil para testes
  reset(): void {
    this.markets = [...MARKETS_MOCK];
    this.products = [...PRODUCTS_MOCK];
    this.users = [...USERS_MOCK];
    this.orders = [...ORDERS_MOCK];
  }
}

export const db = new Database();
