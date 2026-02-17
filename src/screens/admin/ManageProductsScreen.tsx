import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { ProductWithFinalPrice } from '../../models';
import { productService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  navigation: any;
}

export const ManageProductsScreen: React.FC<Props> = ({ navigation }) => {
  const [products, setProducts] = useState<ProductWithFinalPrice[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    if (user?.marketId) {
      const data = productService.getProductsByMarket(user.marketId);
      setProducts(data);
    }
  };

  const handleDelete = (productId: string, productName: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir "${productName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            productService.deleteProduct(productId);
            loadProducts();
            Alert.alert('Sucesso', 'Produto excluído com sucesso!');
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: { item: ProductWithFinalPrice }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productPrice}>Preço: R$ {item.price.toFixed(2)}</Text>
        <Text style={styles.productDiscount}>Desconto: {item.discount}%</Text>
        <Text style={styles.productStock}>Estoque: {item.stock}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditProduct', { product: item })}
        >
          <Pencil size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Trash2 size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gerenciar Produtos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Text style={styles.addButtonText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  productInfo: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    marginBottom: 2,
  },
  productDiscount: {
    fontSize: 14,
    marginBottom: 2,
  },
  productStock: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
