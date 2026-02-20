import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
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
import { ArrowLeft, Plus, Minus, ShoppingCart, ChevronLeft, ChevronRight, ChevronDown, ShoppingBag, User, Utensils, GlassWater, Sparkles, ShowerHead, Croissant, Drumstick, Apple, Sandwich, Milk, Package, Snowflake } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../../models';
import { productService } from '../../services';
import { useCart } from '../../contexts/CartContext';
import { ProductDetailModal } from '../../components/ProductDetailModal';
import { SearchBarWithSuggestions } from '../../components/SearchBarWithSuggestions';
import { getProductImageSource } from '../../utils/productImage';
import { truncateProductName } from '../../utils/productName';
const DEFAULT_PRODUCT_IMAGE = require('../../../assets/agua-sanitaria.png');

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

const getCategoryIcon = (cat: string) => {
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
  return iconMap[cat] || { Icon: Package, color: '#757575' };
};

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
  const inCart = cartQty > 0;

  if (!inCart) {
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
          <Plus size={16} color={cartQty >= product.stock ? "#888" : "#fff"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const CategoryProductsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { marketId, marketName, category } = route.params;
  const [products, setProducts] = useState<ProductWithFinalPrice[]>([]);

  const handleSearchSubmit = useCallback((query: string) => {
    if (query.length >= 2) {
      navigation.navigate('SearchResults', { marketId, marketName, searchQuery: query });
    }
  }, [marketId, marketName, navigation]);

  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithFinalPrice | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const { getTotalItems, addToCart, openCartModal, items, updateQuantity, setMarket } = useCart();
  const { width } = useWindowDimensions();
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const [categoryPage, setCategoryPage] = useState<Record<string, number>>({});
  const categoryScrollRefs = useRef<Record<string, ScrollView | null>>({});

  // Define o mercado selecionado no contexto do carrinho (setMarket estável via useCallback no contexto)
  useEffect(() => {
    setMarket(marketId);
  }, [marketId, setMarket]);

  const banners = [
    { id: 1, color: '#2196F3' }, // Azul
    { id: 2, color: '#F44336' }, // Vermelho
    { id: 3, color: '#4CAF50' }, // Verde
    { id: 4, color: '#FF9800' }, // Laranja
  ];

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

  const handleBannerScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / bannerWidth);
    setBannerIndex(newIndex);
  }, [bannerWidth]);

  const goToBanner = useCallback((index: number) => {
    setBannerIndex(index);
    bannerScrollRef.current?.scrollTo({
      x: index * bannerWidth,
      animated: true,
    });
  }, [bannerWidth]);

  // Auto-play do banner a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({
          x: next * bannerWidth,
          animated: true,
        });
        return next;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [bannerWidth, banners.length]);

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
    navigation.setOptions(
      isMobile
        ? {
            headerStyle: { minHeight: 200 },
            header: () => (
              <View style={styles.mobileHeaderRoot}>
                <View style={styles.mobileHeaderRow1}>
                  <TouchableOpacity
                    style={styles.mobileBackBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <ArrowLeft size={22} color="#2196F3" />
                  </TouchableOpacity>
                  <View style={styles.mobileLogoSmall}>
                    <ShoppingBag size={22} color="#2196F3" strokeWidth={2.5} />
                    <Text style={styles.mobileLogoText}>MARKET</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mobileLojaSelector}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mobileLojaLabel}>Loja de</Text>
                    <View style={styles.mobileLojaRow}>
                      <Text style={styles.mobileLojaName} numberOfLines={1}>{marketName} · {category}</Text>
                      <ChevronDown size={16} color="#333" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.mobileHeaderIcons}>
                    <Pressable
                      style={(s: { pressed: boolean }) => [styles.mobileIconBtn, s.pressed && styles.mobileIconBtnPressed]}
                      onPress={() => {}}
                    >
                      <User size={22} color="#2196F3" />
                    </Pressable>
                    <Pressable
                      style={(s: { pressed: boolean }) => [styles.mobileIconBtn, s.pressed && styles.mobileIconBtnPressed]}
                      onPress={() => openCartModal(navigation)}
                    >
                      <ShoppingCart size={22} color="#333" />
                      <Text style={styles.mobileCartCount}>({getTotalItems()})</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.mobileSearchRow}>
                  <View style={styles.mobileSearchContainer}>
                    <SearchBarWithSuggestions
                      products={allMarketProducts}
                      onSearchSubmit={handleSearchSubmit}
                      placeholder="Leite, arroz, pão, vinho, frutas..."
                    />
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mobileCategoryRow}
                >
                  <TouchableOpacity
                    style={styles.mobileCategoryChip}
                    onPress={goToAllProducts}
                  >
                    <Text style={styles.mobileCategoryChipText} numberOfLines={1}>Todos</Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.mobileCategoryChip, cat === category && styles.mobileCategoryChipActive]}
                      onPress={() => goToCategory(cat)}
                    >
                      <Text style={[styles.mobileCategoryChipText, cat === category && styles.mobileCategoryChipTextActive]} numberOfLines={1}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ),
          }
        : {
            headerStyle: { height: 90 },
            headerLeft: () => (
              <View style={styles.headerLeftContainer}>
                <TouchableOpacity
                  style={styles.webBackButton}
                  onPress={() => navigation.goBack()}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowLeft size={22} color="#2196F3" />
                </TouchableOpacity>
                <View style={styles.marketLogoPlaceholder}>
                  <View style={styles.logoIconContainer}>
                    <ShoppingBag size={32} color="#2196F3" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.logoText}>MARKET</Text>
                </View>
              </View>
            ),
            headerTitleAlign: 'center',
            headerTitleContainerStyle: { flex: 1, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
            headerTitle: () => (
              <View style={styles.headerSearchBarWrap}>
                <SearchBarWithSuggestions products={allMarketProducts} onSearchSubmit={handleSearchSubmit} />
              </View>
            ),
            headerRight: () => (
              <View style={styles.headerRightContainer}>
                <Pressable
                  style={(s: { pressed: boolean; hovered?: boolean }) => [styles.headerUserButton, (s.hovered || s.pressed) && styles.headerUserButtonHover]}
                  onPress={() => {}}
                >
                  <User size={20} color="#2196F3" />
                  <Text style={styles.headerUserText}>Entrar</Text>
                </Pressable>
                <Pressable
                  style={(s: { pressed: boolean; hovered?: boolean }) => [styles.headerCartButton, (s.hovered || s.pressed) && styles.headerCartButtonHover]}
                  onPress={() => openCartModal(navigation)}
                >
                  <ShoppingCart size={20} color="#fff" />
                  <Text style={styles.cartButtonText}>({getTotalItems()})</Text>
                </Pressable>
              </View>
            ),
          }
    );
  }, [navigation, marketName, category, getTotalItems, isMobile, categories, openCartModal, handleSearchSubmit, allMarketProducts]);

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

  const imageSize = itemSize - 24;
  const cardMinHeight = imageSize + 64;

  const renderProductCard = useCallback((product: ProductWithFinalPrice) => {
    const cartQty = cartQtyMap.get(product.id) ?? 0;
    const inCart = cartQty > 0;

    return (
      <View
        key={product.id}
        style={[
          styles.productCard,
          { width: itemSize, minHeight: cardMinHeight },
          hoveredCardId === product.id && styles.productCardHover,
        ]}
        {...({
          onMouseEnter: () => setHoveredCardId(product.id),
          onMouseLeave: (e: any) => {
            const related = e?.nativeEvent?.relatedTarget;
            const current = e?.currentTarget;
            if (current && related && current.contains(related)) return;
            setHoveredCardId(null);
          },
        } as any)}
      >
        <TouchableOpacity
          style={styles.productCardTouchable}
          onPress={() => handlePressCard(product)}
          activeOpacity={0.8}
        >
          <View style={[styles.imageWrapper, { width: imageSize, height: imageSize }]}>
            <Image
              source={getProductImageSource(product.images?.[0], DEFAULT_PRODUCT_IMAGE)}
              style={[styles.productImage, { width: imageSize, height: imageSize }]}
              resizeMode="cover"
            />
            <CartButtonsOverlay
              product={product}
              cartQty={cartQty}
              onQuickAdd={() => handleQuickAdd(product)}
              onQuantityChange={(newQty, e) => handleQuantityChange(product, newQty, e)}
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
  }, [cartQtyMap, hoveredCardId, itemSize, cardMinHeight, isMobile, handlePressCard, handleQuickAdd, handleQuantityChange]);

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

  const renderBanner = useCallback(() => (
    <View style={styles.bannerContainer}>
      <ScrollView
        ref={(el) => {
          bannerScrollRef.current = el;
        }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleBannerScroll}
        scrollEventThrottle={16}
      >
        {banners.map((banner) => (
          <View key={banner.id} style={[styles.bannerSlide, { width: bannerWidth, backgroundColor: banner.color }]} />
        ))}
      </ScrollView>
      <View style={styles.bannerControls}>
        <TouchableOpacity
          style={[styles.bannerArrow, bannerIndex === 0 && styles.bannerArrowDisabled]}
          onPress={() => goToBanner(Math.max(0, bannerIndex - 1))}
          disabled={bannerIndex === 0}
        >
          <ChevronLeft size={20} color={bannerIndex === 0 ? "#ccc" : "#fff"} />
        </TouchableOpacity>
        <View style={styles.bannerDots}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.bannerDot,
                bannerIndex === index && styles.bannerDotActive,
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.bannerArrow, bannerIndex === banners.length - 1 && styles.bannerArrowDisabled]}
          onPress={() => goToBanner(Math.min(banners.length - 1, bannerIndex + 1))}
          disabled={bannerIndex === banners.length - 1}
        >
          <ChevronRight size={20} color={bannerIndex === banners.length - 1 ? "#ccc" : "#fff"} />
        </TouchableOpacity>
      </View>
    </View>
  ), [bannerWidth, bannerIndex, banners, handleBannerScroll, goToBanner]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrap}>
      {isMobile ? (
        sections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhum produto nesta categoria.</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={true}
          >
            {renderBanner()}
            {sections.map(renderCategoryBlock)}
          </ScrollView>
        )
      ) : (
        <View style={styles.webRow}>
          <View style={styles.sidebar}>
            <ScrollView
              style={styles.sidebarScroll}
              contentContainerStyle={styles.sidebarScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.sidebarTitle}>Categorias</Text>
              <Pressable
              style={[
                styles.sidebarButton,
                hoveredCategory === '__todos__' && styles.sidebarButtonHovered,
              ]}
              onPress={goToAllProducts}
              {...({
                onMouseEnter: () => setHoveredCategory('__todos__'),
                onMouseLeave: () => setHoveredCategory(null),
              } as any)}
            >
              <View style={styles.sidebarButtonContent}>
                <View style={[styles.categoryIconContainer, { backgroundColor: '#2196F320' }]}>
                  <ShoppingBag size={20} color="#2196F3" />
                </View>
                <Text style={[
                  styles.sidebarButtonText,
                  hoveredCategory === '__todos__' && styles.sidebarButtonTextHovered,
                ]}>Todos</Text>
              </View>
              <View style={[styles.categoryAccent, { backgroundColor: '#2196F3' }]} />
            </Pressable>
            {categories.map((cat) => {
              const { Icon, color } = getCategoryIcon(cat);
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.sidebarButton,
                    cat === category && styles.sidebarButtonActive,
                    hoveredCategory === cat && styles.sidebarButtonHovered,
                  ]}
                  onPress={() => goToCategory(cat)}
                  {...({
                    onMouseEnter: () => setHoveredCategory(cat),
                    onMouseLeave: () => setHoveredCategory(null),
                  } as any)}
                >
                  <View style={styles.sidebarButtonContent}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: `${color}20` }]}>
                      <Icon size={20} color={color} />
                    </View>
                    <Text style={[
                      styles.sidebarButtonText,
                      cat === category && styles.sidebarButtonTextActive,
                      hoveredCategory === cat && styles.sidebarButtonTextHovered,
                    ]}>{cat}</Text>
                  </View>
                  <View style={[styles.categoryAccent, { backgroundColor: color }]} />
                </Pressable>
              );
            })}
            </ScrollView>
          </View>
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
                {renderBanner()}
                {sections.map(renderCategoryBlock)}
              </ScrollView>
            )}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  contentWrap: {
    flex: 1,
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
  searchIcon: {
    marginRight: 8,
  },
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
  mobileLojaLabel: {
    fontSize: 12,
    color: '#666',
  },
  mobileLojaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mobileLojaName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  mobileHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  mobileIconBtnPressed: { opacity: 0.7 },
  mobileCartCount: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
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
  mobileCategoryChipActive: {
    backgroundColor: '#2196F3',
  },
  mobileCategoryChipText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  mobileCategoryChipTextActive: {
    color: '#fff',
  },
  mobileBackBtn: {
    marginRight: -30,
    padding: 4,
  },
  webBackButton: {
    marginRight: -30,
    padding: 4,
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
  sidebarScroll: {
    flex: 1,
  },
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
  sidebarButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  sidebarButtonHovered: {
    backgroundColor: '#f5f5f5',
    borderColor: '#2196F3',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    transform: [{ translateX: 4 }],
  },
  sidebarBackButton: {
    marginTop: 32,
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
  sidebarButtonTextActive: {
    color: '#1976d2',
  },
  sidebarButtonTextHovered: {
    color: '#1976d2',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  bannerContainer: {
    height: 240,
    position: 'relative',
    width: '100%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerSlide: {
    height: 240,
    borderRadius: 12,
  },
  bannerControls: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bannerArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerArrowDisabled: {
    opacity: 0.3,
  },
  bannerDots: {
    flexDirection: 'row',
    gap: 8,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  bannerDotActive: {
    backgroundColor: '#fff',
    width: 24,
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
  quantityControlSymbol: {
    fontFamily: 'BricolageGrotesque_700Bold',
    color: '#fff',
    fontSize: 16,
  },
  quantityControlSymbolDisabled: {
    opacity: 0.4,
  },
  quantityControlValue: {
    fontFamily: 'BricolageGrotesque_700Bold',
    color: '#fff',
    fontSize: 13,
    minWidth: 24,
    textAlign: 'center',
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
    fontSize: 13,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  discountPercent: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 13,
    color: '#000',
    backgroundColor: '#d9e7f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#b8d4e8',
    marginLeft: 8,
  },
  productPrice: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 18,
    color: '#000',
    marginBottom: 4,
  },
  productPriceMobile: {
    fontFamily: 'BricolageGrotesque_700Bold',
    fontSize: 19,
    color: '#000',
    marginBottom: 4,
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
  },
  productNameMobile: {
    fontFamily: 'BricolageGrotesque_400Regular',
    fontSize: 15,
    color: '#333',
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
  quickAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#364661',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddButtonText: {
    fontFamily: 'BricolageGrotesque_700Bold',
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
});
