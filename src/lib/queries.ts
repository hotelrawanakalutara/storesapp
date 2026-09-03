import { supabase } from "@/lib/supabase";
import type {
  DailyReportRow,
  Item,
  TodayInventoryRow,
  TransactionType,
  TransactionWithItem,
} from "@/types/database";

/** Rolls yesterday's closing balance into today's opening balance for every
 * item that doesn't have a snapshot row for today yet, then returns today's
 * dashboard view (opening / in / out / current balance / low-stock flag). */
export async function getTodayInventory(): Promise<TodayInventoryRow[]> {
  const { error: rollError } = await supabase.rpc("ensure_today_snapshots");
  if (rollError) throw rollError;

  const { data, error } = await supabase
    .from("v_today_inventory")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as TodayInventoryRow[];
}

export async function getItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Item[];
}

export async function addItem(input: {
  name: string;
  unit: string;
  reorder_limit: number;
}): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .insert({
      name: input.name.trim(),
      unit: input.unit.trim() || "pcs",
      reorder_limit: input.reorder_limit,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function recordTransaction(input: {
  itemId: string;
  type: TransactionType;
  quantity: number;
  reason: string;
  createdBy?: string;
}) {
  const { data, error } = await supabase.rpc("record_transaction", {
    p_item_id: input.itemId,
    p_type: input.type,
    p_quantity: input.quantity,
    p_reason: input.reason || null,
    p_created_by: input.createdBy ?? null,
  });

  if (error) throw error;
  return data;
}

/** Full snapshot of a single past (or present) date: opening/in/out/closing
 * for every item, ordered by name. */
export async function getDailyReport(date: string): Promise<DailyReportRow[]> {
  const { data, error } = await supabase
    .from("daily_snapshots")
    .select("item_id, opening_stock, stock_in, stock_out, closing_stock, items(name, unit, reorder_limit)")
    .eq("date", date);

  if (error) throw error;

  type Row = {
    item_id: string;
    opening_stock: number;
    stock_in: number;
    stock_out: number;
    closing_stock: number;
    items: { name: string; unit: string; reorder_limit: number } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .map((row) => ({
      item_id: row.item_id,
      name: row.items?.name ?? "Unknown item",
      unit: row.items?.unit ?? "",
      reorder_limit: row.items?.reorder_limit ?? 0,
      opening_stock: row.opening_stock,
      stock_in: row.stock_in,
      stock_out: row.stock_out,
      closing_stock: row.closing_stock,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Full audit trail (who moved what, when, and why) for a single date. */
export async function getTransactionsForDate(date: string): Promise<TransactionWithItem[]> {
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59.999`;

  const { data, error } = await supabase
    .from("transactions")
    .select("*, items(name, unit)")
    .gte("timestamp", start)
    .lte("timestamp", end)
    .order("timestamp", { ascending: false });

  if (error) throw error;
  return data as unknown as TransactionWithItem[];
}
