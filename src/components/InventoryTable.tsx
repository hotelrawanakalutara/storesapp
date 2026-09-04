"use client";

import { AlertTriangle, Pencil, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { TodayInventoryRow } from "@/types/database";
import { getDisplayUnit, toDisplayValue } from "@/lib/format";

function displayRow(item: TodayInventoryRow) {
  const reference = Math.max(
    Math.abs(item.opening_stock),
    Math.abs(item.current_balance),
    Math.abs(item.stock_in),
    Math.abs(item.stock_out)
  );
  const unit = getDisplayUnit(item.unit, reference);
  return {
    unit,
    opening_stock: toDisplayValue(item.opening_stock, item.unit, unit),
    stock_in: toDisplayValue(item.stock_in, item.unit, unit),
    stock_out: toDisplayValue(item.stock_out, item.unit, unit),
    current_balance: toDisplayValue(item.current_balance, item.unit, unit),
  };
}

interface InventoryTableProps {
  rows: TodayInventoryRow[];
  loading: boolean;
  onEditItem: (row: TodayInventoryRow) => void;
}

export default function InventoryTable({ rows, loading, onEditItem }: InventoryTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const lowStockCount = rows.filter((r) => r.low_stock).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
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

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No items found</div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="grid gap-2.5 sm:hidden">
            {filtered.map((item) => {
              const d = displayRow(item);
              return (
              <div
                key={item.id}
                className={`rounded-xl border-2 p-4 ${
                  item.low_stock ? "border-red-300 bg-red-50" : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{d.unit}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.low_stock ? (
                      <span className="flex items-center gap-1 rounded-full bg-red-600 text-white text-[11px] font-bold px-2.5 py-1">
                        <AlertTriangle size={12} /> LOW STOCK
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold px-2.5 py-1">
                        OK
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      aria-label={`Edit ${item.name}`}
                      className="p-1.5 rounded-full text-gray-400 active:bg-gray-100"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <Stat label="Opening" value={d.opening_stock} />
                  <Stat label="IN" value={d.stock_in} accent="text-emerald-600" />
                  <Stat label="OUT" value={d.stock_out} accent="text-red-600" />
                  <Stat
                    label="Balance"
                    value={d.current_balance}
                    accent={item.low_stock ? "text-red-700" : "text-gray-900"}
                    bold
                  />
                </div>
              </div>
              );
            })}
          </div>

          {/* Desktop / tablet: table */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-4 py-3 font-semibold">Item Name</th>
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold text-right">Opening</th>
                  <th className="px-4 py-3 font-semibold text-right">Today IN</th>
                  <th className="px-4 py-3 font-semibold text-right">Today OUT</th>
                  <th className="px-4 py-3 font-semibold text-right">Balance</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const d = displayRow(item);
                  return (
                  <tr key={item.id} className={item.low_stock ? "bg-red-50" : "bg-white"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500">{d.unit}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{d.opening_stock}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {d.stock_in > 0 ? `+${d.stock_in}` : d.stock_in}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      {d.stock_out > 0 ? `-${d.stock_out}` : d.stock_out}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        item.low_stock ? "text-red-700" : "text-gray-900"
                      }`}
                    >
                      {d.current_balance}
                    </td>
                    <td className="px-4 py-3">
                      {item.low_stock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white text-xs font-bold px-2.5 py-1">
                          <AlertTriangle size={12} /> LOW STOCK
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        aria-label={`Edit ${item.name}`}
                        className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  bold,
}: {
  label: string;
  value: number;
  accent?: string;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-sm ${bold ? "font-bold" : "font-medium"} ${accent ?? "text-gray-700"}`}>
        {value}
      </div>
    </div>
  );
}
