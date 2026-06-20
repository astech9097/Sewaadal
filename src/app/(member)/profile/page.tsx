import PageHeader from "@/components/shared/PageHeader";
import ProfileForm from "@/components/member/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="max-w-xl">
      <PageHeader
        title="My Profile"
        description=""
      />
      <ProfileForm />
    </div>
  );
}
