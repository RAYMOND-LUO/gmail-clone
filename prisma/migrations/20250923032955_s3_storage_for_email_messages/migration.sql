-- AlterTable
ALTER TABLE "public"."EmailMessage" ADD COLUMN     "htmlS3Key" TEXT,
ADD COLUMN     "rawS3Key" TEXT,
ADD COLUMN     "textPlain" TEXT;
