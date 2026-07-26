-- 0006: Reset all Codex page bodies to a placeholder.
-- The previous content of each page is automatically preserved in
-- wiki_revisions by the snapshot trigger, so nothing is truly lost.
update wiki_pages set body = 'Placeholder';
