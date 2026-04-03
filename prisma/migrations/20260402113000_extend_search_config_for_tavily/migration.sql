-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SearchConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "searchProvider" TEXT NOT NULL DEFAULT 'google',
    "googleApiKey" TEXT,
    "googleSearchEngineId" TEXT,
    "tavilyApiKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SearchConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SearchConfig" ("createdAt", "googleApiKey", "googleSearchEngineId", "id", "updatedAt", "userId") SELECT "createdAt", "googleApiKey", "googleSearchEngineId", "id", "updatedAt", "userId" FROM "SearchConfig";
DROP TABLE "SearchConfig";
ALTER TABLE "new_SearchConfig" RENAME TO "SearchConfig";
CREATE UNIQUE INDEX "SearchConfig_userId_key" ON "SearchConfig"("userId");
CREATE INDEX "SearchConfig_userId_idx" ON "SearchConfig"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
