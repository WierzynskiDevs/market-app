import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Product } from '../../models';
import { productService } from '../../services';

interface Props {
  route: any;
  navigation: any;
}

export const EditProductScreen: React.FC<Props> = ({ route, navigation }) => {
  const { product } = route.params as { product: Product };

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [discount, setDiscount] = useState(product.discount.toString());
  const [category, setCategory] = useState(product.category);

  const handleSave = () => {
    const priceValue = parseFloat(price);
    const stockValue = parseInt(stock);
    const discountValue = parseFloat(discount);

    if (!name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }

    if (isNaN(priceValue) || priceValue < 0) {
      Alert.alert('Erro', 'Preço inválido');
      return;
    }

    if (isNaN(stockValue) || stockValue < 0) {
      Alert.alert('Erro', 'Estoque inválido');
      return;
    }

    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      Alert.alert('Erro', 'Desconto deve estar entre 0 e 100');
      return;
    }

    try {
      productService.updateProduct(product.id, {
        name,
        description,
        price: priceValue,
        stock: stockValue,
        discount: discountValue,
        category,
      });

      Alert.alert('Sucesso', 'Produto atualizado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Editar Produto</Text>

        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome do produto"
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição do produto"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Categoria</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="Categoria"
        />

        <Text style={styles.label}>Preço *</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Estoque *</Text>
        <TextInput
          style={styles.input}
          value={stock}
          onChangeText={setStock}
          placeholder="0"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Desconto (%) *</Text>
        <TextInput
          style={styles.input}
          value={discount}
          onChangeText={setDiscount}
          placeholder="0"
          keyboardType="decimal-pad"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salvar Alterações</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  input: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
