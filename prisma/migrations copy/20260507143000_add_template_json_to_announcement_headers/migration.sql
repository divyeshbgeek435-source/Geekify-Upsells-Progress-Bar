-- Add template design payload on existing centralized table
ALTER TABLE "announcement_headers"
ADD COLUMN "templateJson" TEXT NOT NULL DEFAULT '{}';

-- Backfill template payload from existing per-row fields
UPDATE "announcement_headers"
SET "templateJson" = json_object(
  'version', 1,
  'sectionHtmlId', COALESCE(NULLIF(json_extract("configJson", '$.sectionHtmlId'), ''), 'sce-ab-' || "id"),
  'header', json_object('title', "name"),
  'body', json_object('messages', COALESCE(json_extract("configJson", '$.messages'), json('[]'))),
  'rate', json_object('value', COALESCE(json_extract("configJson", '$.rate'), '')),
  'discount', json_object('value', COALESCE(json_extract("configJson", '$.discount'), '')),
  'uiBlocks', COALESCE(json_extract("configJson", '$.uiBlocks'), json('[]')),
  'render', json_object(
    'barType', "barType",
    'config', json("configJson"),
    'customHtml', "customHtml",
    'customLiquid', "customLiquid",
    'customCss', "customCss"
  )
);
