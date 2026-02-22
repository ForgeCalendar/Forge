/*
  Warnings:

  - You are about to drop the `CalendarEvent` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Made the column `end` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "CalendarEvent_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CalendarEvent";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("completed", "createdAt", "end", "goalId", "id", "minutesEstimate", "order", "start", "title", "updatedAt") SELECT "completed", "createdAt", "end", "goalId", "id", "minutesEstimate", "order", "start", "title", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_userId_idx" ON "Event"("userId");
CREATE INDEX "Event_goalId_idx" ON "Event"("goalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
