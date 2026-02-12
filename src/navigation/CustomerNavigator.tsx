import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MarketSelectionScreen } from '../screens/customer/MarketSelectionScreen';
import { ProductsScreen } from '../screens/customer/ProductsScreen';
import { ProductDetailScreen } from '../screens/customer/ProductDetailScreen';
import { CartScreen } from '../screens/customer/CartScreen';
import { TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

export const CustomerNavigator: React.FC = () => {
  const { logout } = useAuth();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Markets"
        component={MarketSelectionScreen}
        options={{
          title: 'Mercados',
          headerRight: () => (
            <TouchableOpacity onPress={logout} style={{ marginRight: 16 }}>
              <Text style={{ color: '#F44336', fontWeight: 'bold' }}>Sair</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="Products"
        component={ProductsScreen}
        options={{ title: 'Produtos' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Detalhes do Produto' }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'Carrinho' }}
      />
    </Stack.Navigator>
  );
};
