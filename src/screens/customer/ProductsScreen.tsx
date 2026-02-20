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
import { 
  ArrowLeft, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ShoppingCart, 
  Utensils,
  GlassWater,
  Sparkles,
  ShowerHead,
  Croissant,
  Drumstick,
  Apple,
  Sandwich,
  Milk,
  ShoppingBag,
  Package,
  User,
  Snowflake,
} from 'lucide-react-native';
import { ProductWithFinalPrice, Market } from '../../models';
import { productService, db } from '../../services';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { ProductCard } from '../../components/ProductCard';
import { BannerCarousel } from '../../components/BannerCarousel';
import { useProductDetailModal } from '../../hooks/useProductDetailModal';
import { useCustomerHeader } from '../../components/CustomerHeader';
import { CategoriesSidebar } from '../../components/CategoriesSidebar';
import { AuthModal } from '../../components/AuthModal';
const IS_WEB = require('react-native').Platform.OS === 'web';

const MOBILE_BREAKPOINT = 768;
const ITEMS_PER_VIEW_MOBILE = 3;
const ITEMS_PER_VIEW_WEB = 8;
const PADDING_HORIZONTAL = 16;
const GAP = 8;
const WEB_LAYOUT_BUFFER = 48;
const PEEK_WIDTH = 28;

interface Props {
  route: any;
  navigation: any;
}

interface Section {
  title: string;
  items: ProductWithFinalPrice[];
}

// Mapeamento de categorias para ícones e cores
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, { Icon: any; color: string }> = {
    'Alimentos': { Icon: Utensils, color: '#FF9800' },
    'Bebidas': { Icon: GlassWater, color: '#2196F3' },
    'Limpeza': { Icon: Sparkles, color: '#00BCD4' },
    'Higiene': { Icon: ShowerHead, color: '#9C27B0' },
    'Padaria': { Icon: Croissant, color: '#FFC107' },
    'Açougue': { Icon: Drumstick, color: '#F44336' },
    'Hortifruti': { Icon: Apple, color: '#4CAF50' },
    'Refrigerados': { Icon: Snowflake, color: '#00ACC1' },
    'Frios': { Icon: Sandwich, color: '#FFEB3B' },
    'Laticínios': { Icon: Milk, color: '#E0E0E0' },
    'Mercearia': { Icon: ShoppingBag, color: '#795548' },
  };
  
  return iconMap[category] || { Icon: Package, color: '#757575' };
};

