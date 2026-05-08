-- Add template design payload on existing table announcement_body
ALTER TABLE "announcement_body"
ADD COLUMN "templateJson" TEXT NOT NULL DEFAULT '{}';

-- Backfill templateJson from existing bodyJson
UPDATE "announcement_body"
SET "templateJson" = json_object(
  'version', 1,
  'sectionId', "sectionId",
  'templateDesign', json_object(
    'displayMode', COALESCE(json_extract("bodyJson", '$.displayMode'), 'stack'),
    'marquee', json_object(
      'durationSeconds', COALESCE(json_extract("bodyJson", '$.marqueeDurationSeconds'), 18),
      'direction', COALESCE(json_extract("bodyJson", '$.marqueeDirection'), 'rtl'),
      'separator', COALESCE(json_extract("bodyJson", '$.marqueeSeparator'), '•'),
      'separatorRepeat', COALESCE(json_extract("bodyJson", '$.marqueeSeparatorRepeat'), 1),
      'trailingSeparator', COALESCE(json_extract("bodyJson", '$.marqueeTrailingSeparator'), json('true'))
    ),
    'rotate', json_object(
      'intervalMs', COALESCE(json_extract("bodyJson", '$.rotateIntervalMs'), 3000),
      'direction', COALESCE(json_extract("bodyJson", '$.rotateDirection'), 'forward'),
      'autoplay', COALESCE(json_extract("bodyJson", '$.rotateAutoplay'), json('true')),
      'pauseOnHover', COALESCE(json_extract("bodyJson", '$.rotatePauseOnHover'), json('true'))
    ),
    'layout', json_object(
      'gapPx', COALESCE(json_extract("bodyJson", '$.gapPx'), 24),
      'fontSizePx', COALESCE(json_extract("bodyJson", '$.fontSizePx'), 22),
      'paddingYpx', COALESCE(json_extract("bodyJson", '$.paddingYpx'), 14),
      'paddingXpx', COALESCE(json_extract("bodyJson", '$.paddingXpx'), 16),
      'backgroundColor', COALESCE(json_extract("bodyJson", '$.backgroundColor'), '#b8f441'),
      'textColor', COALESCE(json_extract("bodyJson", '$.textColor'), '#0f172a')
    )
  ),
  'header', json_object('title', "name"),
  'body', json_object('messages', COALESCE(json_extract("bodyJson", '$.messages'), json('[]'))),
  'rate', json_object('value', COALESCE(json_extract("bodyJson", '$.rate'), '')),
  'discount', json_object('value', COALESCE(json_extract("bodyJson", '$.discount'), '')),
  'uiBlocks', COALESCE(json_extract("bodyJson", '$.uiBlocks'), json('[]')),
  'render', json_object('config', json("bodyJson"))
);
