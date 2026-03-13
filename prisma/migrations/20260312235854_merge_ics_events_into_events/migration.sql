/*
  Warnings:

  - You are about to drop the `IcsEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "IcsEvent_subscriptionId_uid_key";

-- DropIndex
DROP INDEX "IcsEvent_subscriptionId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "IcsEvent";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "kind" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "minutesEstimate" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "subscriptionId" TEXT,
    "uid" TEXT,
    "description" TEXT,
    "location" TEXT,
    "startTimezone" TEXT,
    "endTimezone" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "organizer" TEXT,
    "recurrenceRule" TEXT,
    "transparency" TEXT,
    "categories" TEXT,
    "url" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "IcsSubscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("completed", "createdAt", "end", "goalId", "id", "kind", "metadata", "minutesEstimate", "order", "start", "title", "updatedAt", "userId") SELECT "completed", "createdAt", "end", "goalId", "id", "kind", "metadata", "minutesEstimate", "order", "start", "title", "updatedAt", "userId" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_userId_idx" ON "Event"("userId");
CREATE INDEX "Event_goalId_idx" ON "Event"("goalId");
CREATE INDEX "Event_subscriptionId_idx" ON "Event"("subscriptionId");
CREATE UNIQUE INDEX "Event_subscriptionId_uid_key" ON "Event"("subscriptionId", "uid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
