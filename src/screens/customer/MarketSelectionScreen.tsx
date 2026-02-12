import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Market } from '../../models';
import { db } from '../../services';
import { useCart } from '../../contexts/CartContext';

interface Props {
  navigation: any;
}

export const MarketSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const { setMarket } = useCart();

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = () => {
    const data = db.getMarkets();
    setMarkets(data);
  };

  const handleSelectMarket = (market: Market) => {
    setMarket(market.id);
    navigation.navigate('Products', { marketId: market.id, marketName: market.name });
  };

  const renderMarket = ({ item }: { item: Market }) => (
    <TouchableOpacity
      style={styles.marketCard}
      onPress={() => handleSelectMarket(item)}
    >
      <Text style={styles.marketName}>{item.name}</Text>
      <Text style={styles.marketDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Selecione um Mercado</Text>
      <FlatList
        data={markets}
        renderItem={renderMarket}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
  },
  list: {
    padding: 16,
  },
  marketCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  marketName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  marketDescription: {
    fontSize: 14,
    color: '#666',
  },
});
