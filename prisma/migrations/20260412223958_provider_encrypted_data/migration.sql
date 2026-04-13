/*
  Warnings:

  - You are about to drop the column `baseUrl` on the `Provider` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Provider` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Provider` table. All the data in the column will be lost.
  - Added the required column `encryptedData` to the `Provider` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Provider" ("createdAt", "id", "updatedAt", "userId") SELECT "createdAt", "id", "updatedAt", "userId" FROM "Provider";
DROP TABLE "Provider";
ALTER TABLE "new_Provider" RENAME TO "Provider";
CREATE INDEX "Provider_userId_idx" ON "Provider"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
