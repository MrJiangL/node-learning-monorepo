-- ActivityLog 原来通过 projectId 外键直接依赖 Project。
--
-- 这会导致一个问题：
-- 删除 Project 时，如果外键是 ON DELETE CASCADE，相关 ActivityLog 也会被一起删掉。
-- 但审计日志通常应该保留，所以这里改成：
-- - projectId：仍然表示“当前还存在的 Project 关系”，删除后允许变成 NULL
-- - projectSnapshotId/projectSnapshotName：记录写日志那一刻的 Project 快照，删除后仍然保留

-- 先移除旧外键，否则 projectId 不能从 NOT NULL 改成 NULL，也不能改 onDelete 行为。
ALTER TABLE `ActivityLog` DROP FOREIGN KEY `ActivityLog_projectId_fkey`;

-- 先允许 projectSnapshotId 为空，方便给已有数据做回填。
ALTER TABLE `ActivityLog`
  ADD COLUMN `projectSnapshotId` VARCHAR(191) NULL,
  ADD COLUMN `projectSnapshotName` VARCHAR(191) NULL;

-- 已有日志用旧 projectId 作为快照 id。
-- projectSnapshotName 从 Project 表回填，方便 Project 后续被删除后仍然知道当时的名字。
UPDATE `ActivityLog`
LEFT JOIN `Project` ON `Project`.`id` = `ActivityLog`.`projectId`
SET
  `ActivityLog`.`projectSnapshotId` = `ActivityLog`.`projectId`,
  `ActivityLog`.`projectSnapshotName` = `Project`.`name`;

-- 回填完成后，projectSnapshotId 就可以变成必填字段。
ALTER TABLE `ActivityLog`
  MODIFY `projectSnapshotId` VARCHAR(191) NOT NULL;

-- 允许 Project 删除后，把 ActivityLog.projectId 置空。
ALTER TABLE `ActivityLog`
  MODIFY `projectId` VARCHAR(191) NULL;

-- 以后查询某个 Project 的历史日志时，即使 Project 已删除，也走快照 id。
CREATE INDEX `ActivityLog_projectSnapshotId_createdAt_idx`
  ON `ActivityLog`(`projectSnapshotId`, `createdAt`);

-- 新外键使用 ON DELETE SET NULL，保留日志本体。
ALTER TABLE `ActivityLog`
  ADD CONSTRAINT `ActivityLog_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
