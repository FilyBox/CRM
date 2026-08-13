-- CreateTable
ALTER TABLE "DocumentMeta"
ADD COLUMN "identityVerificationRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RecipientIdentityEvidence" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageType" "DocumentDataType" NOT NULL,
    "data" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipientIdentityEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipientIdentityEvidence_recipientId_position_key"
ON "RecipientIdentityEvidence"("recipientId", "position");

-- CreateIndex
CREATE INDEX "RecipientIdentityEvidence_envelopeId_idx"
ON "RecipientIdentityEvidence"("envelopeId");

-- CreateIndex
CREATE INDEX "RecipientIdentityEvidence_recipientId_idx"
ON "RecipientIdentityEvidence"("recipientId");

-- AddForeignKey
ALTER TABLE "RecipientIdentityEvidence"
ADD CONSTRAINT "RecipientIdentityEvidence_envelopeId_fkey"
FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipientIdentityEvidence"
ADD CONSTRAINT "RecipientIdentityEvidence_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
