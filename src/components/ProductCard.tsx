import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../models';
import { getProductImageSource } from '../utils/productImage';
import { truncateProductName } from '../utils/productName';

const DEFAULT_PRODUCT_IMAGE = require('../../assets/agua-sanitaria.png');

/** Tamanho da imagem = size - 24; altura mínima do card = imageSize + 64 */
function cardDimensions(size: number) {
  const imageSize = size - 24;
  const cardMinHeight = imageSize + 64;
  return { imageSize, cardMinHeight };
}

interface CartButtonsOverlayProps {
  product: ProductWithFinalPrice;
  cartQty: number;
  onQuickAdd: () => void;
  onQuantityChange: (newQty: number, e?: any) => void;
}

const CartButtonsOverlay: React.FC<CartButtonsOverlayProps> = ({
  product,
  cartQty,
  onQuickAdd,
  onQuantityChange,
}) => {
  if (cartQty === 0) {
    return (
      <Pressable
        style={(state: { pressed: boolean; hovered?: boolean }) => [
          styles.quickAddButtonOverlay,
          state.hovered && styles.quickAddButtonOverlayHover,
        ]}
        onPress={(e) => {
          e?.stopPropagation?.();
          onQuickAdd();
        }}
      >
        <Plus size={18} color="#fff" />
      </Pressable>
    );
  }
  return (
    <View style={styles.quantityControlOverlay}>
      <View style={styles.quantityControlWrap}>
        <TouchableOpacity
          style={styles.quantityControlButton}
          onPress={(e) => onQuantityChange(cartQty - 1, e)}
        >
          <Minus size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.quantityControlValue}>{cartQty}</Text>
        <TouchableOpacity
          style={styles.quantityControlButton}
          onPress={(e) => onQuantityChange(cartQty + 1, e)}
          disabled={cartQty >= product.stock}
        >
          <Plus size={16} color={cartQty >= product.stock ? '#888' : '#fff'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export interface ProductCardProps {
  product: ProductWithFinalPrice;
  cartQty: number;
  /** Largura do card (itemSize). Imagem = size - 24. */
  size: number;
  isMobile?: boolean;
  onPress: (product: ProductWithFinalPrice) => void;
  onQuickAdd: (product: ProductWithFinalPrice) => void;
  onQuantityChange: (product: ProductWithFinalPrice, newQty: number, e?: any) => void;
  /** Imagem padrão quando o produto não tem imagem (require). */
  defaultImage?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQty,
  size,
  isMobile = false,
  onPress,
  onQuickAdd,
  onQuantityChange,
  defaultImage = DEFAULT_PRODUCT_IMAGE,
}) => {
  const [hovered, setHovered] = useState(false);
  const { imageSize, cardMinHeight } = cardDimensions(size);

  return (
    <View
      style={[
        styles.productCard,
        { width: size, minHeight: cardMinHeight },
        hovered && styles.productCardHover,
      ]}
      {...({
        onMouseEnter: () => setHovered(true),
        onMouseLeave: (e: any) => {
          const related = e?.nativeEvent?.relatedTarget;
          const current = e?.currentTarget;
          if (current && related && current.contains(related)) return;
          setHovered(false);
        },
      } as any)}
    >
      <TouchableOpacity
        style={styles.productCardTouchable}
        onPress={() => onPress(product)}
        activeOpacity={0.8}
      >
        <View style={[styles.imageWrapper, { width: imageSize, height: imageSize }]}>
          <Image
            source={getProductImageSource(product.images?.[0], defaultImage)}
            style={[styles.productImage, { width: imageSize, height: imageSize }]}
            resizeMode="cover"
          />
          <CartButtonsOverlay
            product={product}
            cartQty={cartQty}
            onQuickAdd={() => onQuickAdd(product)}
            onQuantityChange={(newQty, e) => onQuantityChange(product, newQty, e)}
          />
        </View>
        <View style={styles.originalPriceRow}>
          {product.discount > 0 && (
            <>
              <Text style={styles.originalPrice}>R$ {product.price.toFixed(2)} un</Text>
              <Text style={styles.discountPercent}> -{product.discount}%</Text>
            </>
          )}
        </View>
        <Text style={isMobile ? styles.productPriceMobile : styles.productPrice}>
          R$ {product.finalPrice.toFixed(2)} un
        </Text>
        <View style={styles.productNameSlot}>
          <Text
            style={isMobile ? styles.productNameMobile : styles.productName}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {truncateProductName(product.name)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  productCardHover: {
    borderColor: '#555',
  },
  productCardTouchable: {
    flex: 1,
    minWidth: 0,
  },
  imageWrapper: {
    position: 'relative',
  },
  productImage: {
    borderRadius: 6,
    marginBottom: 6,
  },
  quantityControlOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  quantityControlWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#364661',
    borderRadius: 18,
    overflow: 'hidden',
  },
  quantityControlButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControlValue: {
    fontFamily: 'BricolageGrotesque_700Bold',
    color: '#fff',
    fontSize: 13,
    minWidth: 24,
    textAlign: 'center',
  },
  quickAddButtonOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#364661',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddButtonOverlayHover: {
    backgroundColor: '#4a5d7a',
  },
  originalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    minHeight: 18,
    marginBottom: 2,
  },
  originalPrice: {
    fontFamily: 'BricolageGrotesque_400Regular',
    fontSize: 11,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  discountPercent: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 11,
    color: '#000',
    backgroundColor: '#d9e7f2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#b8d4e8',
    marginLeft: 8,
  },
  productPrice: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  productPriceMobile: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 15,
    color: '#000',
    marginBottom: 2,
  },
  productNameSlot: {
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    minWidth: 0,
  },
  productName: {
    fontFamily: 'BricolageGrotesque_400Regular',
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  productNameMobile: {
    fontFamily: 'BricolageGrotesque_400Regular',
    fontSize: 15,
    color: '#333',
  },
});
