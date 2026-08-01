-- Host verification, payout details, decline reason, and venue photo bytes.
-- Every column is additive and nullable: existing rows need no backfill.

-- Organization: verification fields, business address, and payout destination.
ALTER TABLE `Organization`
  ADD COLUMN `legalName` VARCHAR(191) NULL,
  ADD COLUMN `entityType` ENUM('SOLE_PROP', 'PARTNERSHIP', 'CORPORATION') NULL,
  ADD COLUMN `registrationNo` VARCHAR(191) NULL,
  ADD COLUMN `permitNo` VARCHAR(191) NULL,
  ADD COLUMN `permitCity` VARCHAR(191) NULL,
  ADD COLUMN `tin` VARCHAR(191) NULL,
  ADD COLUMN `addressLine` VARCHAR(191) NULL,
  ADD COLUMN `barangay` VARCHAR(191) NULL,
  ADD COLUMN `addressCity` VARCHAR(191) NULL,
  ADD COLUMN `province` VARCHAR(191) NULL,
  ADD COLUMN `postalCode` VARCHAR(191) NULL,
  ADD COLUMN `repName` VARCHAR(191) NULL,
  ADD COLUMN `repPosition` VARCHAR(191) NULL,
  ADD COLUMN `repMobile` VARCHAR(191) NULL,
  ADD COLUMN `payoutMethod` ENUM('BANK', 'GCASH', 'MAYA') NULL,
  ADD COLUMN `payoutAccountName` VARCHAR(191) NULL,
  ADD COLUMN `verifiedAt` DATETIME(3) NULL;

-- Facility: reason shown to the host when an admin declines their submission.
ALTER TABLE `Facility`
  ADD COLUMN `declineReason` TEXT NULL;

-- FacilityImage: served bytes for an optional venue photo (no CDN yet).
ALTER TABLE `FacilityImage`
  ADD COLUMN `data` LONGBLOB NULL,
  ADD COLUMN `mimeType` VARCHAR(191) NULL;
