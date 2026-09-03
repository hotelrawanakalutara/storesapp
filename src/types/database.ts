export type TransactionType = "IN" | "OUT";

export interface Item {
  id: string;
  name: string;
  unit: string;
  reorder_limit: number;
  current_stock: number;
  created_at: string;
}

export interface DailySnapshot {
  id: string;
  item_id: string;
  date: string;
  opening_stock: number;
  stock_in: number;
  stock_out: number;
  closing_stock: number;
}

export interface Transaction {
  id: string;
  item_id: string;
  type: TransactionType;
  quantity: number;
  reason: string | null;
  created_by: string | null;
  timestamp: string;
}

export interface TodayInventoryRow {
  id: string;
  name: string;
  unit: string;
  reorder_limit: number;
  opening_stock: number;
  stock_in: number;
  stock_out: number;
  current_balance: number;
  low_stock: boolean;
}

export interface DailyReportRow {
  item_id: string;
  name: string;
  unit: string;
  reorder_limit: number;
  opening_stock: number;
  stock_in: number;
  stock_out: number;
  closing_stock: number;
}

export interface TransactionWithItem extends Transaction {
  items: { name: string; unit: string } | null;
}
