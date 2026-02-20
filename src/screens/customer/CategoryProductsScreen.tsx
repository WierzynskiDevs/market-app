import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  useWindowDimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../../models';
import { productService } from '../../services';
import { useCart } from '../../contexts/CartContext';
import { ProductCard } from '../../components/ProductCard';
import { BannerCarousel } from '../../components/BannerCarousel';
import { useProductDetailModal } from '../../hooks/useProductDetailModal';
import { useCustomerHeader } from '../../components/CustomerHeader';
import { CategoriesSidebar } from '../../components/CategoriesSidebar';
import { AuthModal } from '../../components/AuthModal';
import { useAuth } from '../../contexts/AuthContext';

const MOBILE_BREAKPOINT = 768;
const ITEMS_PER_VIEW_MOBILE = 3;
const ITEMS_PER_VIEW_WEB = 8;
const PADDING_HORIZONTAL = 16;
const GAP = 8;
const WEB_LAYOUT_BUFFER = 48;
const PEEK_WIDTH = 28;
const SIDEBAR_WIDTH = 280;

interface Props {
  route: any;
  navigation: any;
}

interface Section {
  title: string;
  items: ProductWithFinalPrice[];
}

export const CategoryProductsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { marketId, marketName, category } = route.params;
  const [products, setProducts] = useState<ProductWithFinalPrice[]>([]);

  const handleSearchSubmit = useCallback((query: string) => {
    if (query.length >= 2) {
      navigation.navigate('SearchResults', { marketId, marketName, searchQuery: query });
    }
  }, [marketId, marketName, navigation]);

  const { openProductModal, productDetailModal } = useProductDetailModal(products, navigation);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const { getTotalItems, addToCart, openCartModal, items, updateQuantity, setMarket } = useCart();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [categoryPage, setCategoryPage] = useState<Record<string, number>>({});
  const categoryScrollRefs = useRef<Record<string, ScrollView | null>>({});

  // Define o mercado selecionado no contexto do carrinho (setMarket estável via useCallback no contexto)
  useEffect(() => {
    setMarket(marketId);
  }, [marketId, setMarket]);

  const isMobile = width < MOBILE_BREAKPOINT;
  const itemsPerView = isMobile ? ITEMS_PER_VIEW_MOBILE : ITEMS_PER_VIEW_WEB;

  const itemSize = useMemo(() => {
    const n = itemsPerView;
    if (isMobile) {
      const availableWidth = width - PADDING_HORIZONTAL * 2 - GAP;
      return Math.max(80, Math.floor(availableWidth / n));
    }
    const totalGap = GAP * (n - 1);
    const extraBuffer = WEB_LAYOUT_BUFFER;
    const arrowSpace = 80;
    const availableWidth = width - PADDING_HORIZONTAL * 2 - totalGap - extraBuffer - SIDEBAR_WIDTH - arrowSpace;
    return Math.max(60, Math.floor(availableWidth / n));
  }, [width, isMobile, itemsPerView]);

  const pageWidth = itemsPerView * itemSize + (itemsPerView - 1) * GAP;
  const carouselVisibleWidth = isMobile ? width - PADDING_HORIZONTAL * 2 : pageWidth + PEEK_WIDTH;

  useEffect(() => {
    const data = productService.getProductsByMarket(marketId);
    setProducts(data);
  }, [marketId]);

  const bannerWidth = useMemo(() => {
    return isMobile ? width : width - SIDEBAR_WIDTH;
  }, [width, isMobile]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  // Lista completa do mercado só para a busca (mesmo conjunto da tela inicial de produtos)
  const allMarketProducts = useMemo(
    () => productService.getProductsByMarket(marketId),
    [marketId],
  );

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
    marketNameLabel: `${marketName} · ${category}`,
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
    currentCategory: category,
    onCategoryPress: goToCategory,
    onAllProductsPress: goToAllProducts,
  });

  const goToPrevPage = useCallback((sectionTitle: string) => {
    const currentPage = categoryPage[sectionTitle] ?? 0;
    const newPage = Math.max(0, currentPage - 1);
    const scrollRef = categoryScrollRefs.current[sectionTitle];
    scrollRef?.scrollTo({ x: newPage * pageWidth, animated: true });
    setCategoryPage((prev) => ({ ...prev, [sectionTitle]: newPage }));
  }, [categoryPage, pageWidth]);

  const goToNextPage = useCallback((sectionTitle: string, totalItems: number) => {
    const currentPage = categoryPage[sectionTitle] ?? 0;
    const maxPage = Math.ceil(totalItems / itemsPerView) - 1;
    const newPage = Math.min(maxPage, currentPage + 1);
    const scrollRef = categoryScrollRefs.current[sectionTitle];
    scrollRef?.scrollTo({ x: newPage * pageWidth, animated: true });
    setCategoryPage((prev) => ({ ...prev, [sectionTitle]: newPage }));
  }, [categoryPage, itemsPerView, pageWidth]);

  const handleCategoryScroll = useCallback((sectionTitle: string) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const page = Math.round(x / pageWidth);
    setCategoryPage((prev) => {
      if ((prev[sectionTitle] ?? 0) === page) return prev;
      return { ...prev, [sectionTitle]: page };
    });
  }, [pageWidth]);

  useEffect(() => {
    navigation.setOptions(headerOptions);
  }, [navigation, headerOptions]);

  // Lista da categoria por subcategoria (mesmo formato da ProductsScreen: sections com items)
  const sections = useMemo((): Section[] => {
    const byCategory = products.filter((p) => p.category === category);
    const bySubcategory = byCategory.reduce<Record<string, ProductWithFinalPrice[]>>(
      (acc, product) => {
        const sub = product.subcategory ?? 'Outros';
        if (!acc[sub]) acc[sub] = [];
        acc[sub].push(product);
        return acc;
      },
      {},
    );
    return Object.entries(bySubcategory).map(([title, items]) => ({
      title,
      items,
    }));
  }, [products, category]);

  // Map productId -> quantity para evitar O(n) items.find() em cada card
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
    openProductModal(product);
  }, [openProductModal]);

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

  const renderCategoryBlock = useCallback((section: Section) => {
    const page = categoryPage[section.title] ?? 0;
    const totalPages = Math.ceil(section.items.length / itemsPerView);
    const canGoPrev = !isMobile && page > 0;
    const canGoNext = !isMobile && page < totalPages - 1;
    return (
      <View key={section.title} style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          {!isMobile && (
            <View style={styles.headerControls}>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={goToAllProducts}
              >
                <Text style={styles.seeAllText}>Ver mais</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrowButton, !canGoPrev && styles.navArrowButtonDisabled]}
                onPress={() => canGoPrev && goToPrevPage(section.title)}
                disabled={!canGoPrev}
              >
                <ChevronLeft size={18} color={canGoPrev ? '#333' : '#ccc'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrowButton, !canGoNext && styles.navArrowButtonDisabled]}
                onPress={() => canGoNext && goToNextPage(section.title, section.items.length)}
                disabled={!canGoNext}
              >
                <ChevronRight size={18} color={canGoNext ? '#333' : '#ccc'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.carouselRow}>
          <View style={[styles.carouselViewport, { width: carouselVisibleWidth }]}>
            <ScrollView
              ref={(el) => {
                categoryScrollRefs.current[section.title] = el;
              }}
              horizontal
              showsHorizontalScrollIndicator={isMobile}
              decelerationRate="fast"
              snapToInterval={isMobile ? undefined : pageWidth}
              snapToAlignment="start"
              contentContainerStyle={styles.carouselContent}
              onMomentumScrollEnd={!isMobile ? handleCategoryScroll(section.title) : undefined}
            >
              {section.items.map((p) => (
                <View key={p.id} style={[styles.carouselCardWrap, { width: itemSize, marginRight: GAP }]}>
                  {renderProductCard(p)}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  }, [categoryPage, itemsPerView, isMobile, goToAllProducts, goToPrevPage, goToNextPage, handleCategoryScroll, carouselVisibleWidth, pageWidth, itemSize, renderProductCard]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrap}>
      {isMobile ? (
        <>
          {!IS_WEB && dropdownOpen && (
            <Pressable style={styles.dropdownOverlay} onPress={closeDropdowns} />
          )}
          {sections.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum produto nesta categoria.</Text>
            </View>
          ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={true}
          >
            <BannerCarousel width={bannerWidth} />
            {sections.map(renderCategoryBlock)}
          </ScrollView>
          )}
        </>
      ) : (
        <View style={styles.webRow}>
          {!IS_WEB && dropdownOpen && (
            <Pressable style={styles.dropdownOverlay} onPress={closeDropdowns} />
          )}
          <CategoriesSidebar
            categories={categories}
            currentCategory={category}
            showAllItem
            onAllPress={goToAllProducts}
            onCategoryPress={goToCategory}
          />
          <View style={styles.mainContent}>
            {sections.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Nenhum produto nesta categoria.</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={true}
              >
                <BannerCarousel width={bannerWidth} />
                {sections.map(renderCategoryBlock)}
              </ScrollView>
            )}
          </View>
        </View>
      )}
      </View>
      {productDetailModal}
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
  webRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
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
  sectionBlock: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  navArrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowButtonDisabled: {
    borderColor: '#ccc',
    opacity: 0.5,
  },
  carouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselViewport: {
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  carouselContent: {
    flexDirection: 'row',
    paddingRight: PEEK_WIDTH,
  },
  carouselCardWrap: {},
  scrollView: {
    flex: 1,
  },
});
