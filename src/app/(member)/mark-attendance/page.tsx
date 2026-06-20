import PageHeader from "@/components/shared/PageHeader";
import MarkAttendanceForm from "@/components/member/MarkAttendanceForm";

export default function MarkAttendancePage() {
  return (
    <div className="max-w-xl">
      <PageHeader
        title="Mark attendance"
        description=""
      />
      <MarkAttendanceForm />
    </div>
  );
}
