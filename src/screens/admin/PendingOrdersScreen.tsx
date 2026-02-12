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
import { Order, OrderStatus } from '../../models';
import { orderService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  navigation: any;
}

export const PendingOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    if (user?.marketId) {
      const data = orderService.getOrdersByMarket(user.marketId);
      const pending = data.filter(o => o.status === OrderStatus.PENDING);
      setOrders(pending);
    }
  };

  const handleConfirm = (orderId: string) => {
    Alert.alert('Confirmar Pedido', 'Deseja confirmar este pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () => {
          try {
            orderService.confirmOrder(orderId);
            loadOrders();
            Alert.alert('Sucesso', 'Pedido confirmado!');
          } catch (error: any) {
            Alert.alert('Erro', error.message);
          }
        },
      },
    ]);
  };

  const handleCancel = (orderId: string) => {
    Alert.alert(
      'Cancelar Pedido',
      'Deseja cancelar este pedido? O estoque será restaurado.',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: () => {
            try {
              orderService.cancelOrder(orderId);
              loadOrders();
              Alert.alert('Sucesso', 'Pedido cancelado e estoque restaurado!');
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Pedido #{item.id}</Text>
        <Text style={styles.orderDate}>
          {new Date(item.createdAt).toLocaleString('pt-BR')}
        </Text>
      </View>

      <View style={styles.orderItems}>
        {item.items.map(orderItem => (
          <View key={orderItem.id} style={styles.orderItem}>
            <Text style={styles.itemName}>{orderItem.productName}</Text>
            <Text style={styles.itemQuantity}>
              {orderItem.quantity}x R$ {orderItem.unitPrice.toFixed(2)}
              {orderItem.discount > 0 && ` (${orderItem.discount}% OFF)`}
            </Text>
            <Text style={styles.itemSubtotal}>
              Subtotal: R$ {orderItem.subtotal.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.orderTotal}>
        Total: R$ {item.totalAmount.toFixed(2)}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton]}
          onPress={() => handleConfirm(item.id)}
        >
          <Text style={styles.actionButtonText}>Confirmar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => handleCancel(item.id)}
        >
          <Text style={styles.actionButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Pedidos Pendentes</Text>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum pedido pendente</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
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
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#888',
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemSubtotal: {
    fontSize: 14,
    color: '#4CAF50',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4CAF50',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
  },
});
