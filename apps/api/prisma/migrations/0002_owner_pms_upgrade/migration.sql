-- 0002_owner_pms_upgrade: PG Finder Owner PMS Complete Entities

CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUIRED');

ALTER TABLE "Property"
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Floor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
  "floorNumber" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("propertyId", "floorNumber")
);

ALTER TABLE "Room"
  ADD COLUMN IF NOT EXISTS "floorId" TEXT REFERENCES "Floor"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "Bed"
  ADD COLUMN IF NOT EXISTS "monthlyRentOverrideInr" INTEGER,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "PropertyDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
  "ownerId" TEXT NOT NULL,
  "docType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "status" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "TenantStay"
  ADD COLUMN IF NOT EXISTS "tenantCode" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "depositPaid" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "noticeDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "checkoutRequestedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "BedTransfer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "stayId" TEXT NOT NULL REFERENCES "TenantStay"("id") ON DELETE CASCADE,
  "propertyId" TEXT NOT NULL,
  "fromRoomId" TEXT NOT NULL,
  "fromBedId" TEXT NOT NULL,
  "fromBedCode" TEXT NOT NULL,
  "toRoomId" TEXT NOT NULL,
  "toBedId" TEXT NOT NULL,
  "toBedCode" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TenantDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "stayId" TEXT NOT NULL REFERENCES "TenantStay"("id") ON DELETE CASCADE,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "docType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "status" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "RentCharge"
  ADD COLUMN IF NOT EXISTS "lateFeeInr" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paymentMode" TEXT,
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "OutstandingDue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES "Property"("id"),
  "stayId" TEXT REFERENCES "TenantStay"("id"),
  "tenantId" TEXT NOT NULL,
  "tenantName" TEXT NOT NULL,
  "isFormerTenant" BOOLEAN NOT NULL DEFAULT false,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "totalAmountInr" INTEGER NOT NULL,
  "paidAmountInr" INTEGER NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StaffTask" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "priority" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PayrollRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "baseSalaryInr" INTEGER NOT NULL,
  "bonusInr" INTEGER NOT NULL DEFAULT 0,
  "deductionInr" INTEGER NOT NULL DEFAULT 0,
  "netPaidInr" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "PropertyReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES "Property"("id"),
  "tenantId" TEXT NOT NULL,
  "tenantName" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "ownerReply" TEXT,
  "repliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "propertyId" TEXT,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorRole" "UserRole" NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "previousValue" TEXT,
  "newValue" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
