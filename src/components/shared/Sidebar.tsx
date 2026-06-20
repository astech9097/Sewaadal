import Link from "next/link";

export default function Sidebar() {
  const links = [
    { href: "/admin-dashboard", label: "Admin Dashboard" },
    { href: "/member-dashboard", label: "Member Dashboard" },
    { href: "/members", label: "Members" },
    { href: "/attendance", label: "Attendance" },
    { href: "/reports", label: "Reports" },
    { href: "/settings", label: "Settings" },
    { href: "/mark-attendance", label: "Mark Attendance" },
    { href: "/my-records", label: "My Records" },
  ];

  return (
    <aside className="h-screen w-64 bg-slate-900 text-white p-5">
      <h2 className="text-2xl font-bold mb-6">Sewadal</h2>
      <nav className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-700 transition"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}