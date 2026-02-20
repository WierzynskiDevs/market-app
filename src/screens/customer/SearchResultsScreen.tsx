import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../../models';
import { productService } from '../../services';
import { useCart } from '../../contexts/CartContext';
import { ProductDetailModal } from '../../components/ProductDetailModal';
import { ProductCard } from '../../components/ProductCard';
import { useCustomerHeader } from '../../components/CustomerHeader';
import { CategoriesSidebar } from '../../components/CategoriesSidebar';
import { AuthModal } from '../../components/AuthModal';
import { useAuth } from '../../contexts/AuthContext';

const MOBILE_BREAKPOINT = 768;
const ITEMS_PER_ROW_WEB = 7;
const ITEMS_PER_ROW_MOBILE = 7;
const GAP = 8;
const SIDEBAR_WIDTH = 280;

interface Props {
  route: any;
  navigation: any;
}

interface Section {
  title: string;
  data: ProductWithFinalPrice[][];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const SearchResultsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { marketId, marketName, searchQuery } = route.params;
  const [products, setProducts] = useState<ProductWithFinalPrice[]>([]);

  const handleSearchSubmit = useCallback((query: string) => {
    if (query.length >= 2) {
      navigation.replace('SearchResults', { marketId, marketName, searchQuery: query });
    }
  }, [marketId, marketName, navigation]);

