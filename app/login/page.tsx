import Seal from "@/components/Seal";
import { signIn, signUp } from "./actions";

export default async function Login({
  searchParams,
}: { searchParams: Promise<{ e?: string; m?: string }> }) {
  const { e, m } = await searchParams;
  const joining = m === "join";

  return (
    <main className="rite">
      <div className="seal-wrap"><Seal size={110} /></div>
      <h1>Progeny Knights</h1>
      <p className="motto">Shield of the realm · sword of the court</p>

      {joining ? (
        <form action={signUp}>
          <label className="fld"><span>Callsign · your name in the Order</span>
            <input name="callsign" type="text" required maxLength={40} placeholder="Seraphine Duskbane" />
          </label>
          <label className="fld"><span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="fld"><span>Password</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <button className="btn primary" style={{ width: "100%" }}>Petition to join</button>
          <p className="alt"><a href="/login">Already sworn? Sign in</a></p>
        </form>
      ) : (
        <form action={signIn}>
          <label className="fld"><span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="fld"><span>Password</span>
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <button className="btn primary" style={{ width: "100%" }}>Enter the keep</button>
          <p className="alt"><a href="/login?m=join">New blade? Petition to join</a></p>
        </form>
      )}
      {e && <p className="err">{e}</p>}
    </main>
  );
}
