// ═══════════════════════════════════════════════════════════
//  PROGENY KNIGHTS · Attendance Scanner
//  Place at the event venue. Every few minutes it records who
//  is present on the parcel; the archive matches the sweep to
//  whichever scheduled event is within ±3 hours.
// ═══════════════════════════════════════════════════════════

// ── CONFIG — paste values from the website (Settings → In-world nodes) ──
string  API_BASE     = "https://your-deployment.vercel.app";
string  NODE_ID      = "PASTE-NODE-ID-HERE";
string  NODE_SECRET  = "PASTE-NODE-SECRET-HERE";
float   SWEEP_MINS   = 5.0;
integer WHOLE_REGION = FALSE;   // TRUE = scan the region, FALSE = this parcel
// ────────────────────────────────────────────────────────────

key gHttp;

default
{
    state_entry()
    {
        llSetText("⚔ MUSTER SCANNER ⚔", <0.78, 0.63, 0.36>, 1.0);
        llSetTimerEvent(SWEEP_MINS * 60.0);
    }

    timer()
    {
        integer scope = AGENT_LIST_PARCEL;
        if (WHOLE_REGION) scope = AGENT_LIST_REGION;
        list agents = llGetAgentList(scope, []);
        integer n = llGetListLength(agents);
        if (n == 0) return;
        if (n > 60) n = 60;

        list rows = [];
        integer i;
        for (i = 0; i < n; i++)
        {
            key k = llList2Key(agents, i);
            rows += [llList2Json(JSON_OBJECT, [
                "key", (string)k,
                "name", llGetDisplayName(k)
            ])];
        }
        string body = llList2Json(JSON_OBJECT, ["avatars", llList2Json(JSON_ARRAY, rows)]);

        gHttp = llHTTPRequest(API_BASE + "/api/sl/attendance", [
            HTTP_METHOD, "POST",
            HTTP_MIMETYPE, "application/json",
            HTTP_CUSTOM_HEADER, "X-PK-Node", NODE_ID,
            HTTP_CUSTOM_HEADER, "X-PK-Secret", NODE_SECRET
        ], body);
    }

    http_response(key id, integer status, list meta, string body)
    {
        // Sweeps outside an event window return "NO EVENT WINDOW" — that is fine.
    }
}
