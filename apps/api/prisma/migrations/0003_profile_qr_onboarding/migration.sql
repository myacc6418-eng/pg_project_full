-- AlterTable User: owner/tenant profile preferences, avatar, and non-destructive deletion request
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "businessDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMP(3);

-- AlterTable UserSession: device label for active session visibility
ALTER TABLE "UserSession"
  ADD COLUMN IF NOT EXISTS "deviceLabel" TEXT;

-- AlterTable JoiningRequest: QR onboarding origin, owner notes, and terms versioning
ALTER TABLE "JoiningRequest"
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS "acceptedAgreementVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);

-- AlterTable TenantStay: accepted agreement version tracking
ALTER TABLE "TenantStay"
  ADD COLUMN IF NOT EXISTS "acceptedAgreementVersion" TEXT;