export const ProductsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { marketId, marketName } = route.params;
  const [products, setProducts] = useState<ProductWithFinalPrice[]>([]);
  const handleSearchSubmit = useCallback((query: string) => {
    if (query.length >= 2) {
      navigation.navigate('SearchResults', { marketId, marketName, searchQuery: query });
    }
  }, [marketId, marketName, navigation]);

  const { getTotalItems, addToCart, openCartModal, items, updateQuantity, setMarket } = useCart();
  const { width } = useWindowDimensions();

  const isMobile = width < MOBILE_BREAKPOINT;
  const [categoryPage, setCategoryPage] = useState<Record<string, number>>({});
  const { openProductModal, productDetailModal } = useProductDetailModal(products, navigation);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const categoryScrollRefs = useRef<Record<string, ScrollView | null>>({});
  const { user, logout } = useAuth();

  useEffect(() => {
    setMarket(marketId);
  }, [marketId, setMarket]);

  useEffect(() => {
    const markets = db.getMarkets();
    setAllMarkets(markets);
  }, []);

  const itemsPerView = isMobile ? ITEMS_PER_VIEW_MOBILE : ITEMS_PER_VIEW_WEB;

  const itemSize = useMemo(() => {
    const n = itemsPerView;
    if (isMobile) {
      const availableWidth = width - PADDING_HORIZONTAL * 2 - GAP;
      return Math.max(80, Math.floor(availableWidth / n));
    }
    const totalGap = GAP * (n - 1);
    const extraBuffer = WEB_LAYOUT_BUFFER;
    const sidebarWidth = 200;
    const arrowSpace = 80;
    const availableWidth = width - PADDING_HORIZONTAL * 2 - totalGap - extraBuffer - sidebarWidth - arrowSpace;
    return Math.max(60, Math.floor(availableWidth / n));
  }, [width, isMobile, itemsPerView]);

  const pageWidth = itemsPerView * itemSize + (itemsPerView - 1) * GAP;
  const carouselVisibleWidth = isMobile ? width - PADDING_HORIZONTAL * 2 : pageWidth + PEEK_WIDTH;

  useEffect(() => {
    const data = productService.getProductsByMarket(marketId);
    setProducts(data);
  }, [marketId]);

  const bannerWidth = useMemo(() => {
    return isMobile ? width : width - 280;
  }, [width, isMobile]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  // Lista por categoria sem filtro por busca; a busca abre o modal de sugestões
  const sections = useMemo((): Section[] => {
    const byCategory = products.reduce<Record<string, ProductWithFinalPrice[]>>(
      (acc, product) => {
        const cat = product.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(product);
        return acc;
      },
      {},
    );

    return Object.entries(byCategory).map(([title, items]) => ({
      title,
      items,
    }));
  }, [products]);

  const handlePressCard = (product: ProductWithFinalPrice) => {
    if (product.stock === 0) {
      Alert.alert('Estoque Esgotado', 'Este produto não está disponível no momento.');
      return;
    }
    openProductModal(product);
  };

  const handleQuickAdd = (product: ProductWithFinalPrice) => {
    if (product.stock === 0) {
      Alert.alert('Estoque Esgotado', 'Este produto não está disponível no momento.');
      return;
    }
    try {
      addToCart(product, 1);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleQuantityChange = (product: ProductWithFinalPrice, newQty: number, e?: any) => {
    e?.stopPropagation?.();
    try {
      updateQuantity(product.id, newQty);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const goToCategory = (category: string) => {
    navigation.navigate('CategoryProducts', { marketId, marketName, category });
  };

  const { headerOptions, dropdownOpen, closeDropdowns } = useCustomerHeader({
    navigation,
    isMobile,
    marketId,
    marketName,
    showMarketDropdown: true,
    allMarkets,
    onMarketSelect: (market) => navigation.push('Products', { marketId: market.id, marketName: market.name }),
    onNavigateToMarkets: () => navigation.navigate('Markets'),
    products,
    onSearchSubmit: handleSearchSubmit,
    user,
    onOpenAuthModal: () => setAuthModalVisible(true),
    onLogout: logout,
    getTotalItems,
    openCartModal,
    categories,
    onCategoryPress: goToCategory,
  });

  useEffect(() => {
    navigation.setOptions(headerOptions);
  }, [navigation, headerOptions]);

  const goToPrevPage = (categoryTitle: string) => {
    const currentPage = categoryPage[categoryTitle] ?? 0;
    const newPage = Math.max(0, currentPage - 1);
    const scrollRef = categoryScrollRefs.current[categoryTitle];
    scrollRef?.scrollTo({ x: newPage * pageWidth, animated: true });
    setCategoryPage((prev) => ({ ...prev, [categoryTitle]: newPage }));
  };

  const goToNextPage = (categoryTitle: string, totalItems: number) => {
    const currentPage = categoryPage[categoryTitle] ?? 0;
    const maxPage = Math.ceil(totalItems / itemsPerView) - 1;
    const newPage = Math.min(maxPage, currentPage + 1);
    const scrollRef = categoryScrollRefs.current[categoryTitle];
    scrollRef?.scrollTo({ x: newPage * pageWidth, animated: true });
    setCategoryPage((prev) => ({ ...prev, [categoryTitle]: newPage }));
  };

  const handleCategoryScroll = (categoryTitle: string) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const page = Math.round(x / pageWidth);
    setCategoryPage((prev) => {
      if ((prev[categoryTitle] ?? 0) === page) return prev;
      return { ...prev, [categoryTitle]: page };
    });
  };

  const renderProductCard = (product: ProductWithFinalPrice) => {
    const cartQty = items.find((i) => i.product.id === product.id)?.quantity ?? 0;
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
  };

  const renderCategoryBlock = (section: Section) => {
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
                onPress={() => goToCategory(section.title)}
              >
                <Text style={styles.seeAllText}>Ver mais</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrowButton, !canGoPrev && styles.navArrowButtonDisabled]}
                onPress={() => canGoPrev && goToPrevPage(section.title)}
                disabled={!canGoPrev}
              >
                <ChevronLeft size={18} color={canGoPrev ? "#333" : "#ccc"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrowButton, !canGoNext && styles.navArrowButtonDisabled]}
                onPress={() => canGoNext && goToNextPage(section.title, section.items.length)}
                disabled={!canGoNext}
              >
                <ChevronRight size={18} color={canGoNext ? "#333" : "#ccc"} />
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrap}>
      {isMobile ? (
        <View style={styles.mobileWrapper}>
          {!IS_WEB && dropdownOpen && (
            <Pressable style={styles.mobileDropdownOverlay} onPress={closeDropdowns} />
          )}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={true}
          >
            <BannerCarousel width={bannerWidth} />
            {sections.map(renderCategoryBlock)}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.webRow}>
          {!IS_WEB && dropdownOpen && (
            <Pressable style={styles.dropdownOverlay} onPress={closeDropdowns} />
          )}
          <CategoriesSidebar
            categories={categories}
            showBackItem
            onBackPress={() => navigation.navigate('Markets')}
            onCategoryPress={goToCategory}
          />
          <View style={styles.mainContent}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={true}
            >
              <BannerCarousel width={bannerWidth} />
              {sections.map(renderCategoryBlock)}
            </ScrollView>
          </View>
        </View>
      )}
      </View>
      {productDetailModal}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
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
  mobileWrapper: {
    flex: 1,
  },
  mobileDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
    backgroundColor: 'transparent',
  },
  list: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  scrollView: {
    flex: 1,
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
  carouselCardWrap: {
  },
});
