-- Rename the accidental `usrId` column to the intended `userId` name.
--
-- We drop and recreate the foreign key/index around the rename because MySQL
-- stores those constraints separately from the column definition.
ALTER TABLE `Plan` DROP FOREIGN KEY `Plan_usrId_fkey`;

DROP INDEX `Plan_usrId_idx` ON `Plan`;

ALTER TABLE `Plan` CHANGE COLUMN `usrId` `userId` VARCHAR(191) NULL;

CREATE INDEX `Plan_userId_idx` ON `Plan`(`userId`);

ALTER TABLE `Plan`
  ADD CONSTRAINT `Plan_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
