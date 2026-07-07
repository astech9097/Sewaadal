-- Add the new groups array column
ALTER TABLE "User" ADD COLUMN "groups" INTEGER[] DEFAULT '{}'::INTEGER[];

-- Copy existing group values to groups array
UPDATE "User" SET "groups" = ARRAY["group"] WHERE "group" IS NOT NULL;

-- Drop the old group column
ALTER TABLE "User" DROP COLUMN "group";
