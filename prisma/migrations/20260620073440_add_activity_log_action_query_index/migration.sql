-- CreateIndex
CREATE INDEX `ActivityLog_userId_projectSnapshotId_action_createdAt_idx` ON `ActivityLog`(`userId`, `projectSnapshotId`, `action`, `createdAt`);
