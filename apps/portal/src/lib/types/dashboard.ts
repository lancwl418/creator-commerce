export interface RecommendedProduct {
  id: string;
  name: string;
  image: string | null;
  price: number | null;
}

export interface DashboardData {
  displayName: string;
  designCount: number;
  publishedCount: number;
  totalOrders: number;
  storeRevenue: number;
  storeEarnings: number;
  ordersRequiringAction: number;
  recommendedProducts: RecommendedProduct[];
}
