/** Limite de caracteres para nome do produto em cards e listas (carrinho, etc.). No modal de detalhe o nome completo é exibido. */
export const PRODUCT_NAME_MAX_LENGTH = 70;

/**
 * Trunca o nome do produto para exibição em cards e carrinho.
 * Acima do limite retorna "...". No modal de produto use o nome completo (product.name).
 */
export function truncateProductName(name: string, maxLength: number = PRODUCT_NAME_MAX_LENGTH): string {
  if (!name || name.length <= maxLength) return name;
  return name.slice(0, maxLength).trim() + '...';
}
