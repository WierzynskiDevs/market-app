import { Product } from '../models';

const categories = [
  'Alimentos',
  'Bebidas',
  'Limpeza',
  'Higiene',
  'Padaria',
  'Açougue',
  'Hortifruti',
  'Frios',
  'Laticínios',
  'Mercearia',
];

const productNames = [
  'Arroz', 'Feijão', 'Macarrão', 'Óleo', 'Açúcar', 'Sal', 'Café', 'Leite',
  'Pão', 'Manteiga', 'Queijo', 'Presunto', 'Mortadela', 'Iogurte', 'Requeijão',
  'Refrigerante', 'Suco', 'Água', 'Cerveja', 'Vinho', 'Energético',
  'Detergente', 'Sabão em Pó', 'Amaciante', 'Desinfetante', 'Água Sanitária',
  'Shampoo', 'Condicionador', 'Sabonete', 'Pasta de Dente', 'Papel Higiênico',
  'Carne Bovina', 'Frango', 'Peixe', 'Linguiça', 'Bacon',
  'Tomate', 'Alface', 'Cebola', 'Batata', 'Cenoura', 'Banana', 'Maçã', 'Laranja',
  'Biscoito', 'Chocolate', 'Bala', 'Salgadinho', 'Sorvete',
  'Farinha', 'Fermento', 'Vinagre', 'Molho de Tomate', 'Maionese', 'Mostarda',
  'Ovo', 'Margarina', 'Creme de Leite', 'Leite Condensado',
];

const prefixes = ['Premium', 'Super', 'Extra', 'Mega', 'Top', 'Master', 'Plus', 'Gold'];
const suffixes = ['Especial', 'Tradicional', 'Gourmet', 'Light', 'Diet', 'Integral', 'Natural'];

function generateRandomStock(): number {
  return Math.floor(Math.random() * 100) + 1;
}

function generateRandomPrice(): number {
  return Math.round((Math.random() * 50 + 1) * 100) / 100;
}

function generateRandomDiscount(): number {
  const hasDiscount = Math.random() > 0.7;
  return hasDiscount ? Math.floor(Math.random() * 30) : 0;
}

function generateProductName(index: number): string {
  const baseName = productNames[index % productNames.length];
  const prefix = Math.random() > 0.6 ? prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' : '';
  const suffix = Math.random() > 0.6 ? ' ' + suffixes[Math.floor(Math.random() * suffixes.length)] : '';
  return `${prefix}${baseName}${suffix}`;
}

function generateProducts(marketId: string, count: number): Product[] {
  const products: Product[] = [];

  for (let i = 0; i < count; i++) {
    products.push({
      id: `${marketId}-product-${i + 1}`,
      marketId,
      name: generateProductName(i),
      description: `Produto de qualidade para seu dia a dia`,
      price: generateRandomPrice(),
      stock: generateRandomStock(),
      discount: generateRandomDiscount(),
      imageUrl: `https://via.placeholder.com/150?text=Produto+${i + 1}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });
  }

  return products;
}

// Gerar 100 produtos para cada mercado
export const PRODUCTS_MOCK: Product[] = [
  ...generateProducts('market-a', 100),
  ...generateProducts('market-b', 100),
  ...generateProducts('market-c', 100),
];
