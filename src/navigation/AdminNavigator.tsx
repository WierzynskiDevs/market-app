import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { ManageProductsScreen } from '../screens/admin/ManageProductsScreen';
import { EditProductScreen } from '../screens/admin/EditProductScreen';
import { AddProductScreen } from '../screens/admin/AddProductScreen';
import { PendingOrdersScreen } from '../screens/admin/PendingOrdersScreen';
import { ReportsScreen } from '../screens/admin/ReportsScreen';
import { TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

export const AdminNavigator: React.FC = () => {
  const { logout } = useAuth();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Dashboard',
          headerRight: () => (
            <TouchableOpacity onPress={logout} style={{ marginRight: 16 }}>
              <Text style={{ color: '#F44336', fontWeight: 'bold' }}>Sair</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="ManageProducts"
        component={ManageProductsScreen}
        options={{ title: 'Produtos' }}
      />
      <Stack.Screen
        name="EditProduct"
        component={EditProductScreen}
        options={{ title: 'Editar Produto' }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: 'Novo Produto' }}
      />
      <Stack.Screen
        name="PendingOrders"
        component={PendingOrdersScreen}
        options={{ title: 'Pedidos' }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Relatórios' }}
      />
    </Stack.Navigator>
  );
};
