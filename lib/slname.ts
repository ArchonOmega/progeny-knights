/** Normalize a Second Life username: "DarkBlade Resident" → "darkblade",
 *  "John Smith" → "john.smith", trailing ".resident" dropped. */
export function normalizeSlUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/\.resident$/, "")
    .replace(/[^a-z0-9._-]/g, "");
}

/** Internal auth address — never shown to users, never receives mail. */
export const slEmail = (u: string) => `${normalizeSlUsername(u)}@sl.invalid`;
