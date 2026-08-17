-- Adds Admin.sessionToken (sha256 of the current admin session cookie —
-- see lib/admin.ts). The original admin migration 20260817150000 was
-- applied before this field existed, so it ships as its own forward
-- migration rather than an edit to the applied one.

-- AlterTable
ALTER TABLE "admins" ADD COLUMN "session_token" TEXT;
