import { OrderStatus } from '../models';
import { db } from './database.service';

export interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalItemsSold: number;
  averageOrderValue: number;
  productSales: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
}

export class ReportService {
  generateMarketReport(marketId: string): ReportData {
    const orders = db.getOrdersByMarketId(marketId);

    const confirmedOrders = orders.filter(o => o.status === OrderStatus.CONFIRMED);
    const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);
    const cancelledOrders = orders.filter(o => o.status === OrderStatus.CANCELLED);

    const totalRevenue = confirmedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalItemsSold = confirmedOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    const productSalesMap = new Map<string, { productName: string; quantity: number; revenue: number }>();

    confirmedOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = productSalesMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productSalesMap.set(item.productId, {
            productName: item.productName,
            quantity: item.quantity,
            revenue: item.subtotal,
          });
        }
      });
    });

    const productSales = Array.from(productSalesMap.entries()).map(([productId, data]) => ({
      productId,
      productName: data.productName,
      quantitySold: data.quantity,
      revenue: Math.round(data.revenue * 100) / 100,
    }));

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders: orders.length,
      confirmedOrders: confirmedOrders.length,
      pendingOrders: pendingOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalItemsSold,
      averageOrderValue: confirmedOrders.length > 0
        ? Math.round((totalRevenue / confirmedOrders.length) * 100) / 100
        : 0,
      productSales: productSales.sort((a, b) => b.quantitySold - a.quantitySold),
    };
  }
}

export const reportService = new ReportService();
