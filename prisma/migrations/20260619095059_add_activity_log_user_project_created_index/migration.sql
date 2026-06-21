-- CreateIndex
CREATE INDEX `ActivityLog_userId_projectSnapshotId_createdAt_idx` ON `ActivityLog`(`userId`, `projectSnapshotId`, `createdAt`);
