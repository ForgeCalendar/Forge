/*
  Warnings:

  - You are about to drop the column `purpose` on the `UserSalt` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSalt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSalt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSalt" ("createdAt", "id", "salt", "updatedAt", "userId") SELECT "createdAt", "id", "salt", "updatedAt", "userId" FROM "UserSalt";
DROP TABLE "UserSalt";
ALTER TABLE "new_UserSalt" RENAME TO "UserSalt";
CREATE UNIQUE INDEX "UserSalt_userId_key" ON "UserSalt"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
