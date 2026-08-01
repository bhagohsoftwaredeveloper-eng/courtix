-- DropForeignKey
ALTER TABLE `Dispute` DROP FOREIGN KEY `Dispute_facilityId_fkey`;

-- AlterTable
ALTER TABLE `Dispute` MODIFY `facilityId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `Facility`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
