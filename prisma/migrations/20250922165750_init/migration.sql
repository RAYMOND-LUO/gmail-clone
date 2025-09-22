-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "subject" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "snippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "internalDate" TIMESTAMP(3) NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "cc" TEXT,
    "bcc" TEXT,
    "subject" TEXT,
    "snippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "s3Key" TEXT NOT NULL,
    "inlineCid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailSyncState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "historyId" TEXT,
    "lastFullSync" TIMESTAMP(3),
    "lastDeltaSync" TIMESTAMP(3),

    CONSTRAINT "GmailSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailThread_userId_lastMessageAt_idx" ON "EmailThread"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "EmailThread_userId_isRead_lastMessageAt_idx" ON "EmailThread"("userId", "isRead", "lastMessageAt");

-- CreateIndex
CREATE INDEX "EmailThread_userId_isStarred_idx" ON "EmailThread"("userId", "isStarred");

-- CreateIndex
CREATE UNIQUE INDEX "EmailThread_userId_gmailThreadId_key" ON "EmailThread"("userId", "gmailThreadId");

-- CreateIndex
CREATE INDEX "EmailMessage_threadId_internalDate_idx" ON "EmailMessage"("threadId", "internalDate");

-- CreateIndex
CREATE INDEX "EmailMessage_userId_subject_idx" ON "EmailMessage"("userId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_userId_gmailMessageId_key" ON "EmailMessage"("userId", "gmailMessageId");

-- CreateIndex
CREATE INDEX "GmailSyncState_email_idx" ON "GmailSyncState"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GmailSyncState_userId_provider_email_key" ON "GmailSyncState"("userId", "provider", "email");

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailSyncState" ADD CONSTRAINT "GmailSyncState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
