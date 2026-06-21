-- AlterTable
ALTER TABLE `Plan` ADD COLUMN `usrId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Plan_usrId_idx` ON `Plan`(`usrId`);

-- AddForeignKey
ALTER TABLE `Plan` ADD CONSTRAINT `Plan_usrId_fkey` FOREIGN KEY (`usrId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
