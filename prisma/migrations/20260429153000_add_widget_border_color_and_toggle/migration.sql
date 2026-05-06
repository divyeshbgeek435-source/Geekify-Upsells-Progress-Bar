ALTER TABLE "TierWidgetSettings"
ADD COLUMN "widgetBorderColor" TEXT NOT NULL DEFAULT '#d1d5db';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "widgetUseCustomColors" BOOLEAN NOT NULL DEFAULT 0;
