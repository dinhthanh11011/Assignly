/*
  Warnings:

  - You are about to drop the column `doReminderSentAt` on the `TaskOccurrence` table. All the data in the column will be lost.
  - You are about to drop the column `reminderSentAt` on the `TaskOccurrence` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('UNASSIGNED', 'DO_TASK');

-- AlterTable
ALTER TABLE "TaskOccurrence" DROP COLUMN "doReminderSentAt",
DROP COLUMN "reminderSentAt",
ADD COLUMN     "assigneeSet" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderLog_date_idx" ON "ReminderLog"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_taskId_date_kind_key" ON "ReminderLog"("taskId", "date", "kind");

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: switch from eagerly-materialized occurrences to sparse overrides.
-- Any pre-existing assignment becomes an explicit assignment in the virtual model.
UPDATE "TaskOccurrence" SET "assigneeSet" = true WHERE "assigneeId" IS NOT NULL;

-- Drop plain auto-generated rows (unassigned, not completed, no reminder override).
-- These days are now expanded on the fly from the task's schedule + rules.
DELETE FROM "TaskOccurrence"
WHERE "assigneeSet" = false
  AND "completedAt" IS NULL
  AND "unassignedReminderTime" IS NULL
  AND "doReminderTime" IS NULL;
