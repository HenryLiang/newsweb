-- CreateTable
CREATE TABLE `BrowsingHistory` (
    `userId` VARCHAR(191) NOT NULL,
    `articleId` VARCHAR(191) NOT NULL,
    `articleTitle` VARCHAR(191) NOT NULL,
    `viewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BrowsingHistory_userId_viewedAt_idx`(`userId`, `viewedAt`),
    PRIMARY KEY (`userId`, `articleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BrowsingHistory` ADD CONSTRAINT `BrowsingHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
