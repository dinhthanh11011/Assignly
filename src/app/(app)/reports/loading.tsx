import { HeaderSkeleton } from "@/components/skeletons";
import { RangePickerSkeleton, ReportBodySkeleton } from "@/components/reports/report-skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton actions={0} />
      <RangePickerSkeleton />
      <ReportBodySkeleton />
    </div>
  );
}
