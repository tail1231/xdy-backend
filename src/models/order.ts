import { Context } from 'koa';

export interface OrderQuery {
  startDate?: string;
  endDate?: string;
  customerName?: string;
  phoneNumber?: string;
  address?: string;
  category_id?: string;
  model?: string;
  current?: string;
  pageSize?: string;
  noPagination?: boolean;
}

export interface CreateOrderRequest {
  customerName: string;
  phoneNumber: string;
  province: {
    label: string;
    value: string;
    key: string;
  };
  city: {
    label: string;
    value: string;
    key: string;
  };
  district: {
    label: string;
    value: string;
    key: string;
  };
  address: string;
  category_id?: number;
  brand?: string;
  model: string;
  isNew: 0 | 1;
  price: number;
  quantity: number;
  purchaseTime: string;
  paymentMethod: 1 | 2 | 3 | 4;
  notes?: string;
  profit?: number;

}

export interface UpdateOrderRequest {
  username?: string;
  phoneNumber?: string;
  address?: string;
  category_id?: number;
  brand?: string;
  model?: string;
  isNew?: 0 | 1;
  price?: number;
  quantity?: number;
  paymentMethod?: 1 | 2 | 3 | 4;
  notes?: string;
  profit?: number;
  purchaseTime?: string; // ISO格式的时间字符串，如：2025-08-18T11:41:15.800Z
}

export interface OrderListResponse {
  list: Array<{
    orderId: number;
    customerName: string;
    phoneNumber: string;
    address: string;

    categoryId: number;
    categoryName: string;
    brand: string;
    model: string;
    isNew: 0 | 1;
    price: number;
    quantity: number;
    paymentMethod: number | string;
    notes: string;
    createdAt: string;
    updatedAt: string;
    purchaseTime: string;
  }>;
  pagination: {
    total: number;
    current: number;
    pageSize: number;
    totalPages: number;
  } | null;
}

export interface OrderDetailResponse {
  id: number;
  customerName: string;
  phoneNumber: string;
  address: string;
  category_id: number;
  category_name: string;
  brand: string;
  model: string;
  isNew: 0 | 1;
  price: number;
  quantity: number;
  paymentMethod: number;
  notes: string;
  profit?: number;
  createdAt: string;
  updatedAt: string;
  purchaseTime: string;
}