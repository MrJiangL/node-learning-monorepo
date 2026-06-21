-- Add passwordHash in a way that works even if the local User table already has rows.
--
-- MySQL cannot add a NOT NULL column without a value when existing rows are present,
-- so we add it nullable, backfill current learning rows, then tighten it to NOT NULL.
ALTER TABLE `User` ADD COLUMN `passwordHash` VARCHAR(191) NULL;

UPDATE `User`
SET `passwordHash` = 'temporary-learning-user'
WHERE `passwordHash` IS NULL;

ALTER TABLE `User` MODIFY COLUMN `passwordHash` VARCHAR(191) NOT NULL;
