import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  SectionList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  useWindowDimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { ArrowLeft, Plus, Minus, ShoppingCart, ChevronDown, Search, ShoppingBag, User, Utensils, GlassWater, Sparkles, ShowerHead, Croissant, Drumstick, Apple, Sandwich, Milk, Package, Snowflake } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../../models';
import { productService } from '../../services';
import { useCart } from '../../contexts/CartContext';
import { ProductDetailModal } from '../../components/ProductDetailModal';
import { SearchSuggestionsDropdown } from '../../components/SearchSuggestionsDropdown';
import { getProductImageSource } from '../../utils/productImage';
import { truncateProductName } from '../../utils/productName';

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

const SearchBar: React.FC<{
  searchText: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSearchSubmit?: () => void;
}> = ({ searchText, onChangeText, placeholder = 'Buscar produtos...', onSearchSubmit }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (searchText.trim().length >= 2 && onSearchSubmit) onSearchSubmit();
  };

  return (
    <View style={styles.headerSearchWrapper}>
      <View style={[styles.headerSearchContainer, isFocused && styles.headerSearchContainerFocused]}>
        <TouchableOpacity
          onPress={handleSubmit}
          style={styles.searchIconTouchable}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Search size={18} color={isFocused ? "#2196F3" : "#888"} style={[styles.searchIcon, { outlineStyle: 'none', outlineWidth: 0 } as any]} />
        </TouchableOpacity>
        <TextInput
          style={[styles.headerSearchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
          placeholder={placeholder}
          value={searchText}
          onChangeText={onChangeText}
          placeholderTextColor="#888"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor="#2196F3"
          editable={true}
        />
      </View>
    </View>
  );
};

const DEFAULT_PRODUCT_IMAGE = require('../../../assets/agua-sanitaria.png');

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

export const SearchResultsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { marketId, marketName, searchQuery } = route.params;
  const [products, setProducts] = useState<ProductWithFinalPrice[]>([]);
  const [searchText, setSearchText] = useState('');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithFinalPrice | null>(null);
  const [searchBarWidth, setSearchBarWidth] = useState<number | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const { getTotalItems, addToCart, openCartModal, items, updateQuantity, setMarket } = useCart();
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

  // Sugestões do dropdown enquanto digita (filtro por searchText)
  const dropdownSuggestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (query.length < 2) return [];
    return allMarketProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query)),
    );
  }, [allMarketProducts, searchText]);

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

  const handleSearchSubmit = useCallback(() => {
    const q = searchText.trim();
    if (q.length >= 2) {
      navigation.replace('SearchResults', { marketId, marketName, searchQuery: q });
      setSearchText('');
    }
  }, [searchText, marketId, marketName, navigation]);

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
                      <Text style={styles.mobileLojaName} numberOfLines={1}>{marketName} · "{searchQuery}"</Text>
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
                    <TouchableOpacity
                      onPress={handleSearchSubmit}
                      style={styles.searchIconTouchable}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Search size={18} color="#888" style={[styles.searchIcon, { outlineStyle: 'none', outlineWidth: 0 } as any]} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.headerSearchInput, styles.mobileSearchInput, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                      placeholder="Leite, arroz, pão, vinho, frutas..."
                      value={searchText}
                      onChangeText={setSearchText}
                      placeholderTextColor="#999"
                      selectionColor="#2196F3"
                      editable={true}
                      onSubmitEditing={handleSearchSubmit}
                      returnKeyType="search"
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
              <View
                style={styles.headerSearchBarWrap}
                onLayout={(e) => setSearchBarWidth(e.nativeEvent.layout.width)}
              >
                <SearchBar searchText={searchText} onChangeText={setSearchText} placeholder="Buscar produtos..." onSearchSubmit={handleSearchSubmit} />
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
  }, [navigation, marketName, searchQuery, searchText, getTotalItems, isMobile, categories, openCartModal, handleSearchSubmit]);

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
          listContent
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
                  style={[styles.sidebarButton, hoveredCategory === '__todos__' && styles.sidebarButtonHovered]}
                  onPress={goToAllProducts}
                  {...({ onMouseEnter: () => setHoveredCategory('__todos__'), onMouseLeave: () => setHoveredCategory(null) } as any)}
                >
                  <View style={styles.sidebarButtonContent}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: '#2196F320' }]}>
                      <ShoppingBag size={20} color="#2196F3" />
                    </View>
                    <Text style={[styles.sidebarButtonText, hoveredCategory === '__todos__' && styles.sidebarButtonTextHovered]}>Todos</Text>
                  </View>
                  <View style={[styles.categoryAccent, { backgroundColor: '#2196F3' }]} />
                </Pressable>
                {categories.map((cat) => {
                  const { Icon, color } = getCategoryIcon(cat);
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.sidebarButton, hoveredCategory === cat && styles.sidebarButtonHovered]}
                      onPress={() => goToCategory(cat)}
                      {...({ onMouseEnter: () => setHoveredCategory(cat), onMouseLeave: () => setHoveredCategory(null) } as any)}
                    >
                      <View style={styles.sidebarButtonContent}>
                        <View style={[styles.categoryIconContainer, { backgroundColor: `${color}20` }]}>
                          <Icon size={20} color={color} />
                        </View>
                        <Text style={[styles.sidebarButtonText, hoveredCategory === cat && styles.sidebarButtonTextHovered]}>{cat}</Text>
                      </View>
                      <View style={[styles.categoryAccent, { backgroundColor: color }]} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.mainContent}>
              {listContent}
            </View>
          </View>
        )}
      </View>
      {searchText.trim().length >= 2 && searchText.trim() !== (searchQuery || '').trim() && (
        <View style={styles.searchDropdownWrap} pointerEvents="box-none">
          <View style={[styles.searchDropdownInner, searchBarWidth != null && { width: searchBarWidth }]}>
            <SearchSuggestionsDropdown searchTerm={searchText.trim()} results={dropdownSuggestions} />
          </View>
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
  productCardHover: { borderColor: '#555' },
  productCardTouchable: { flex: 1, minWidth: 0 },
  imageWrapper: { position: 'relative' },
  productImage: { borderRadius: 6, marginBottom: 6 },
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
  quickAddButtonOverlayHover: { backgroundColor: '#4a5d7a' },
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
