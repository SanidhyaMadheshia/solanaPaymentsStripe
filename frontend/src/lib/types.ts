export type InvoiceStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
export type SessionStatus = "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "FAILED";

export interface Price {
  id: string;
  productId: string;
  label: string;
  amount: string;
  currency: string;
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  active: boolean;
  createdAt: string;
  prices: Price[];
}

export interface ApiKey {
  id: string;
  label: string | null;
  prefix: string;
  revoked: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface Merchant {
  id: string;
  name: string | null;
  email: string | null;
  createdAt?: string;
  walletAddress: string | null;
  defaultWebhookUrl: string | null;
}

export interface Invoice {
  id: string;
  productId: string | null;
  productName: string | null;
  priceId: string | null;
  priceAmount: string | null;
  amount: string;
  currency: string;
  numberOfItems: number;
  buyerEmail: string | null;
  buyerWallet: string | null;
  solAddress: string | null;
  status: InvoiceStatus;
  txHash: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  webhookUrl: string | null;
  webhookAttempts: number;
  webhookDeliveredAt: string | null;
  webhookLastError: string | null;
  webhookNextAttemptAt: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface InvoiceDetail extends Invoice {
  checkoutUrl: string;
  payments: { id: string; txHash: string; amount: string; status: string; confirmedAt: string | null }[];
  sessions: {
    id: string;
    status: SessionStatus;
    buyerWallet: string;
    txSignature: string | null;
    verifyError: string | null;
    createdAt: string;
    expiresAt: string;
    completedAt: string | null;
  }[];
}

export interface Overview {
  merchant: { name: string | null; walletAddress: string | null };
  setup: { hasWallet: boolean; hasProduct: boolean; hasApiKey: boolean; hasPayment: boolean };
  totals: { revenue: string; payments: number; invoices: number; paid: number; pending: number; expired: number; conversion: number };
  daily: { date: string; total: string; count: number }[];
  recentInvoices: Invoice[];
}

export interface CreatedInvoice {
  invoice_id: string;
  checkout_url: string;
  amount: string;
  currency: string;
  expires_at: string;
}

/* ---- Hosted checkout ---- */

export interface PublicInvoice {
  id: string;
  status: InvoiceStatus;
  productName: string | null;
  description: string | null;
  merchantName: string | null;
  priceAmount: string | null;
  amount: string;
  currency: string;
  numberOfItems: number;
  solAddress: string | null;
  buyerEmail: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  txHash: string | null;
}

export interface PublicSession {
  id: string;
  status: SessionStatus;
  buyerWallet: string;
  txHash: string; // base64 unsigned transaction
  txSignature: string | null;
  verifyError: string | null;
  expiresAt: string;
}

export interface CheckoutResponse {
  status: "awaiting_wallet" | "created" | "resumed" | "verifying" | "paid" | "expired" | "cancelled";
  invoice: PublicInvoice;
  session: PublicSession | null;
  ttl: number;
}

export interface CheckoutStatus {
  invoiceStatus: InvoiceStatus;
  txHash: string | null;
  successUrl: string | null;
  session: { id: string; status: SessionStatus; verifyError: string | null; txSignature: string | null } | null;
}

export interface PaymentReceipt {
  txnSignature: string;
  successUrl: string | null;
  amount: string;
  currency: string;
  productName: string | null;
  numberOfItems: number;
  paidAt: string | null;
  cluster: import("./config").Cluster;
}
