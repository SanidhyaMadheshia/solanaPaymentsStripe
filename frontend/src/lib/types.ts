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
  prices?: ProductPrice[]; // 👈 optional
};
