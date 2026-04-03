-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "chatHistoryId" TEXT,
    "title" TEXT NOT NULL,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "kind" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "minutesEstimate" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "subscriptionId" TEXT,
    "uid" TEXT,
    "recurid" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "location" TEXT,
    "startTimezone" TEXT,
    "endTimezone" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "organizer" TEXT,
    "recurrenceRule" TEXT,
    "exdates" TEXT,
    "transparency" TEXT,
    "categories" TEXT,
    "url" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "IcsSubscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_chatHistoryId_fkey" FOREIGN KEY ("chatHistoryId") REFERENCES "ChatHistory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("categories", "completed", "confirmed", "createdAt", "description", "end", "endTimezone", "exdates", "goalId", "id", "isAllDay", "kind", "location", "metadata", "minutesEstimate", "order", "organizer", "rawData", "recurid", "recurrenceRule", "start", "startTimezone", "status", "subscriptionId", "title", "transparency", "uid", "updatedAt", "url", "userId") SELECT "categories", "completed", "confirmed", "createdAt", "description", "end", "endTimezone", "exdates", "goalId", "id", "isAllDay", "kind", "location", "metadata", "minutesEstimate", "order", "organizer", "rawData", "recurid", "recurrenceRule", "start", "startTimezone", "status", "subscriptionId", "title", "transparency", "uid", "updatedAt", "url", "userId" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_chatHistoryId_key" ON "Event"("chatHistoryId");
CREATE INDEX "Event_userId_idx" ON "Event"("userId");
CREATE INDEX "Event_goalId_idx" ON "Event"("goalId");
CREATE INDEX "Event_subscriptionId_idx" ON "Event"("subscriptionId");
CREATE UNIQUE INDEX "Event_subscriptionId_uid_recurid_key" ON "Event"("subscriptionId", "uid", "recurid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
