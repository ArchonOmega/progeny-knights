// ═══════════════════════════════════════════════════════════
//  PROGENY KNIGHTS · Upload Node
//  Drop a notecard on this object and it is filed in the
//  Order's web archive, credited to the notecard's author.
// ═══════════════════════════════════════════════════════════

// ── CONFIG — paste values from the website (Settings → In-world nodes) ──
string API_BASE    = "https://your-deployment.vercel.app";
string NODE_ID     = "PASTE-NODE-ID-HERE";
string NODE_SECRET = "PASTE-NODE-SECRET-HERE";
// ────────────────────────────────────────────────────────────

integer CHUNK = 2800;        // characters per HTTP request

string  gCard;               // notecard being read
integer gLine;
string  gText;               // accumulated body
key     gQuery;
key     gAuthor;             // notecard creator = reporter
string  gAuthorName;
key     gNameQuery;
string  gSession;
integer gSeq;
integer gTotal;
key     gHttp;
integer gBusy;

say(string msg) { llRegionSayTo(llGetOwner(), 0, msg); if (gAuthor != llGetOwner() && gAuthor != NULL_KEY) llRegionSayTo(gAuthor, 0, msg); }

sendChunk()
{
    string piece = llGetSubString(gText, (gSeq - 1) * CHUNK, gSeq * CHUNK - 1);
    string body = llList2Json(JSON_OBJECT, [
        "session", gSession,
        "seq", gSeq,
        "total", gTotal,
        "name", gCard,
        "avatar", (string)gAuthor,
        "avatar_name", gAuthorName,
        "data", piece
    ]);
    gHttp = llHTTPRequest(API_BASE + "/api/sl/upload", [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_CUSTOM_HEADER, "X-PK-Node", NODE_ID,
        HTTP_CUSTOM_HEADER, "X-PK-Secret", NODE_SECRET
    ], body);
}

beginUpload()
{
    gSession = (string)llGenerateKey();
    gTotal = (llStringLength(gText) + CHUNK - 1) / CHUNK;
    if (gTotal < 1) gTotal = 1;
    gSeq = 1;
    sendChunk();
}

default
{
    state_entry()
    {
        llAllowInventoryDrop(TRUE);
        llSetText("⚔ ARCHIVE UPLOAD NODE ⚔\nDrop your duty report notecard here", <0.78, 0.63, 0.36>, 1.0);
        gBusy = FALSE;
    }

    changed(integer c)
    {
        if (!(c & CHANGED_ALLOWED_DROP) && !(c & CHANGED_INVENTORY)) return;
        if (gBusy) return;
        integer n = llGetInventoryNumber(INVENTORY_NOTECARD);
        if (n < 1) return;

        gBusy = TRUE;
        gCard = llGetInventoryName(INVENTORY_NOTECARD, n - 1);   // newest drop
        gAuthor = llGetInventoryCreator(gCard);
        gAuthorName = llKey2Name(gAuthor);
        gText = "";
        gLine = 0;
        say("Reading \"" + gCard + "\" for the archive…");
        gQuery = llGetNotecardLine(gCard, gLine);
    }

    dataserver(key q, string data)
    {
        if (q == gNameQuery)
        {
            if (data != "") gAuthorName = data;
            beginUpload();
            return;
        }
        if (q != gQuery) return;

        if (data == EOF)
        {
            if (gText == "") { say("That notecard is empty — nothing to file."); llRemoveInventory(gCard); gBusy = FALSE; return; }
            if (gAuthorName == "")
            {   // author not in region; resolve their username first
                gNameQuery = llRequestUsername(gAuthor);
                return;
            }
            beginUpload();
            return;
        }
        if (gLine > 0) gText += "\n";
        gText += data;
        gLine++;
        gQuery = llGetNotecardLine(gCard, gLine);
    }

    http_response(key id, integer status, list meta, string body)
    {
        if (id != gHttp) return;

        if (status != 200)
        {
            say("The archive refused the filing (" + (string)status + "): " + llGetSubString(body, 0, 120));
            gBusy = FALSE;
            return;
        }
        if (gSeq < gTotal)
        {
            gSeq++;
            llSleep(0.5);      // stay under the HTTP throttle
            sendChunk();
            return;
        }
        // final response: FILED|title|author
        list parts = llParseString2List(body, ["|"], []);
        if (llList2String(parts, 0) == "FILED")
            say("✒ Filed in the archive as \"" + llList2String(parts, 1) + "\" — credited to " + llList2String(parts, 2) + ".");
        else
            say("Archive response: " + body);
        llRemoveInventory(gCard);
        gBusy = FALSE;
    }
}
