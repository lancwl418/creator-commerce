export interface BuyerOrderItem {
  title: string;
  variant: string | null;
  quantity: number;
  preview: string | null;
}

export interface BuyerOrder {
  id: number;
  name: string;
  createdAt: string;
  total: string;
  currency: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  statusUrl: string | null;
  items: BuyerOrderItem[];
}

export interface BuyerOrdersResponse {
  linked: boolean;
  orders: BuyerOrder[];
}

export type BuyerOrdersState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | ({ status: 'ready' } & BuyerOrdersResponse);
