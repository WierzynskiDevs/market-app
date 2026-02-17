import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  TextInput,
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
  Plus, 
  Minus, 
  ShoppingCart, 
  Search,
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
} from 'lucide-react-native';
import { ProductWithFinalPrice } from '../../models';
import { productService } from '../../services';
import { useCart } from '../../contexts/CartContext';
import { ProductDetailModal } from '../../components/ProductDetailModal';
import { getProductImageSource } from '../../utils/productImage';

const DEFAULT_PRODUCT_IMAGE = require('../../../assets/agua-sanitaria.png');

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

interface CartButtonsOverlayProps {
  product: ProductWithFinalPrice;
  cartQty: number;
  onQuickAdd: () => void;
  onQuantityChange: (newQty: number, e?: any) => void;
}

const SearchBar: React.FC<{ searchText: string; onChangeText: (text: string) => void }> = ({ searchText, onChangeText }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={styles.headerSearchWrapper}>
      <View style={[styles.headerSearchContainer, isFocused && styles.headerSearchContainerFocused]}>
        <Search size={18} color={isFocused ? "#2196F3" : "#888"} style={styles.searchIcon} />
        <TextInput
          style={styles.headerSearchInput}
          placeholder="Buscar produtos..."
          value={searchText}
          onChangeText={onChangeText}
          placeholderTextColor="#888"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor="#2196F3"
        />
      </View>
    </View>
  );
};

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
    'Frios': { Icon: Sandwich, color: '#FFEB3B' },
    'Laticínios': { Icon: Milk, color: '#E0E0E0' },
    'Mercearia': { Icon: ShoppingBag, color: '#795548' },
  };
  
  return iconMap[category] || { Icon: Package, color: '#757575' };
};

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

export const ProductsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { marketId, marketName } = route.params;
  const [products, setProducts] = useState<ProductWithFinalPrice[]>([]);
  const [searchText, setSearchText] = useState('');
  const { getTotalItems, addToCart, openCartModal, items, updateQuantity } = useCart();
  const { width } = useWindowDimensions();

  const isMobile = width < MOBILE_BREAKPOINT;
  const [categoryPage, setCategoryPage] = useState<Record<string, number>>({});
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithFinalPrice | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const categoryScrollRefs = useRef<Record<string, ScrollView | null>>({});

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

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        height: 90,
      },
      headerLeft: () => (
        <View style={styles.headerLeftContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={20} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.headerTitleText} numberOfLines={1}>{marketName}</Text>
        </View>
      ),
      headerTitleAlign: 'center',
      headerTitleContainerStyle: { flex: 1, left: 0, right: 0, justifyContent: 'center', alignItems: 'stretch' },
      headerTitle: () => <SearchBar searchText={searchText} onChangeText={setSearchText} />,
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerCartButton}
          onPress={() => openCartModal(navigation)}
        >
          <ShoppingCart size={20} color="#fff" />
          <Text style={styles.cartButtonText}>({getTotalItems()})</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, marketName, searchText, getTotalItems]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const sections = useMemo((): Section[] => {
    const query = searchText.trim().toLowerCase();
    const filtered = query
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query),
        )
      : products;

    const byCategory = filtered.reduce<Record<string, ProductWithFinalPrice[]>>(
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
  }, [products, searchText]);

  const handlePressCard = (product: ProductWithFinalPrice) => {
    if (product.stock === 0) {
      Alert.alert('Estoque Esgotado', 'Este produto não está disponível no momento.');
      return;
    }
    setSelectedProduct(product);
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

  const imageSize = itemSize - 24;
  const cardMinHeight = imageSize + 64;

  const renderProductCard = (product: ProductWithFinalPrice) => {
    const cartQty = items.find((i) => i.product.id === product.id)?.quantity ?? 0;
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
              {product.name}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
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

  const mainContent = (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={true}
      >
        {sections.map(renderCategoryBlock)}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isMobile ? (
        <View style={styles.mobileWrapper}>
          <View style={styles.categoryStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryStripContent}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoryCircle}
                  onPress={() => goToCategory(cat)}
                >
                  <Text style={styles.categoryCircleText} numberOfLines={1}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.mobileContent}>{mainContent}</View>
        </View>
      ) : (
        <View style={styles.webRow}>
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Categorias</Text>
            {categories.map((cat) => {
              const { Icon, color } = getCategoryIcon(cat);
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.sidebarButton,
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
                      hoveredCategory === cat && styles.sidebarButtonTextHovered,
                    ]}>{cat}</Text>
                  </View>
                  <View style={[styles.categoryAccent, { backgroundColor: color }]} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.mainContent}>{mainContent}</View>
        </View>
      )}
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
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerBackText: {
    fontSize: 24,
    marginRight: 12,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: 140,
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
    height: 50,
    width: '100%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headerSearchContainerFocused: {
    borderColor: '#2196F3',
    backgroundColor: '#fff',
  },
  searchIcon: {
    marginRight: 8,
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
  headerCartButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  categoryStrip: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryStripContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryCircleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  webRow: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
  sidebarButtonTextHovered: {
    color: '#1976d2',
  },
  mainContent: {
    flex: 1,
  },
  mobileWrapper: {
    flex: 1,
  },
  mobileContent: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 12,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingTop: 32,
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
  arrowButton: {
    width: 40,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  arrowDisabled: {
    backgroundColor: '#f5f5f5',
  },
  arrowText: {
    fontSize: 32,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  arrowTextDisabled: {
    color: '#ccc',
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
    minHeight: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    minWidth: 0,
  },
  productName: {
    fontFamily: 'BricolageGrotesque_400Regular',
    fontSize: 12,
    color: '#333',
  },
  productNameMobile: {
    fontFamily: 'BricolageGrotesque_400Regular',
    fontSize: 13,
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
  emptyCard: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
});
