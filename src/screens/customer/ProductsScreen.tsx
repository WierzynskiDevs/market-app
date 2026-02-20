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
  Platform,
} from 'react-native';
import { 
  ArrowLeft, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus, 
  Minus, 
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
import { ProductDetailModal } from '../../components/ProductDetailModal';
import { SearchBarWithSuggestions } from '../../components/SearchBarWithSuggestions';
import { AuthModal } from '../../components/AuthModal';
import { getProductImageSource } from '../../utils/productImage';
import { truncateProductName } from '../../utils/productName';
const DEFAULT_PRODUCT_IMAGE = require('../../../assets/agua-sanitaria.png');
const IS_WEB = Platform.OS === 'web';

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
  const handleSearchSubmit = useCallback((query: string) => {
    if (query.length >= 2) {
      navigation.navigate('SearchResults', { marketId, marketName, searchQuery: query });
    }
  }, [marketId, marketName, navigation]);

  const { getTotalItems, addToCart, openCartModal, items, updateQuantity, setMarket } = useCart();
  const { width } = useWindowDimensions();

  const isMobile = width < MOBILE_BREAKPOINT;
  const [categoryPage, setCategoryPage] = useState<Record<string, number>>({});
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithFinalPrice | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const marketDropdownWrapperIdRef = useRef('market-dd-' + Math.random().toString(36).slice(2));
  const userDropdownWrapperIdRef = useRef('user-dd-' + Math.random().toString(36).slice(2));
  const categoryScrollRefs = useRef<Record<string, ScrollView | null>>({});
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const { user, logout } = useAuth();

  // Fechar dropdown Loja ao clicar fora (web: listener no document; mobile usa overlay)
  useEffect(() => {
    if (!IS_WEB || !marketDropdownOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const el = document.getElementById(marketDropdownWrapperIdRef.current);
      if (el && !el.contains(e.target as Node)) setMarketDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [marketDropdownOpen]);

  // Fechar dropdown Usuário ao clicar fora (web: listener no document; mobile usa overlay)
  useEffect(() => {
    if (!IS_WEB || !userDropdownOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const el = document.getElementById(userDropdownWrapperIdRef.current);
      if (el && !el.contains(e.target as Node)) setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [userDropdownOpen]);

  // Define o mercado selecionado no contexto do carrinho (setMarket estável via useCallback no contexto)
  useEffect(() => {
    setMarket(marketId);
  }, [marketId, setMarket]);

  useEffect(() => {
    const markets = db.getMarkets();
    setAllMarkets(markets);
  }, []);

  const handleChangeMarket = useCallback((market: Market) => {
    setMarketDropdownOpen(false);
    navigation.push('Products', { marketId: market.id, marketName: market.name });
  }, [navigation]);

  const banners = [
    { id: 1, color: '#2196F3' }, // Azul
    { id: 2, color: '#F44336' }, // Vermelho
    { id: 3, color: '#4CAF50' }, // Verde
    { id: 4, color: '#FF9800' }, // Laranja
  ];

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
    return isMobile ? width : width - 280; // Subtrai a largura da sidebar no desktop
  }, [width, isMobile]);

  const handleBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / bannerWidth);
    setBannerIndex(newIndex);
  };

  const goToBanner = (index: number) => {
    setBannerIndex(index);
    bannerScrollRef.current?.scrollTo({
      x: index * bannerWidth,
      animated: true,
    });
  };

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

  useEffect(() => {
    navigation.setOptions(
          isMobile
        ? {
            headerStyle: { minHeight: 200 },
            header: () => (
              <View style={styles.mobileHeaderRoot}>
                <View style={styles.mobileHeaderRow1}>
                  <View style={styles.mobileLogoSmall}>
                    <ShoppingBag size={22} color="#2196F3" strokeWidth={2.5} />
                    <Text style={styles.mobileLogoText}>MARKET</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mobileLojaSelector}
                    onPress={() => navigation.navigate('Markets')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mobileLojaLabel}>Loja de</Text>
                    <View style={styles.mobileLojaRow}>
                      <Text style={styles.mobileLojaName} numberOfLines={1}>{marketName}</Text>
                      <ChevronDown size={16} color="#333" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.mobileHeaderIcons}>
                    <View style={styles.mobileUserButtonContainer}>
                      <Pressable
                        style={(s: { pressed: boolean }) => [styles.mobileIconBtn, s.pressed && styles.mobileIconBtnPressed]}
                        onPress={() => {
                          if (user) {
                            setUserDropdownOpen(!userDropdownOpen);
                          } else {
                            setAuthModalVisible(true);
                          }
                        }}
                      >
                        <User size={22} color="#2196F3" />
                      </Pressable>
                      {user && userDropdownOpen && (
                        <View style={styles.mobileUserDropdownMenu}>
                          <Pressable
                            style={(s: { pressed: boolean }) => [
                              styles.mobileUserDropdownItem,
                              s.pressed && styles.mobileUserDropdownItemPressed,
                            ]}
                            onPress={() => {
                              setUserDropdownOpen(false);
                              navigation.navigate('Account');
                            }}
                          >
                            <Text style={styles.mobileUserDropdownItemText}>Minha Conta</Text>
                          </Pressable>
                          <Pressable
                            style={(s: { pressed: boolean }) => [
                              styles.mobileUserDropdownItem,
                              styles.mobileUserDropdownItemDanger,
                              s.pressed && styles.mobileUserDropdownItemDangerPressed,
                            ]}
                            onPress={() => {
                              setUserDropdownOpen(false);
                              logout();
                            }}
                          >
                            <Text style={styles.mobileUserDropdownItemTextDanger}>Sair</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
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
                      products={products}
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
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.mobileCategoryChip}
                      onPress={() => goToCategory(cat)}
                    >
                      <Text style={styles.mobileCategoryChipText} numberOfLines={1}>{cat}</Text>
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
                <View style={styles.marketLogoPlaceholder}>
                  <View style={styles.logoIconContainer}>
                    <ShoppingBag size={32} color="#2196F3" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.logoText}>MARKET</Text>
                </View>
                <View nativeID={marketDropdownWrapperIdRef.current} style={styles.marketDropdownWrapper}>
                  <View style={styles.marketSelectorContainer}>
                    <Pressable
                      style={(state: { pressed: boolean; hovered?: boolean }) => [
                        styles.marketSelectorButton,
                        (state.hovered || state.pressed) && styles.marketSelectorButtonHover,
                      ]}
                      onPress={() => setMarketDropdownOpen(!marketDropdownOpen)}
                    >
                      <Text style={styles.marketSelectorLabel}>Loja:</Text>
                      <Text style={styles.marketSelectorName} numberOfLines={1}>{marketName}</Text>
                      <ChevronDown size={18} color="#666" />
                    </Pressable>
                    {marketDropdownOpen && (
                      <View style={styles.marketDropdownMenu}>
                        <ScrollView style={styles.marketDropdownScroll} showsVerticalScrollIndicator={true}>
                          {allMarkets.map((market) => (
                            <Pressable
                              key={market.id}
                              style={(state: { pressed: boolean; hovered?: boolean }) => [
                                styles.marketDropdownItem,
                                market.id === marketId && styles.marketDropdownItemActive,
                                state.hovered && styles.marketDropdownItemHover,
                              ]}
                              onPress={() => handleChangeMarket(market)}
                            >
                              <Text style={[
                                styles.marketDropdownItemName,
                                market.id === marketId && styles.marketDropdownItemNameActive,
                              ]}>
                                {market.name}
                              </Text>
                              <Text style={styles.marketDropdownItemLocation}>
                                {market.city} - {market.neighborhood}
                              </Text>
                            </Pressable>
                          ))}
                          <Pressable
                            style={(state: { pressed: boolean; hovered?: boolean }) => [
                              styles.marketDropdownViewAll,
                              state.hovered && styles.marketDropdownViewAllHover,
                            ]}
                            onPress={() => {
                              setMarketDropdownOpen(false);
                              navigation.navigate('Markets');
                            }}
                          >
                            <Text style={styles.marketDropdownViewAllText}>Ver todos os mercados</Text>
                          </Pressable>
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ),
            headerTitleAlign: 'center',
            headerTitleContainerStyle: { flex: 1, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
            headerTitle: () => (
              <View style={styles.headerSearchBarWrap}>
                <SearchBarWithSuggestions products={products} onSearchSubmit={handleSearchSubmit} />
              </View>
            ),
            headerRight: () => (
              <View style={styles.headerRightContainer}>
                <View nativeID={userDropdownWrapperIdRef.current} style={styles.userDropdownWrapper}>
                  <View style={styles.userButtonContainer}>
                    <Pressable
                      style={(state: { pressed: boolean; hovered?: boolean }) => [
                        styles.headerUserButton,
                        (state.hovered || state.pressed) && styles.headerUserButtonHover,
                      ]}
                      onPress={() => {
                        if (user) {
                          setUserDropdownOpen(!userDropdownOpen);
                        } else {
                          setAuthModalVisible(true);
                        }
                      }}
                    >
                      <User size={20} color="#2196F3" />
                      <Text style={styles.headerUserText}>
                        {user ? user.name.split(' ')[0] : 'Entrar'}
                      </Text>
                    </Pressable>
                    {user && userDropdownOpen && (
                      <View style={styles.userDropdownMenu}>
                        <Pressable
                          style={(state: { pressed: boolean; hovered?: boolean }) => [
                            styles.userDropdownItem,
                            state.hovered && styles.userDropdownItemHover,
                          ]}
                          onPress={() => {
                            setUserDropdownOpen(false);
                            navigation.navigate('Account');
                          }}
                        >
                          <Text style={styles.userDropdownItemText}>Minha Conta</Text>
                        </Pressable>
                        <Pressable
                          style={(state: { pressed: boolean; hovered?: boolean }) => [
                            styles.userDropdownItem,
                            styles.userDropdownItemDanger,
                            state.hovered && styles.userDropdownItemDangerHover,
                          ]}
                          onPress={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                        >
                          <Text style={styles.userDropdownItemTextDanger}>Sair</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
                <Pressable
                  style={(state: { pressed: boolean; hovered?: boolean }) => [
                    styles.headerCartButton,
                    (state.hovered || state.pressed) && styles.headerCartButtonHover,
                  ]}
                  onPress={() => openCartModal(navigation)}
                >
                  <ShoppingCart size={20} color="#fff" />
                  <Text style={styles.cartButtonText}>({getTotalItems()})</Text>
                </Pressable>
              </View>
            ),
          }
    );
  }, [navigation, marketName, getTotalItems, isMobile, categories, openCartModal, user, logout, marketDropdownOpen, userDropdownOpen, allMarkets, marketId, handleChangeMarket, handleSearchSubmit, products]);

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
              {truncateProductName(product.name)}
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

  const renderBanner = () => (
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrap}>
      {isMobile ? (
        <View style={styles.mobileWrapper}>
          {userDropdownOpen && (
            <Pressable
              style={styles.mobileDropdownOverlay}
              onPress={() => setUserDropdownOpen(false)}
            />
          )}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={true}
          >
            {renderBanner()}
            {sections.map(renderCategoryBlock)}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.webRow}>
          {!IS_WEB && (marketDropdownOpen || userDropdownOpen) && (
            <Pressable
              style={styles.dropdownOverlay}
              onPress={() => {
                setMarketDropdownOpen(false);
                setUserDropdownOpen(false);
              }}
            />
          )}
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
            <Pressable
              style={[
                styles.sidebarButton,
                styles.sidebarBackButton,
                hoveredCategory === '__voltar__' && styles.sidebarButtonHovered,
              ]}
              onPress={() => navigation.navigate('Markets')}
              {...({
                onMouseEnter: () => setHoveredCategory('__voltar__'),
                onMouseLeave: () => setHoveredCategory(null),
              } as any)}
            >
              <View style={styles.sidebarButtonContent}>
                <View style={[styles.categoryIconContainer, { backgroundColor: '#2196F320' }]}>
                  <ArrowLeft size={20} color="#2196F3" />
                </View>
                <Text style={[
                  styles.sidebarButtonText,
                  hoveredCategory === '__voltar__' && styles.sidebarButtonTextHovered,
                ]}>Voltar do mercado</Text>
              </View>
              <View style={[styles.categoryAccent, { backgroundColor: '#2196F3' }]} />
            </Pressable>
          </View>
          <View style={styles.mainContent}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={true}
            >
              {renderBanner()}
              {sections.map(renderCategoryBlock)}
            </ScrollView>
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
  headerSearchBarWrap: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
  },
  searchDropdownWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 0,
    zIndex: 10,
    elevation: 10,
    alignItems: 'center',
  },
  searchDropdownInner: {
    width: '100%',
    paddingHorizontal: 0,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoIconContainer: {
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3',
    letterSpacing: 1,
  },
  marketDropdownWrapper: {
    position: 'relative',
  },
  marketSelectorContainer: {
    marginLeft: 16,
    position: 'relative',
  },
  marketSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 200,
  },
  marketSelectorButtonHover: {
    backgroundColor: '#f5f5f5',
    borderColor: '#2196F3',
  },
  marketSelectorLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  marketSelectorName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  marketDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 400,
    zIndex: 1000,
  },
  marketDropdownScroll: {
    maxHeight: 400,
  },
  marketDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  marketDropdownItemHover: {
    backgroundColor: '#f5f5f5',
  },
  marketDropdownItemActive: {
    backgroundColor: '#e3f2fd',
  },
  marketDropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  marketDropdownItemNameActive: {
    color: '#2196F3',
  },
  marketDropdownItemLocation: {
    fontSize: 12,
    color: '#666',
  },
  marketDropdownViewAll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  marketDropdownViewAllHover: {
    backgroundColor: '#e3f2fd',
  },
  marketDropdownViewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
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
  headerUserButtonHover: {
    backgroundColor: '#e3f2fd',
  },
  headerUserText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  userDropdownWrapper: {
    position: 'relative',
  },
  userButtonContainer: {
    position: 'relative',
  },
  userDropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
    zIndex: 1001,
  },
  userDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userDropdownItemHover: {
    backgroundColor: '#f5f5f5',
  },
  userDropdownItemDanger: {
    borderBottomWidth: 0,
  },
  userDropdownItemDangerHover: {
    backgroundColor: '#ffebee',
  },
  userDropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  userDropdownItemTextDanger: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F44336',
  },
  headerCartButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerCartButtonHover: {
    backgroundColor: '#1976D2',
    shadowOpacity: 0.4,
  },
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
  mobileLojaSelector: {
    flex: 1,
  },
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
  mobileIconBtnPressed: {
    opacity: 0.7,
  },
  mobileCartCount: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  mobileUserButtonContainer: {
    position: 'relative',
  },
  mobileUserDropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 160,
    zIndex: 1002,
  },
  mobileUserDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mobileUserDropdownItemPressed: {
    backgroundColor: '#f5f5f5',
  },
  mobileUserDropdownItemDanger: {
    borderBottomWidth: 0,
  },
  mobileUserDropdownItemDangerPressed: {
    backgroundColor: '#ffebee',
  },
  mobileUserDropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  mobileUserDropdownItemTextDanger: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F44336',
  },
  mobileSearchRow: {
    marginBottom: 12,
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
  mobileSearchInput: {
    minHeight: 48,
    fontSize: 16,
  },
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
  cartButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
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
  sidebarButtonTextHovered: {
    color: '#1976d2',
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
    fontWeight: '500',
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