  const [selectedProduct, setSelectedProduct] = useState<ProductWithFinalPrice | null>(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const { getTotalItems, addToCart, openCartModal, items, updateQuantity, setMarket } = useCart();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();

  useEffect(() => {
    setMarket(marketId);
  }, [marketId, setMarket]);

  const isMobile = width < MOBILE_BREAKPOINT;
  const itemsPerRow = isMobile ? ITEMS_PER_ROW_MOBILE : ITEMS_PER_ROW_WEB;

  const itemSize = useMemo(() => {
    const n = itemsPerRow;
    const totalGap = GAP * (n - 1);
    const padding = 32;
    // No desktop a área de conteúdo é width menos a sidebar; senão as linhas quebram (ex.: 6+2+1)
    const contentWidth = isMobile ? width : width - SIDEBAR_WIDTH;
    const availableWidth = contentWidth - padding * 2 - totalGap;
    return Math.floor(availableWidth / n);
  }, [width, itemsPerRow, isMobile]);

  useEffect(() => {
    const data = productService.getProductsByMarket(marketId);
    setProducts(data);
  }, [marketId]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  // Lista completa do mercado para a busca (mesmo conjunto da tela inicial de produtos)
  const allMarketProducts = useMemo(
    () => productService.getProductsByMarket(marketId),
    [marketId],
  );

  const searchResults = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    if (query.length === 0) return allMarketProducts;
    return allMarketProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query)),
    );
  }, [allMarketProducts, searchQuery]);

  const sections = useMemo((): Section[] => {
    if (searchResults.length === 0) return [];
    const title = `Resultado para "${searchQuery}"`;
    return [{ title, data: chunk(searchResults, itemsPerRow) }];
  }, [searchResults, searchQuery, itemsPerRow]);

  const goToCategory = (cat: string) => {
    navigation.navigate('CategoryProducts', { marketId, marketName, category: cat });
  };

  const goToAllProducts = () => {
    navigation.navigate('Products', { marketId, marketName });
  };

  const IS_WEB = require('react-native').Platform.OS === 'web';
  const { headerOptions, dropdownOpen, closeDropdowns } = useCustomerHeader({
    navigation,
    isMobile,
    marketId,
    marketName,
    marketNameLabel: `${marketName} · "${searchQuery || ''}"`,
    showBack: true,
    onBackPress: () => navigation.goBack(),
    onNavigateToMarkets: () => navigation.goBack(),
    products: allMarketProducts,
    onSearchSubmit: handleSearchSubmit,
    user,
    onOpenAuthModal: () => setAuthModalVisible(true),
    onLogout: logout,
    getTotalItems,
    openCartModal,
    categories,
    onCategoryPress: goToCategory,
    onAllProductsPress: goToAllProducts,
  });

  useEffect(() => {
    navigation.setOptions(headerOptions);
  }, [navigation, headerOptions]);

  const cartQtyMap = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.product.id, i.quantity));
    return m;
  }, [items]);

  const handlePressCard = useCallback((product: ProductWithFinalPrice) => {
    if (product.stock === 0) {
      Alert.alert('Estoque Esgotado', 'Este produto não está disponível no momento.');
      return;
    }
    setSelectedProduct(product);
  }, []);

  const handleQuickAdd = useCallback((product: ProductWithFinalPrice) => {
    if (product.stock === 0) {
      Alert.alert('Estoque Esgotado', 'Este produto não está disponível no momento.');
      return;
    }
    try {
      addToCart(product, 1);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  }, [addToCart]);

  const handleQuantityChange = useCallback((product: ProductWithFinalPrice, newQty: number, e?: any) => {
    e?.stopPropagation?.();
    try {
      updateQuantity(product.id, newQty);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  }, [updateQuantity]);

  const renderProductCard = useCallback((product: ProductWithFinalPrice) => {
    const cartQty = cartQtyMap.get(product.id) ?? 0;
    return (
      <ProductCard
        key={product.id}
        product={product}
        cartQty={cartQty}
        size={itemSize}
        isMobile={isMobile}
        onPress={handlePressCard}
        onQuickAdd={handleQuickAdd}
        onQuantityChange={handleQuantityChange}
      />
    );
  }, [cartQtyMap, itemSize, isMobile, handlePressCard, handleQuickAdd, handleQuantityChange]);

  const renderRow = useCallback(({ item: row }: { item: ProductWithFinalPrice[] }) => (
    <View style={styles.row}>
      {row.map((p) => renderProductCard(p))}
      {row.length < itemsPerRow &&
        Array.from({ length: itemsPerRow - row.length }).map((_, i) => (
          <View key={`empty-${i}`} style={[styles.emptyCard, { width: itemSize }]} />
        ))}
    </View>
  ), [renderProductCard, itemSize, itemsPerRow]);

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  ), []);

  const listContent = sections.length === 0 ? (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>
        {searchQuery?.trim() ? `Nenhum produto encontrado para "${searchQuery}".` : 'Digite um termo para buscar.'}
      </Text>
    </View>
  ) : (
    <SectionList
      style={styles.sectionList}
      sections={sections}
      renderItem={renderRow}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.map((p) => p.id).join('-')}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={6}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrap}>
        {isMobile ? (
          <>
            {!IS_WEB && dropdownOpen && (
              <Pressable style={styles.dropdownOverlay} onPress={closeDropdowns} />
            )}
            {listContent}
          </>
        ) : (
          <View style={styles.webRow}>
            {!IS_WEB && dropdownOpen && (
              <Pressable style={styles.dropdownOverlay} onPress={closeDropdowns} />
            )}
            <CategoriesSidebar
              categories={categories}
              showAllItem
              onAllPress={goToAllProducts}
              onCategoryPress={goToCategory}
            />
            <View style={styles.mainContent}>
              {listContent}
            </View>
          </View>
        )}
      </View>
      <ProductDetailModal
        visible={!!selectedProduct}
        product={selectedProduct}
        marketProducts={products}
        onClose={() => setSelectedProduct(null)}
        onGoToCart={() => openCartModal(navigation)}
        onSelectProduct={setSelectedProduct}
      />
      <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentWrap: {
    flex: 1,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  searchDropdownWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 6,
    paddingBottom: 0,
    zIndex: 10,
    elevation: 10,
    alignItems: 'center',
  },
  searchDropdownInner: {
    width: '55%',
    maxWidth: 560,
    paddingHorizontal: 0,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 32,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: GAP,
    marginTop: 12,
    marginBottom: 0,
  },
  emptyCard: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    height: 0,
    minHeight: 0,
  },
  headerSearchBarWrap: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  headerSearchWrapper: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
    width: '100%',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  headerSearchContainerFocused: {
    borderColor: '#2196F3',
    backgroundColor: '#fff',
  },
  searchIcon: { marginRight: 8 },
  searchIconTouchable: {
    marginRight: 0,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSearchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    minWidth: 0,
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  webBackButton: { marginRight: -30, padding: 4 },
  marketLogoPlaceholder: {
    width: 185,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginLeft: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  logoIconContainer: { marginRight: 8 },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3',
    letterSpacing: 1,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 16,
  },
  headerUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerUserButtonHover: { backgroundColor: '#e3f2fd' },
  headerUserText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  headerCartButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerCartButtonHover: { backgroundColor: '#388E3C' },
  cartButtonText: { color: '#fff', fontWeight: 'bold' },
  mobileHeaderRoot: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  mobileHeaderRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobileBackBtn: { marginRight: -30, padding: 4 },
  mobileLogoSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 12,
  },
  mobileLogoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2196F3',
  },
  mobileLojaSelector: { flex: 1 },
  mobileLojaLabel: { fontSize: 12, color: '#666' },
  mobileLojaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mobileLojaName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  mobileHeaderIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  mobileIconBtnPressed: { opacity: 0.7 },
  mobileCartCount: { fontSize: 14, color: '#333', fontWeight: '600' },
  mobileSearchRow: {
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  mobileSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    minHeight: 48,
  },
  mobileSearchInput: { minHeight: 48, fontSize: 16 },
  mobileCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  mobileCategoryChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mobileCategoryChipText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  webRow: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    flexShrink: 0,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sidebarScroll: { flex: 1 },
  sidebarScrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: 20,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sidebarButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  sidebarButtonHovered: {
    backgroundColor: '#f5f5f5',
    borderColor: '#2196F3',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    transform: [{ translateX: 4 }],
  },
  sidebarButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
  },
  sidebarButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 0.2,
    flex: 1,
  },
  sidebarButtonTextHovered: { color: '#1976d2' },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  sectionList: {
    flex: 1,
  },
});
