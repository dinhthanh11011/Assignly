-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "doReminderTime" TEXT,
ADD COLUMN     "unassignedReminderTime" TEXT;

-- AlterTable
ALTER TABLE "TaskOccurrence" ADD COLUMN     "doReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "doReminderTime" TEXT,
ADD COLUMN     "unassignedReminderTime" TEXT;
