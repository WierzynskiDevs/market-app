import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  Animated,
  useWindowDimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import { Trash, ShoppingCart, X, MoreVertical, Plus, Minus } from 'lucide-react-native';
import { useCart } from '../contexts/CartContext';
import { getProductImageSource } from '../utils/productImage';
import { truncateProductName } from '../utils/productName';
import type { CartItem } from '../contexts/CartContext';

const DEFAULT_PRODUCT_IMAGE = require('../../assets/agua-sanitaria.png');

const PANEL_WIDTH_MAX = 420;
const PANEL_WIDTH_PERCENT = 0.9;
const MOBILE_BREAKPOINT = 768;

interface CartSection {
  title: string;
  data: CartItem[];
}

export const CartModal: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const panelWidth = isMobile ? width : Math.min(PANEL_WIDTH_MAX, width * PANEL_WIDTH_PERCENT);
  const slideAnim = useRef(new Animated.Value(panelWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalAmount,
    selectedMarketId,
    cartModalVisible,
    closeCartModal,
    closeCartModalAndGoToMarkets,
    closeCartModalAndGoToCheckout,
  } = useCart();

  useEffect(() => {
    const w = isMobile ? width : Math.min(PANEL_WIDTH_MAX, width * PANEL_WIDTH_PERCENT);
    if (cartModalVisible) {
      slideAnim.setValue(w);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: w,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [cartModalVisible, width, isMobile]);

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Carrinho vazio', 'Adicione produtos ao carrinho antes de finalizar.');
      return;
    }

    if (!selectedMarketId) {
      Alert.alert('Erro', 'Selecione um mercado antes de finalizar.');
      return;
    }

    closeCartModalAndGoToCheckout();
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    try {
      updateQuantity(productId, newQuantity);
    } catch (error: unknown) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro');
    }
  };

  const sections = useMemo((): CartSection[] => {
    const byCategory = items.reduce<Record<string, CartItem[]>>((acc, item) => {
      const cat = item.product.category || 'Outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
    return Object.entries(byCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [items]);

  const renderSectionHeader = ({ section }: { section: CartSection }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionDivider} />
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: CartItem }) => {
    const isOne = item.quantity === 1;
    return (
      <View style={styles.cartItem}>
        <View style={styles.itemImageWrap}>
          <Image
            source={getProductImageSource(item.product.images?.[0], DEFAULT_PRODUCT_IMAGE)}
            style={styles.itemImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemName} numberOfLines={2}>
            {truncateProductName(item.product.name)}
          </Text>
          <View style={styles.priceRow}>
            {item.product.discount > 0 ? (
              <>
                <Text style={styles.originalPrice}>R$ {item.product.price.toFixed(2)}</Text>
                <Text style={styles.itemPrice}>R$ {item.product.finalPrice.toFixed(2)}</Text>
              </>
            ) : (
              <Text style={styles.itemPrice}>R$ {item.product.finalPrice.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.itemOptionsRow}>
            <Text style={styles.instructionsLabel}>Instruções</Text>
            <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.removeButtonContainer}>
              <Trash size={14} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.quantityWrap}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() =>
              isOne ? removeFromCart(item.product.id) : handleUpdateQuantity(item.product.id, item.quantity - 1)
            }
          >
            {isOne ? (
              <Trash size={16} color="#333" />
            ) : (
              <Minus size={16} color="#333" />
            )}
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
          >
            <Plus size={16} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!cartModalVisible) return null;

  return (
    <Modal visible={cartModalVisible} transparent animationType="none" onRequestClose={closeCartModal}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCartModal} />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <ShoppingCart size={24} color="#000" />
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.headerIconButton} hitSlop={8}>
                  <MoreVertical size={20} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity onPress={closeCartModal} style={styles.headerIconButton} hitSlop={8}>
                  <X size={20} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Seu carrinho está vazio</Text>
                <TouchableOpacity style={styles.shopButton} onPress={closeCartModal}>
                  <Text style={styles.shopButtonText}>Continuar comprando</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <SectionList
                  sections={sections}
                  renderItem={renderItem}
                  renderSectionHeader={renderSectionHeader}
                  keyExtractor={(item) => item.product.id}
                  contentContainerStyle={styles.list}
                  stickySectionHeadersEnabled={false}
                />

                <View style={styles.footer}>
                  <View style={styles.totalBlock}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>R$ {getTotalAmount().toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
                    <Text style={styles.checkoutButtonText}>Finalizar pedido</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 16,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingVertical: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  originalPrice: {
    fontSize: 13,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
  itemOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  instructionsLabel: {
    fontSize: 13,
    color: '#666',
  },
  removeButtonContainer: {
    padding: 4,
  },
  removeButton: {
    fontSize: 13,
    color: '#F44336',
    fontWeight: '600',
  },
  quantityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
    minWidth: 24,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginBottom: 20,
  },
  shopButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    gap: 16,
  },
  totalBlock: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 15,
    color: '#666',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  checkoutButton: {
    backgroundColor: '#1a237e',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
