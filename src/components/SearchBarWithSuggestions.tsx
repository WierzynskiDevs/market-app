import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Search } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../models';
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from '../hooks/useDebouncedValue';
import { SearchSuggestionsDropdown } from './SearchSuggestionsDropdown';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SearchBarWithSuggestionsProps {
  products: ProductWithFinalPrice[];
  onSearchSubmit: (query: string) => void;
  placeholder?: string;
}

/**
 * Barra de busca com sugestões que mantém o estado internamente.
 * O dropdown só fecha ao clicar fora (na overlay), não ao interagir com os botões do dropdown.
 */
export const SearchBarWithSuggestions: React.FC<SearchBarWithSuggestionsProps> = ({
  products,
  onSearchSubmit,
  placeholder = 'Buscar produtos...',
}) => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [wrapperWidth, setWrapperWidth] = useState<number | null>(null);
  const [overlayOffset, setOverlayOffset] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<View>(null);

  const debouncedSearchText = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);

  const searchResults = useMemo(() => {
    const query = debouncedSearchText.trim().toLowerCase();
    if (query.length < 2) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query)),
    );
  }, [products, debouncedSearchText]);

  const hasEnoughText = debouncedSearchText.trim().length >= 2;
  const showDropdown = dropdownVisible && hasEnoughText;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setDropdownVisible(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Não fechamos o dropdown no blur — só ao clicar na overlay (fora)
  }, []);

  const closeDropdown = useCallback(() => {
    setDropdownVisible(false);
  }, []);

  const measureWrapper = useCallback(() => {
    wrapperRef.current?.measureInWindow((x, y) => {
      setOverlayOffset({ x, y });
    });
  }, []);

  useEffect(() => {
    if (showDropdown) measureWrapper();
  }, [showDropdown, measureWrapper]);

  const handleSubmit = useCallback(() => {
    const q = searchText.trim();
    if (q.length >= 2) {
      onSearchSubmit(q);
      setSearchText('');
    }
  }, [searchText, onSearchSubmit]);

  return (
    <View
      ref={wrapperRef}
      style={styles.wrapper}
      onLayout={(e) => setWrapperWidth(e.nativeEvent.layout.width)}
      collapsable={false}
    >
      {/* Overlay em tela cheia: ao clicar, fecha o dropdown. Fica atrás da barra e do dropdown (zIndex menor). */}
      {showDropdown && (
        <Pressable
          style={[
            styles.overlay,
            {
              top: -overlayOffset.y,
              left: -overlayOffset.x,
              width: SCREEN_WIDTH + overlayOffset.x,
              height: SCREEN_HEIGHT + overlayOffset.y,
            },
          ]}
          onPress={closeDropdown}
        />
      )}
      <View style={styles.contentAboveOverlay}>
      <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
        <TouchableOpacity
          onPress={handleSubmit}
          style={styles.searchIconTouchable}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Search
            size={18}
            color={isFocused ? '#2196F3' : '#888'}
            style={styles.searchIcon}
          />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, styles.inputOutlineReset]}
          placeholder={placeholder}
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#888"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor="#2196F3"
          editable
        />
      </View>
      {showDropdown && (
        <View style={styles.dropdownWrap} pointerEvents="box-none">
          <View style={[styles.dropdownInner, wrapperWidth != null && { width: wrapperWidth }]}>
            <SearchSuggestionsDropdown
              searchTerm={debouncedSearchText.trim()}
              results={searchResults}
            />
          </View>
        </View>
      )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    minWidth: 0,
    overflow: 'visible' as const,
  },
  overlay: {
    position: 'absolute',
    zIndex: 998,
    elevation: 998,
    cursor: 'default' as const,
  },
  contentAboveOverlay: {
    position: 'relative',
    zIndex: 1000,
    elevation: 1000,
  },
  inputRow: {
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
  inputRowFocused: {
    borderColor: '#2196F3',
    backgroundColor: '#fff',
  },
  searchIconTouchable: {
    marginRight: 8,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    minWidth: 0,
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  // Remove borda/outline preta de foco do navegador no input
  inputOutlineReset: {
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'transparent',
  } as any,
  dropdownWrap: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  dropdownInner: {
    width: '100%',
  },
});
