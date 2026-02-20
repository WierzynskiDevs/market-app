import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Plus, Minus, Trash } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../models';
import { useCart } from '../contexts/CartContext';
import { getProductImageSource } from '../utils/productImage';
import { truncateProductName } from '../utils/productName';

const DEFAULT_PRODUCT_IMAGE = require('../../assets/agua-sanitaria.png');

const DROPDOWN_MAX_HEIGHT = 380;

interface SearchSuggestionsDropdownProps {
  searchTerm: string;
  results: ProductWithFinalPrice[];
}

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsDropdownProps> = ({
  searchTerm,
  results,
}) => {
  const { items, addToCart, updateQuantity, removeFromCart } = useCart();

  const cartQtyMap = React.useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.product.id, i.quantity));
    return m;
  }, [items]);

  const handleAdd = (product: ProductWithFinalPrice) => {
    if (product.stock === 0) {
      Alert.alert('Estoque Esgotado', 'Este produto não está disponível no momento.');
      return;
    }
    try {
      addToCart(product, 1);
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Erro ao adicionar');
    }
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    const qty = cartQtyMap.get(productId) ?? 0;
    const newQty = qty + delta;
    try {
      if (newQty <= 0) removeFromCart(productId);
      else updateQuantity(productId, newQty);
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Erro');
    }
  };

  return (
    <View style={styles.dropdown}>
      <Text style={styles.title}>Sugestões</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {results.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum resultado para &quot;{searchTerm}&quot;</Text>
        ) : (
          results.map((product) => {
            const cartQty = cartQtyMap.get(product.id) ?? 0;
            const inCart = cartQty > 0;

            return (
              <View key={product.id} style={styles.row}>
                <View style={styles.imageWrap}>
                  <Image
                    source={getProductImageSource(product.images?.[0], DEFAULT_PRODUCT_IMAGE)}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {truncateProductName(product.name)}
                  </Text>
                  <Text style={styles.priceRow}>
                    R$ {product.finalPrice.toFixed(2)}
                    <Text style={styles.unit}> Un</Text>
                  </Text>
                </View>
                <View style={styles.actions}>
                  {inCart ? (
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() =>
                          cartQty === 1
                            ? removeFromCart(product.id)
                            : handleQuantityChange(product.id, -1)
                        }
                      >
{cartQty === 1 ? (
                              <Trash size={16} color="#fff" />
                            ) : (
                              <Minus size={16} color="#fff" />
                            )}
                          </TouchableOpacity>
                          <Text style={styles.qtyValue}>{cartQty}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => handleQuantityChange(product.id, 1)}
                            disabled={cartQty >= product.stock}
                          >
                            <Plus size={16} color={cartQty >= product.stock ? '#888' : '#fff'} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleAdd(product)}
                      disabled={product.stock === 0}
                    >
                      <Plus size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      {results.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Exibindo resultados para: <Text style={styles.footerTerm}>{searchTerm}</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: DROPDOWN_MAX_HEIGHT,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
  },
  title: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  scroll: {
    maxHeight: DROPDOWN_MAX_HEIGHT - 88,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  imageWrap: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  priceRow: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  unit: {
    fontSize: 13,
    fontWeight: '400',
    color: '#888',
  },
  actions: {
    marginLeft: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565C0',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 2,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    minWidth: 18,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
  },
  footerTerm: {
    fontWeight: '700',
    color: '#333',
  },
});
