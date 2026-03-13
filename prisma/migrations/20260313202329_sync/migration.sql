-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatHistory_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "AIAgentApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChatHistory" ("apiKeyId", "createdAt", "id", "updatedAt", "userId") SELECT "apiKeyId", "createdAt", "id", "updatedAt", "userId" FROM "ChatHistory";
DROP TABLE "ChatHistory";
ALTER TABLE "new_ChatHistory" RENAME TO "ChatHistory";
CREATE INDEX "ChatHistory_userId_idx" ON "ChatHistory"("userId");
CREATE INDEX "ChatHistory_apiKeyId_idx" ON "ChatHistory"("apiKeyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
