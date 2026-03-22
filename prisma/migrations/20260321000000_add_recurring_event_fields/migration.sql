-- Add recurid column (empty string = master event, ISO string = modified occurrence)
ALTER TABLE "Event" ADD COLUMN "recurid" TEXT NOT NULL DEFAULT '';

-- Add exdates column (JSON array of ISO date strings to exclude from recurrence expansion)
ALTER TABLE "Event" ADD COLUMN "exdates" TEXT;

-- Drop old unique index on (subscriptionId, uid)
DROP INDEX IF EXISTS "Event_subscriptionId_uid_key";

-- Create new unique index including recurid so master and modified occurrences coexist
CREATE UNIQUE INDEX "Event_subscriptionId_uid_recurid_key" ON "Event"("subscriptionId", "uid", "recurid");
