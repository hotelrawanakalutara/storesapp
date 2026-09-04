"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { getDailyReport, getTransactionsForDate } from "@/lib/queries";
import { getDisplayUnit, round2, toDisplayValue } from "@/lib/format";
import type { DailyReportRow, TransactionWithItem } from "@/types/database";

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

function displayRow(r: DailyReportRow) {
  const reference = Math.max(
    Math.abs(r.opening_stock),
    Math.abs(r.closing_stock),
    Math.abs(r.stock_in),
    Math.abs(r.stock_out)
  );
  const unit = getDisplayUnit(r.unit, reference);
  return {
    unit,
    opening_stock: toDisplayValue(r.opening_stock, r.unit, unit),
    stock_in: toDisplayValue(r.stock_in, r.unit, unit),
    stock_out: toDisplayValue(r.stock_out, r.unit, unit),
    closing_stock: toDisplayValue(r.closing_stock, r.unit, unit),
  };
}

export default function DailyReport() {
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<DailyReportRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting state for a new date fetch
    setLoading(true);
    setError(null);
    Promise.all([getDailyReport(date), getTransactionsForDate(date)])
      .then(([report, txs]) => {
        if (cancelled) return;
        setRows(report);
        setTransactions(txs);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load report");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const rawTotals = rows.reduce(
    (acc, r) => ({
      opening: acc.opening + r.opening_stock,
      in: acc.in + r.stock_in,
      out: acc.out + r.stock_out,
      closing: acc.closing + r.closing_stock,
    }),
    { opening: 0, in: 0, out: 0, closing: 0 }
  );
  const totals = {
    opening: round2(rawTotals.opening),
    in: round2(rawTotals.in),
    out: round2(rawTotals.out),
    closing: round2(rawTotals.closing),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
        <Calendar size={18} className="text-gray-400" />
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 bg-transparent text-base focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <SummaryCard label="Opening Balance" value={totals.opening} />
        <SummaryCard label="Total IN" value={totals.in} accent="text-emerald-600" />
        <SummaryCard label="Total OUT" value={totals.out} accent="text-red-600" />
        <SummaryCard label="Closing Balance" value={totals.closing} bold />
      </div>

      {/* Per-item snapshot */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Item Snapshot</h3>
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No snapshot recorded for this date</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-4 py-2.5 font-semibold">Item</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Opening</th>
                  <th className="px-4 py-2.5 font-semibold text-right">IN</th>
                  <th className="px-4 py-2.5 font-semibold text-right">OUT</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Closing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const low = r.closing_stock <= r.reorder_limit;
                  const d = displayRow(r);
                  return (
                    <tr key={r.item_id} className={low ? "bg-red-50" : "bg-white"}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          {r.name}
                          {low && <AlertTriangle size={14} className="text-red-600" />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">
                        {d.opening_stock} {d.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">
                        +{d.stock_in} {d.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600">
                        -{d.stock_out} {d.unit}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-bold ${low ? "text-red-700" : "text-gray-900"}`}>
                        {d.closing_stock} {d.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit trail */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
          Audit History ({transactions.length})
        </h3>
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No transactions on this date</div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const storedUnit = tx.items?.unit ?? "";
              const displayUnit = getDisplayUnit(storedUnit, Math.abs(tx.quantity));
              const displayQty = toDisplayValue(tx.quantity, storedUnit, displayUnit);
              return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${
                        tx.type === "IN" ? "bg-emerald-600" : "bg-red-600"
                      }`}
                    >
                      {tx.type}
                    </span>
                    <span className="font-semibold text-gray-900 truncate">{tx.items?.name ?? "Item"}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {tx.reason || "No reason given"}
                    {tx.created_by ? ` · ${tx.created_by}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-gray-900">
                    {tx.type === "IN" ? "+" : "-"}
                    {displayQty} {displayUnit}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
                    <Clock size={11} /> {format(new Date(tx.timestamp), "h:mm a")}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
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
    <div className="rounded-xl border border-gray-100 bg-white px-3.5 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-xl ${bold ? "font-extrabold" : "font-bold"} ${accent ?? "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}
