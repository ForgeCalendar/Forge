-- CreateTable
CREATE TABLE "ChatHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatHistory_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "AIAgentApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatHistoryId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_chatHistoryId_fkey" FOREIGN KEY ("chatHistoryId") REFERENCES "ChatHistory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChatHistory_userId_idx" ON "ChatHistory"("userId");

-- CreateIndex
CREATE INDEX "ChatHistory_apiKeyId_idx" ON "ChatHistory"("apiKeyId");

-- CreateIndex
CREATE INDEX "Message_chatHistoryId_idx" ON "Message"("chatHistoryId");

-- Data migration: move existing Goal.chatHistory JSON blobs into new tables
-- For each goal that has a non-null chatHistory, create a ChatHistory row
-- using the goal's id as the ChatHistory id (for deterministic migration).
INSERT INTO "ChatHistory" ("id", "userId", "createdAt", "updatedAt")
SELECT "id", "userId", "createdAt", "updatedAt"
FROM "Goal"
WHERE "chatHistory" IS NOT NULL AND "chatHistory" != '' AND "chatHistory" != '[]';

-- RedefineTables: replace Goal with new schema (chatHistoryId FK instead of chatHistory blob)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TEXT,
    "chatHistoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_chatHistoryId_fkey" FOREIGN KEY ("chatHistoryId") REFERENCES "ChatHistory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Copy data, setting chatHistoryId = id for goals that had chat history
INSERT INTO "new_Goal" ("id", "userId", "title", "description", "dueDate", "chatHistoryId", "createdAt", "updatedAt")
SELECT "id", "userId", "title", "description", "dueDate",
  CASE WHEN "chatHistory" IS NOT NULL AND "chatHistory" != '' AND "chatHistory" != '[]' THEN "id" ELSE NULL END,
  "createdAt", "updatedAt"
FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE UNIQUE INDEX "Goal_chatHistoryId_key" ON "Goal"("chatHistoryId");
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- NOTE: Individual messages from the JSON blobs cannot be extracted in pure SQLite SQL.
-- A post-migration script (prisma/migrate-chat-messages.ts) handles parsing the JSON
-- and inserting Message rows. Run it after applying this migration.
