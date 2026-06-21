-- DropForeignKey
ALTER TABLE `Project` DROP FOREIGN KEY `Project_id_fkey`;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
