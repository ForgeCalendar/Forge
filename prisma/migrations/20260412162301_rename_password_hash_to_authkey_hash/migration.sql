-- AlterTable: Rename passwordHash to authkeyHash
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authkeyHash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_User" ("id", "authkeyHash", "timezone", "createdAt", "updatedAt")
SELECT "id", "passwordHash", "timezone", "createdAt", "updatedAt" FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
