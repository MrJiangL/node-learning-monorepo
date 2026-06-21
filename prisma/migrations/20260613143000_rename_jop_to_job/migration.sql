-- Rename the misspelled learning-table names from Jop/JopLog to Job/JobLog.
-- This keeps the already-created local migration history intact while making
-- the final database model match the task card and future Prisma Client names.

ALTER TABLE `JopLog` DROP FOREIGN KEY `JopLog_jopId_fkey`;

ALTER TABLE `Jop` DROP INDEX `Jop_status_createdAt_idx`;
ALTER TABLE `Jop` DROP INDEX `Jop_type_idx`;

RENAME TABLE `Jop` TO `Job`;
RENAME TABLE `JopLog` TO `JobLog`;

ALTER TABLE `JobLog` CHANGE `jopId` `jobId` VARCHAR(191) NOT NULL;

CREATE INDEX `Job_status_createdAt_idx` ON `Job`(`status`, `createdAt`);
CREATE INDEX `Job_type_idx` ON `Job`(`type`);
CREATE INDEX `JobLog_jobId_idx` ON `JobLog`(`jobId`);

ALTER TABLE `JobLog` ADD CONSTRAINT `JobLog_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
