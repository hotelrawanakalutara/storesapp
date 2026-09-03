import DailyReport from "@/components/DailyReport";

export default function ReportsPage() {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-4">
      <h2 className="text-base font-bold text-gray-900 mb-4">Daily Movement Report</h2>
      <DailyReport />
    </div>
  );
}
