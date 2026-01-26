import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// Dashboard istatistikleri
export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      // Bugünkü siparişler
      todayOrders,
      todayRevenue,
      // Aylık veriler
      monthlyOrders,
      monthlyRevenue,
      // Genel istatistikler
      totalCustomers,
      activeCustomers,
      totalProducts,
      // Bekleyen işlemler
      pendingOrders,
      pendingDeliveries,
      lowStockCount,
      // Son siparişler
      recentOrders,
    ] = await Promise.all([
      prisma.order.count({
        where: { orderDate: { gte: today }, status: { not: 'CANCELLED' } },
      }),
      prisma.order.aggregate({
        where: { orderDate: { gte: today }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { orderDate: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
      }),
      prisma.order.aggregate({
        where: { orderDate: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.delivery.count({ where: { status: { in: ['PENDING', 'ASSIGNED'] } } }),
      prisma.warehouseStock.count({
        where: {
          quantity: { lte: prisma.warehouseStock.fields.reserved },
        },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { orderDate: 'desc' },
        include: {
          customer: { select: { companyName: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        today: {
          orders: todayOrders,
          revenue: todayRevenue._sum.totalAmount || 0,
        },
        monthly: {
          orders: monthlyOrders,
          revenue: monthlyRevenue._sum.totalAmount || 0,
        },
        customers: {
          total: totalCustomers,
          active: activeCustomers,
        },
        products: {
          total: totalProducts,
        },
        pending: {
          orders: pendingOrders,
          deliveries: pendingDeliveries,
          lowStock: lowStockCount,
        },
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Satış raporu
export const getSalesReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate as string) : new Date();

    const orders = await prisma.order.findMany({
      where: {
        orderDate: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
      orderBy: { orderDate: 'asc' },
      select: {
        orderDate: true,
        totalAmount: true,
        status: true,
      },
    });

    // Tarihe göre gruplama
    const groupedData: Record<string, { count: number; revenue: number }> = {};

    orders.forEach((order) => {
      let key: string;
      const date = new Date(order.orderDate);

      if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekNum = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = { count: 0, revenue: 0 };
      }
      groupedData[key].count++;
      groupedData[key].revenue += Number(order.totalAmount);
    });

    const chartData = Object.entries(groupedData).map(([date, data]) => ({
      date,
      orders: data.count,
      revenue: data.revenue,
    }));

    // Özet istatistikler
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      success: true,
      data: {
        chart: chartData,
        summary: {
          totalOrders,
          totalRevenue,
          avgOrderValue,
          period: { start, end },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Ürün raporu
export const getProductReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, limit = '20' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate as string) : new Date();

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          orderDate: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: parseInt(limit as string),
    });

    // Ürün detaylarını getir
    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        category: { select: { name: true } },
      },
    });

    const result = topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name,
        sku: product?.sku,
        category: product?.category?.name,
        totalQuantity: item._sum.quantity,
        totalRevenue: item._sum.total,
      };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri raporu
export const getCustomerReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, limit = '20' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate as string) : new Date();

    const topCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        orderDate: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
      take: parseInt(limit as string),
    });

    // Müşteri detaylarını getir
    const customerIds = topCustomers.map((c) => c.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        code: true,
        companyName: true,
        type: true,
        salesRep: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const result = topCustomers.map((item) => {
      const customer = customers.find((c) => c.id === item.customerId);
      return {
        customerId: item.customerId,
        customerCode: customer?.code,
        companyName: customer?.companyName,
        type: customer?.type,
        salesRep: customer?.salesRep
          ? `${customer.salesRep.firstName} ${customer.salesRep.lastName}`
          : null,
        totalOrders: item._count.id,
        totalRevenue: item._sum.totalAmount,
      };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Teslimat raporu
export const getDeliveryReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate as string) : new Date();

    const [
      total,
      delivered,
      failed,
      pending,
      byDriver,
    ] = await Promise.all([
      prisma.delivery.count({
        where: { plannedDate: { gte: start, lte: end } },
      }),
      prisma.delivery.count({
        where: { plannedDate: { gte: start, lte: end }, status: 'DELIVERED' },
      }),
      prisma.delivery.count({
        where: { plannedDate: { gte: start, lte: end }, status: 'FAILED' },
      }),
      prisma.delivery.count({
        where: { plannedDate: { gte: start, lte: end }, status: { in: ['PENDING', 'ASSIGNED'] } },
      }),
      prisma.delivery.groupBy({
        by: ['driverId'],
        where: {
          plannedDate: { gte: start, lte: end },
          driverId: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    // Teslimatçı detayları
    const driverIds = byDriver.map((d) => d.driverId).filter(Boolean) as string[];
    const drivers = await prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const driverStats = byDriver.map((item) => {
      const driver = drivers.find((d) => d.id === item.driverId);
      return {
        driverId: item.driverId,
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : 'Bilinmiyor',
        totalDeliveries: item._count.id,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          total,
          delivered,
          failed,
          pending,
          successRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0,
        },
        byDriver: driverStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Ödeme raporu
export const getPaymentReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate as string) : new Date();

    const [
      totalPayments,
      byType,
      byDate,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          paymentDate: { gte: start, lte: end },
          status: 'COMPLETED',
        },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ['type'],
        where: {
          paymentDate: { gte: start, lte: end },
          status: 'COMPLETED',
        },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where: {
          paymentDate: { gte: start, lte: end },
          status: 'COMPLETED',
        },
        select: {
          paymentDate: true,
          amount: true,
        },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    // Günlük gruplama
    const dailyData: Record<string, number> = {};
    byDate.forEach((payment) => {
      const date = new Date(payment.paymentDate).toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + Number(payment.amount);
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalCount: totalPayments._count.id,
          totalAmount: totalPayments._sum.amount || 0,
        },
        byType: byType.map((t) => ({
          type: t.type,
          count: t._count.id,
          amount: t._sum.amount,
        })),
        daily: Object.entries(dailyData).map(([date, amount]) => ({
          date,
          amount,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Stok raporu
export const getStockReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { warehouseId, categoryId } = req.query;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const productWhere: any = {};
    if (categoryId) productWhere.categoryId = categoryId;

    const stocks = await prisma.warehouseStock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            minStock: true,
            costPrice: true,
            basePrice: true,
            category: { select: { name: true } },
          },
          where: productWhere,
        },
        warehouse: {
          select: { name: true },
        },
      },
    });

    // Stok değeri hesapla
    let totalValue = 0;
    let totalCost = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const stockData = stocks
      .filter((s) => s.product)
      .map((stock) => {
        const quantity = Number(stock.quantity) - Number(stock.reserved);
        const value = quantity * Number(stock.product.basePrice);
        const cost = quantity * Number(stock.product.costPrice || 0);

        totalValue += value;
        totalCost += cost;

        if (quantity <= 0) outOfStockCount++;
        else if (quantity <= stock.product.minStock) lowStockCount++;

        return {
          warehouseName: stock.warehouse.name,
          productId: stock.product.id,
          productName: stock.product.name,
          sku: stock.product.sku,
          category: stock.product.category?.name,
          unit: stock.product.unit,
          quantity: stock.quantity,
          reserved: stock.reserved,
          available: quantity,
          minStock: stock.product.minStock,
          value,
          status: quantity <= 0 ? 'OUT_OF_STOCK' : quantity <= stock.product.minStock ? 'LOW' : 'OK',
        };
      });

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: stockData.length,
          totalValue,
          totalCost,
          potentialProfit: totalValue - totalCost,
          lowStockCount,
          outOfStockCount,
        },
        stocks: stockData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Satış temsilcisi performansı
export const getSalesRepPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate as string) : new Date();

    const salesReps = await prisma.user.findMany({
      where: { role: 'SALES_REP', status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            assignedCustomers: true,
          },
        },
      },
    });

    const performance = await Promise.all(
      salesReps.map(async (rep) => {
        const orders = await prisma.order.aggregate({
          where: {
            createdById: rep.id,
            orderDate: { gte: start, lte: end },
            status: { not: 'CANCELLED' },
          },
          _count: { id: true },
          _sum: { totalAmount: true },
        });

        const payments = await prisma.payment.aggregate({
          where: {
            collectedBy: rep.id,
            paymentDate: { gte: start, lte: end },
            status: 'COMPLETED',
          },
          _sum: { amount: true },
        });

        const visits = await prisma.customerVisit.count({
          where: {
            userId: rep.id,
            visitDate: { gte: start, lte: end },
          },
        });

        return {
          id: rep.id,
          name: `${rep.firstName} ${rep.lastName}`,
          customerCount: rep._count.assignedCustomers,
          orderCount: orders._count.id,
          totalSales: orders._sum.totalAmount || 0,
          totalCollections: payments._sum.amount || 0,
          visitCount: visits,
        };
      })
    );

    res.json({
      success: true,
      data: performance.sort((a, b) => Number(b.totalSales) - Number(a.totalSales)),
    });
  } catch (error) {
    next(error);
  }
};

// Rapor export
export const exportReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reportType, format, ...params } = req.body;

    // TODO: Gerçek export implementasyonu (Excel, PDF vb.)
    // Şimdilik JSON döndürüyoruz

    res.json({
      success: true,
      message: 'Export özelliği yakında eklenecek',
      data: {
        reportType,
        format,
        params,
      },
    });
  } catch (error) {
    next(error);
  }
};
