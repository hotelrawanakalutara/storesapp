"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { addItem } from "@/lib/queries";

interface AddItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddItemModal({ onClose, onSuccess }: AddItemModalProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [reorderLimit, setReorderLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() !== "" && unit.trim() !== "" && reorderLimit.trim() !== "" && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await addItem({ name, unit, reorder_limit: Number(reorderLimit) || 0 });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white">Add New Item</h2>
          <button onClick={onClose} className="text-white/90 hover:text-white p-1 rounded-full active:bg-white/20">
            <X size={22} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bath Towel"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, btl, kg..."
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Limit</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={reorderLimit}
                onChange={(e) => setReorderLimit(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={`w-full rounded-xl py-4 text-base font-bold text-white transition-colors ${
              !canSubmit ? "bg-gray-300 cursor-not-allowed" : "bg-gray-900 active:bg-gray-800"
            }`}
          >
            {submitting ? "Saving..." : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
