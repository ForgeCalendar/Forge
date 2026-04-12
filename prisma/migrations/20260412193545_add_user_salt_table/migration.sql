-- CreateTable
CREATE TABLE "UserSalt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSalt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserSalt_userId_idx" ON "UserSalt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSalt_userId_purpose_key" ON "UserSalt"("userId", "purpose");
