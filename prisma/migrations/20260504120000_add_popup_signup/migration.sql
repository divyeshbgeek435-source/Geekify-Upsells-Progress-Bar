-- CreateTable
CREATE TABLE "PopupSignup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "popupDesignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PopupSignup_shop_popupDesignId_email_key" ON "PopupSignup"("shop", "popupDesignId", "email");

-- CreateIndex
CREATE INDEX "PopupSignup_shop_popupDesignId_idx" ON "PopupSignup"("shop", "popupDesignId");
