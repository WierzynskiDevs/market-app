import { Product, ProductWithFinalPrice } from '../models';
import { db } from './database.service';

export class ProductService {
  getProductsByMarket(marketId: string): ProductWithFinalPrice[] {
    const products = db.getProductsByMarketId(marketId);
    return products.map(this.addFinalPrice);
  }

  getProductById(id: string): ProductWithFinalPrice | undefined {
    const product = db.getProductById(id);
    return product ? this.addFinalPrice(product) : undefined;
  }

  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const newProduct: Product = {
      ...product,
      id: `${product.marketId}-product-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return db.createProduct(newProduct);
  }

  updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'marketId' | 'createdAt'>>): Product | null {
    return db.updateProduct(id, updates);
  }

  updatePrice(id: string, newPrice: number): Product | null {
    if (newPrice < 0) {
      throw new Error('Preço não pode ser negativo');
    }
    return db.updateProduct(id, { price: newPrice });
  }

  updateDiscount(id: string, discount: number): Product | null {
    if (discount < 0 || discount > 100) {
      throw new Error('Desconto deve estar entre 0 e 100');
    }
    return db.updateProduct(id, { discount });
  }

  updateStock(id: string, newStock: number): Product | null {
    if (newStock < 0) {
      throw new Error('Estoque não pode ser negativo');
    }
    return db.updateProduct(id, { stock: newStock });
  }

  deleteProduct(id: string): boolean {
    return db.deleteProduct(id);
  }

  private addFinalPrice(product: Product): ProductWithFinalPrice {
    const finalPrice = product.price * (1 - product.discount / 100);
    return {
      ...product,
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  }

  validateStock(productId: string, quantity: number): boolean {
    const product = db.getProductById(productId);
    if (!product) {
      throw new Error('Produto não encontrado');
    }
    return product.stock >= quantity;
  }
}

export const productService = new ProductService();
