import { ProductImageSource } from '../models';

export type ImageSourceProp = { uri: string } | number;

/** Valor usado no mock para "usar imagem padrão" (resolvida com require no componente). */
export const DEFAULT_IMAGE_KEY = 'default';

/**
 * Converte ProductImageSource (string | number) para o formato aceito por <Image source={...} />.
 * Use fallback quando o produto não tiver imagem ou quando for DEFAULT_IMAGE_KEY.
 */
export function getProductImageSource(
  src: ProductImageSource | undefined,
  fallback: number
): ImageSourceProp {
  if (src === undefined || src === DEFAULT_IMAGE_KEY) {
    return fallback;
  }

  if (typeof src === 'number') {
    return src;
  }

  if (typeof src === 'string') {
    return { uri: src };
  }

  if (typeof src === 'object' && src !== null && 'uri' in src) {
    return src as ImageSourceProp;
  }

  return fallback;
}
