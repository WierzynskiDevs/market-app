import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { reportService, ReportData } from '../../services';
import { useAuth } from '../../contexts/AuthContext';

export const ReportsScreen: React.FC = () => {
  const [report, setReport] = useState<ReportData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = () => {
    if (user?.marketId) {
      const data = reportService.generateMarketReport(user.marketId);
      setReport(data);
    }
  };

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Relatório de Vendas</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Geral</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Receita Total</Text>
              <Text style={styles.statValue}>R$ {report.totalRevenue.toFixed(2)}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total de Pedidos</Text>
              <Text style={styles.statValue}>{report.totalOrders}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pedidos Confirmados</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {report.confirmedOrders}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pedidos Pendentes</Text>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>
                {report.pendingOrders}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pedidos Cancelados</Text>
              <Text style={[styles.statValue, { color: '#F44336' }]}>
                {report.cancelledOrders}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Itens Vendidos</Text>
              <Text style={styles.statValue}>{report.totalItemsSold}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ticket Médio</Text>
              <Text style={styles.statValue}>
                R$ {report.averageOrderValue.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produtos Mais Vendidos</Text>

          {report.productSales.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma venda registrada</Text>
          ) : (
            report.productSales.map((product, index) => (
              <View key={product.productId} style={styles.productCard}>
                <Text style={styles.productRank}>#{index + 1}</Text>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.productName}</Text>
                  <Text style={styles.productStats}>
                    Quantidade vendida: {product.quantitySold}
                  </Text>
                  <Text style={styles.productRevenue}>
                    Receita: R$ {product.revenue.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  productCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productRank: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ccc',
    marginRight: 16,
    width: 50,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productStats: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
});
