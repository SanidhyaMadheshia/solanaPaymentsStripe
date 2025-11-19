export interface ApiKey {
  id: string;
  user_id: string;
  key_name: string;
  key_prefix: string;
  key_hash: string;
  last_used_at: string | null;
  created_at: string;
}

// export interface Product {
//   id: string;
//   user_id: string;
//   name: string;
//   description: string;
//   active: boolean;
//   created_at: string;
//   updated_at: string;
// }

export interface ProductPrice {
  id: string;
  product_id: string;
  user_id: string;
  label: string;
  amount: number;
  currency: string;
  active: boolean;
  created_at: string;
}

export interface EventLog {
  id: string;
  user_id: string;
  event_type: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
export type Price = {
  id: string;
  product_id: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
};

export type Product = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  prices?: ProductPrice[]; // optional
};

export interface Invoice {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  priceId: string;

  amount: string;
  priceAmount: string;
  currency: string;
  numberOfItems: number;

  buyerEmail: string;
  solAddress: string | null;

  status: "PENDING" | "PAID" | "FAILED" | string;

  txHash: string | null;

  cancelUrl: string;
  successUrl: string;
  webhookUrl: string;

  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  paidAt: string | null;
}

export interface Session {
  id: string;
  invoiceId: string;

  buyerEmail: string;
  buyerWallet: string;

  status: "PENDING" | "COMPLETED" | "EXPIRED" | string;
  txHash : string ;
  
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  completedAt: string | null;
}
export interface InvoiceResponse {
  status: string;
  session: Session | null;   // session may exist or may be null
  invoice: Invoice;
}
