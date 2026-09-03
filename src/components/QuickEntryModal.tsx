"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import type { Item, TransactionType } from "@/types/database";
import { recordTransaction } from "@/lib/queries";

const IN_REASONS = ["Received from supplier", "Returned from department", "Stock correction", "Other"];
const OUT_REASONS = ["Issued to Kitchen", "Issued to Housekeeping", "Issued to Front Office", "Damaged / Expired", "Other"];

interface QuickEntryModalProps {
  type: TransactionType;
  items: Item[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickEntryModal({ type, items, onClose, onSuccess }: QuickEntryModalProps) {
  const isIn = type === "IN";
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [reasonPreset, setReasonPreset] = useState((isIn ? IN_REASONS : OUT_REASONS)[0]);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 30);
  }, [items, search]);

  const reason = reasonPreset === "Other" ? customReason : reasonPreset;
  const qtyNumber = Number(quantity);
  const canSubmit =
    !!selectedItem && quantity.trim() !== "" && qtyNumber > 0 && reason.trim() !== "" && !submitting;

  async function handleSubmit() {
    if (!selectedItem || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await recordTransaction({
        itemId: selectedItem.id,
        type,
        quantity: qtyNumber,
        reason: reason.trim(),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 rounded-t-2xl ${
            isIn ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isIn ? <Plus size={20} /> : <Minus size={20} />}
            {isIn ? "Stock In" : "Stock Out"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white p-1 rounded-full active:bg-white/20"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {/* Item search / dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            {selectedItem ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setSearch("");
                  setShowDropdown(true);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3.5 text-left"
              >
                <span className="font-semibold text-gray-900">{selectedItem.name}</span>
                <span className="text-sm text-gray-500">
                  {selectedItem.current_stock} {selectedItem.unit} in stock · change
                </span>
              </button>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search item..."
                  className="w-full rounded-xl border-2 border-gray-200 pl-10 pr-4 py-3.5 text-base focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {showDropdown && !selectedItem && (
              <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {filteredItems.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">No items found</div>
                )}
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="text-xs text-gray-500">
                      {item.current_stock} {item.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity {selectedItem ? `(${selectedItem.unit})` : ""}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => String(Math.max(0, (Number(q) || 0) - 1)))}
                className="h-12 w-12 shrink-0 rounded-xl border-2 border-gray-200 text-xl font-bold text-gray-600 active:bg-gray-100"
              >
                −
              </button>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full text-center rounded-xl border-2 border-gray-200 px-4 py-3.5 text-xl font-bold focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => String((Number(q) || 0) + 1))}
                className="h-12 w-12 shrink-0 rounded-xl border-2 border-gray-200 text-xl font-bold text-gray-600 active:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isIn ? "Reason / Source" : "Reason / Department"}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(isIn ? IN_REASONS : OUT_REASONS).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReasonPreset(r)}
                  className={`px-3 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                    reasonPreset === r
                      ? isIn
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-red-600 border-red-600 text-white"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {reasonPreset === "Other" && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter reason / notes"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={`w-full rounded-xl py-4 text-base font-bold text-white transition-colors ${
              !canSubmit
                ? "bg-gray-300 cursor-not-allowed"
                : isIn
                ? "bg-emerald-600 active:bg-emerald-700"
                : "bg-red-600 active:bg-red-700"
            }`}
          >
            {submitting ? "Saving..." : `Submit ${isIn ? "Stock In" : "Stock Out"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
