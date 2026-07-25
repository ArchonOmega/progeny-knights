// ═══════════════════════════════════════════════════════════
//  PROGENY KNIGHTS · Archive Node
//  Touch to browse the Order's records in-world.
//  Also binds avatars to web accounts:  say  /77 link 123456
//  Optionally shows the web archive on one face (MOAP).
// ═══════════════════════════════════════════════════════════

// ── CONFIG — paste values from the website (Settings → In-world nodes) ──
string  API_BASE    = "https://your-deployment.vercel.app";
string  NODE_ID     = "PASTE-NODE-ID-HERE";
string  NODE_SECRET = "PASTE-NODE-SECRET-HERE";
integer MEDIA_FACE  = -1;    // face to show the web archive on; -1 = off
integer LINK_CHAN   = 77;    // channel for "link ######"
// ────────────────────────────────────────────────────────────

integer gPage = 1;
string  gSort = "date";
list    gIds;                // document ids of the current page
key     gHttp;
integer gMode;               // 0 idle · 1 list · 2 doc · 3 link
key     gUser;               // who we're serving
integer gDlgChan;
integer gDlgHandle;
string  gDocId;
integer gPart;
integer gParts;

req(string path, string method, string body)
{
    list p = [
        HTTP_CUSTOM_HEADER, "X-PK-Node", NODE_ID,
        HTTP_CUSTOM_HEADER, "X-PK-Secret", NODE_SECRET,
        HTTP_BODY_MAXLENGTH, 16384
    ];
    if (method == "POST") p = [HTTP_METHOD, "POST", HTTP_MIMETYPE, "application/json"] + p;
    gHttp = llHTTPRequest(API_BASE + path, p, body);
}

fetchList()
{
    gMode = 1;
    req("/api/sl/list?page=" + (string)gPage + "&sort=" + gSort, "GET", "");
}

tell(key who, string msg)
{
    // region chat is capped ~1024 bytes; split long passages
    integer len = llStringLength(msg);
    integer at = 0;
    while (at < len)
    {
        llRegionSayTo(who, 0, llGetSubString(msg, at, at + 999));
        at += 1000;
    }
}

showDialog()
{
    list buttons = [];
    integer i;
    integer n = llGetListLength(gIds);
    for (i = 1; i <= n; i++) buttons += [(string)i];
    while (llGetListLength(buttons) % 3 != 0) buttons += [" "];
    buttons += ["◀ Newer", "Sort: " + gSort, "Older ▶"];
    llDialog(gUser, "The Archive — page " + (string)gPage + ". Choose a record to hear it read.",
             buttons, gDlgChan);
}

default
{
    state_entry()
    {
        llSetText("⚔ THE ARCHIVE ⚔\nTouch to browse records\n/77 link <code> to bind your avatar", <0.78, 0.63, 0.36>, 1.0);
        gDlgChan = -1 - (integer)llFrand(1000000.0);
        llListen(LINK_CHAN, "", NULL_KEY, "");
        if (MEDIA_FACE >= 0)
            llSetPrimMediaParams(MEDIA_FACE, [
                PRIM_MEDIA_CURRENT_URL, API_BASE + "/archive",
                PRIM_MEDIA_HOME_URL,    API_BASE + "/archive",
                PRIM_MEDIA_AUTO_SCALE,  TRUE,
                PRIM_MEDIA_PERMS_INTERACT, PRIM_MEDIA_PERM_ANYONE,
                PRIM_MEDIA_PERMS_CONTROL,  PRIM_MEDIA_PERM_OWNER
            ]);
    }

    touch_start(integer n)
    {
        gUser = llDetectedKey(0);
        llListenRemove(gDlgHandle);
        gDlgHandle = llListen(gDlgChan, "", gUser, "");
        gPage = 1;
        fetchList();
    }

    listen(integer chan, string name, key id, string msg)
    {
        if (chan == LINK_CHAN)
        {
            list w = llParseString2List(llToLower(msg), [" "], []);
            if (llList2String(w, 0) != "link") return;
            gMode = 3;
            gUser = id;
            string body = llList2Json(JSON_OBJECT, [
                "code", llList2String(w, 1),
                "avatar", (string)id,
                "avatar_name", name,
                "username", llGetUsername(id)
            ]);
            req("/api/sl/link", "POST", body);
            return;
        }

        // dialog channel
        if (msg == "Older ▶")      { gPage++; fetchList(); return; }
        if (msg == "◀ Newer")      { if (gPage > 1) gPage--; fetchList(); return; }
        if (llGetSubString(msg, 0, 4) == "Sort:")
        {
            if (gSort == "date") gSort = "title";
            else if (gSort == "title") gSort = "reporter";
            else gSort = "date";
            fetchList(); return;
        }
        integer pick = (integer)msg;
        if (pick >= 1 && pick <= llGetListLength(gIds))
        {
            gDocId = llList2String(gIds, pick - 1);
            gPart = 1;
            gMode = 2;
            req("/api/sl/doc?id=" + gDocId + "&part=1", "GET", "");
        }
    }

    http_response(key id, integer status, list meta, string body)
    {
        if (id != gHttp) return;

        if (gMode == 3)
        {
            list parts = llParseString2List(body, ["|"], []);
            if (llList2String(parts, 0) == "LINKED")
                llRegionSayTo(gUser, 0, "🩸 Your avatar is bound to the account of " + llList2String(parts, 1) + ". In-world filings are now credited to you.");
            else
                llRegionSayTo(gUser, 0, "The binding failed: " + body + " — generate a fresh code on the website.");
            gMode = 0;
            return;
        }

        if (status != 200) { llRegionSayTo(gUser, 0, "The archive is silent (" + (string)status + ")."); gMode = 0; return; }

        if (gMode == 1)
        {
            gIds = [];
            if (body == "EMPTY")
            {
                llRegionSayTo(gUser, 0, "No records on this page.");
                if (gPage > 1) gPage--;
                return;
            }
            list lines = llParseString2List(body, ["\n"], []);
            string out = "═ The Archive · page " + (string)gPage + " · by " + gSort + " ═";
            integer i;
            for (i = 0; i < llGetListLength(lines); i++)
            {
                list f = llParseStringKeepNulls(llList2String(lines, i), ["|"], []);
                gIds += [llList2String(f, 0)];
                out += "\n" + (string)(i + 1) + ". [" + llList2String(f, 1) + "] "
                     + llList2String(f, 2) + " — " + llList2String(f, 3);
            }
            tell(gUser, out);
            showDialog();
            return;
        }

        if (gMode == 2)
        {
            // part/total|title — author|text
            integer p1 = llSubStringIndex(body, "|");
            string head = llGetSubString(body, 0, p1 - 1);
            string rest = llGetSubString(body, p1 + 1, -1);
            integer p2 = llSubStringIndex(rest, "|");
            string title = llGetSubString(rest, 0, p2 - 1);
            string content = llGetSubString(rest, p2 + 1, -1);

            list pt = llParseString2List(head, ["/"], []);
            gParts = (integer)llList2String(pt, 1);

            if (gPart == 1) tell(gUser, "❖ " + title + " ❖");
            tell(gUser, content);

            if (gPart < gParts)
            {
                gPart++;
                llSleep(0.5);
                req("/api/sl/doc?id=" + gDocId + "&part=" + (string)gPart, "GET", "");
            }
            else gMode = 0;
        }
    }
}
