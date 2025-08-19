export interface Customer {
  id: number;
  customerName: string;
  phoneNumber: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  purchaseCount: number;
  minPrice: number | null;
  maxPrice: number | null;
}

export interface CustomerQuery {
  customerName?: string;
  address?: string;
  phoneNumber?: string;
  current?: string;
  pageSize?: string;
}

export interface CustomerListResponse {
  list: Array<{
    customerId: number;
    customerName: string;
    phoneNumber: string;
    address: string;
    purchasePower: string;
    purchaseCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    total: number;
    current: number;
    pageSize: number;
    totalPages: number;
  };
}