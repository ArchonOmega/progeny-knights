"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = (mm: boolean) => [
  { href: "/dashboard", label: "The Hall" },
  { href: "/schedule",  label: "Schedule" },
  { href: "/gallery",   label: "Gallery" },
  { href: "/archive",   label: "Archive" },
  { href: "/wiki",      label: "Codex" },
  { href: "/members",   label: "Roster" },
  { href: "/settings",  label: "Settings" },
];

export default function NavLinks(props: { canManageMembers: boolean; canManageNodes: boolean }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {items(props.canManageMembers).map((i) => (
        <Link key={i.href} href={i.href} className={path.startsWith(i.href) ? "active" : ""}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
