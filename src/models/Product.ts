export interface Product {
  id: string;
  marketId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  discount: number; // Percentual (0-100)
  imageUrl: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithFinalPrice extends Product {
  finalPrice: number;
}
