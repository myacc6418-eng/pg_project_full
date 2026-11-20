-- PG Finder Modular Monolith Initial PostgreSQL Migration
-- Generated to match apps/api/prisma/schema.prisma

CREATE TYPE "UserRole" AS ENUM ('TENANT', 'PG_OWNER', 'SUPER_ADMIN');
CREATE TYPE "PropertyGenderType" AS ENUM ('BOYS', 'GIRLS', 'COLIVING');
CREATE TYPE "PropertyApprovalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'UNDER_REVIEW', 'CORRECTIONS_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "LocationVerificationStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'CORRECTIONS_REQUIRED', 'RESUBMITTED', 'VERIFIED', 'REJECTED', 'REVERIFICATION_REQUIRED');
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'INACTIVE');
CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'PRO', 'BUSINESS');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "isSuspended" BOOLEAN NOT NULL DEFAULT FALSE,
  "businessName" TEXT,
  "city" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Property" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id"),
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "genderType" "PropertyGenderType" NOT NULL,
  "address" TEXT NOT NULL,
  "landmark" TEXT NOT NULL,
  "locality" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "ownerLat" NUMERIC(9,6) NOT NULL,
  "ownerLng" NUMERIC(9,6) NOT NULL,
  "verifiedLat" NUMERIC(9,6),
  "verifiedLng" NUMERIC(9,6),
  "startingRentInr" INTEGER NOT NULL,
  "securityDepositInr" INTEGER NOT NULL,
  "approvalStatus" "PropertyApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "locationStatus" "LocationVerificationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "hasLifetimeListing" BOOLEAN NOT NULL DEFAULT FALSE,
  "coveredBySubscription" BOOLEAN NOT NULL DEFAULT FALSE,
  "isPromoted" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce one active stay per tenant at the database layer
CREATE TABLE "TenantStay" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "User"("id"),
  "propertyId" TEXT NOT NULL REFERENCES "Property"("id"),
  "roomId" TEXT NOT NULL,
  "bedId" TEXT NOT NULL,
  "monthlyRentInr" INTEGER NOT NULL,
  "securityDepositInr" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "termsAcceptedAt" TIMESTAMPTZ NOT NULL,
  "checkedOutAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "one_active_stay_per_tenant"
  ON "TenantStay"("tenantId")
  WHERE "status" IN ('ACTIVE', 'CHECKOUT_REQUESTED');
