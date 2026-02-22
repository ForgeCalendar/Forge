-- CreateTable
CREATE TABLE "IcsSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lastSynced" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IcsSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IcsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start" TEXT NOT NULL,
    "end" TEXT,
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
    CONSTRAINT "IcsEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "IcsSubscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IcsSubscription_userId_idx" ON "IcsSubscription"("userId");

-- CreateIndex
CREATE INDEX "IcsEvent_subscriptionId_idx" ON "IcsEvent"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "IcsEvent_subscriptionId_uid_key" ON "IcsEvent"("subscriptionId", "uid");
