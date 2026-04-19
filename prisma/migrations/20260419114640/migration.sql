/*
  Warnings:

  - You are about to drop the `activitylog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `activitylog` DROP FOREIGN KEY `ActivityLog_userId_fkey`;

-- DropTable
DROP TABLE `activitylog`;
