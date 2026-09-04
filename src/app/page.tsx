"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Minus, Plus, Search, UserPlus } from "lucide-react";
import InventoryTable from "@/components/InventoryTable";
import QuickEntryModal from "@/components/QuickEntryModal";
import AddItemModal from "@/components/AddItemModal";
import { getItems, getTodayInventory } from "@/lib/queries";
import type { Item, TodayInventoryRow, TransactionType } from "@/types/database";

export default function DashboardPage() {
  const [rows, setRows] = useState<TodayInventoryRow[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<TransactionType | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<TodayInventoryRow | null>(null);
  const [search, setSearch] = useState("");
  const lowStockCount = rows.filter((r) => r.low_stock).length;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [inventory, itemList] = await Promise.all([getTodayInventory(), getItems()]);
      setRows(inventory);
      setItems(itemList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    refresh();
  }, [refresh]);

  return (
    <div className="max-w-5xl mx-auto w-full px-4">
      {/* Sticky controls: stays pinned below the nav header while the item list scrolls underneath */}
      <div
        className="sticky z-30 bg-gray-50 pt-4 pb-3 space-y-3"
        style={{ top: "var(--nav-height, 0px)" }}
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModalType("IN")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-5 text-white text-lg font-bold shadow-sm active:bg-emerald-700 transition-colors"
          >
            <Plus size={24} strokeWidth={3} /> STOCK IN
          </button>
          <button
            onClick={() => setModalType("OUT")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-5 text-white text-lg font-bold shadow-sm active:bg-red-700 transition-colors"
          >
            <Minus size={24} strokeWidth={3} /> STOCK OUT
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Today&apos;s Inventory</h2>
          <button
            onClick={() => setShowAddItem(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 active:text-gray-700"
          >
            <UserPlus size={16} /> Add Item
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full rounded-xl border-2 border-gray-200 pl-10 pr-4 py-2.5 text-base focus:border-blue-500 focus:outline-none bg-white"
            />
          </div>
          {lowStockCount > 0 && (
            <span className="hidden sm:flex items-center gap-1 shrink-0 rounded-full bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5">
              <AlertTriangle size={14} /> {lowStockCount} low stock
            </span>
          )}
        </div>
      </div>

      <div className="pb-6">
        <InventoryTable rows={rows} loading={loading} search={search} onEditItem={setEditingItem} />
      </div>

      {modalType && (
        <QuickEntryModal
          type={modalType}
          items={items}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setModalType(null);
            refresh();
          }}
        />
      )}

      {showAddItem && (
        <AddItemModal
          onClose={() => setShowAddItem(false)}
          onSuccess={() => {
            setShowAddItem(false);
            refresh();
          }}
        />
      )}

      {editingItem && (
        <AddItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
