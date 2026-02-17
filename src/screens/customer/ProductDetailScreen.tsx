import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../../models';
import { useCart } from '../../contexts/CartContext';

interface Props {
  route: any;
  navigation: any;
}

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { product } = route.params as { product: ProductWithFinalPrice };
  const [quantity, setQuantity] = useState('1');
  const { addToCart, openCartModal } = useCart();

  const handleAddToCart = () => {
    const qty = parseInt(quantity);

    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Erro', 'Quantidade inválida');
      return;
    }

    if (qty > product.stock) {
      Alert.alert('Erro', `Estoque disponível: ${product.stock} unidades`);
      return;
    }

    try {
      addToCart(product, qty);
      Alert.alert('Sucesso', 'Produto adicionado ao carrinho!', [
        { text: 'Continuar comprando', onPress: () => navigation.goBack() },
        { text: 'Ir para o carrinho', onPress: () => openCartModal(navigation) },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const increment = () => {
    const current = parseInt(quantity) || 0;
    if (current < product.stock) {
      setQuantity((current + 1).toString());
    }
  };

  const decrement = () => {
    const current = parseInt(quantity) || 0;
    if (current > 1) {
      setQuantity((current - 1).toString());
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.description}>{product.description}</Text>

        <View style={styles.priceContainer}>
          {product.discount > 0 && (
            <>
              <Text style={styles.originalPrice}>R$ {product.price.toFixed(2)}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discount}% OFF</Text>
              </View>
            </>
          )}
          <Text style={styles.price}>R$ {product.finalPrice.toFixed(2)}</Text>
        </View>

        <Text style={styles.stock}>Estoque disponível: {product.stock}</Text>

        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantidade:</Text>
          <View style={styles.quantityControl}>
            <TouchableOpacity style={styles.button} onPress={decrement}>
              <Minus size={18} color="#333" />
            </TouchableOpacity>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.button} onPress={increment}>
              <Plus size={18} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
          <Text style={styles.addButtonText}>Adicionar ao Carrinho</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  stock: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  quantityContainer: {
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityInput: {
    backgroundColor: '#fff',
    width: 80,
    height: 40,
    marginHorizontal: 16,
    textAlign: 'center',
    fontSize: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
