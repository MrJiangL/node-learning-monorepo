/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Job` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Job_idempotencyKey_key` ON `Job`(`idempotencyKey`);
