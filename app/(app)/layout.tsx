import Link from "next/link";
import Seal from "@/components/Seal";
import { requireSession } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import NavLinks from "@/components/NavLinks";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <Seal size={56} />
          <span className="name">Progeny<br />Knights</span>
        </Link>
        <NavLinks
          canManageMembers={s.caps.has("members.manage")}
          canManageNodes={s.caps.has("nodes.manage")}
        />
        <div className="foot">
          <div className="who">{s.callsign}</div>
          <div className="rank">{s.rankTitle}</div>
          {s.title && <div className="rank" style={{ color: "var(--gold)" }}>❖ {s.title}</div>}
          <form action={signOut} style={{ marginTop: ".6rem" }}>
            <button className="btn small">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
