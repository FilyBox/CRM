import { PDFDocument, rgb, StandardFonts } from '@cantoo/pdf-lib';
import { RECIPIENT_IDENTITY_MIN_FILES } from '@documenso/lib/constants/recipient-identity';
import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';
import { PDF } from '@libpdf/core';
import { setupI18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { Recipient, RecipientIdentityEvidence } from '@prisma/client';
import { RecipientRole } from '@prisma/client';

import { ZSupportedLanguageCodeSchema } from '../../constants/i18n';
import { getTranslations } from '../../utils/i18n';

type EvidenceRecipient = Pick<Recipient, 'id' | 'name' | 'email' | 'role'> & {
  identityEvidence: Pick<
    RecipientIdentityEvidence,
    'data' | 'fileName' | 'mimeType' | 'position' | 'sha256' | 'storageType'
  >[];
};

type GenerateRecipientIdentityEvidencePdfOptions = {
  envelopeId: string;
  recipients: EvidenceRecipient[];
  pageWidth: number;
  pageHeight: number;
  language: string;
};

const fitWithin = (sourceWidth: number, sourceHeight: number, maxWidth: number, maxHeight: number) => {
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);

  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
  };
};

export const generateRecipientIdentityEvidencePdf = async ({
  envelopeId,
  recipients,
  pageWidth,
  pageHeight,
  language,
}: GenerateRecipientIdentityEvidencePdfOptions) => {
  const locale = ZSupportedLanguageCodeSchema.parse(language);
  const i18n = setupI18n({ locale, messages: { [locale]: await getTranslations(locale) } });
  const signers = recipients.filter((recipient) => recipient.role === RecipientRole.SIGNER);
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const [signerIndex, signer] of signers.entries()) {
    const evidence = [...signer.identityEvidence].sort((a, b) => a.position - b.position);
    const signerName = signer.name || i18n._(msg`Not provided`);

    if (evidence.length < RECIPIENT_IDENTITY_MIN_FILES) {
      throw new Error(`Signer ${signer.id} does not have enough official identification evidence`);
    }

    const page = pdf.addPage([pageWidth, pageHeight]);
    const margin = Math.max(32, Math.min(pageWidth, pageHeight) * 0.055);
    const gap = 16;
    const columns = 2;
    const rows = Math.ceil(evidence.length / columns);
    const headerHeight = 116;
    const footerHeight = 26;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2 - headerHeight - footerHeight;
    const cellWidth = (availableWidth - gap) / columns;
    const cellHeight = (availableHeight - gap * Math.max(0, rows - 1)) / rows;

    page.drawText(i18n._(msg`Official identification evidence`), {
      x: margin,
      y: pageHeight - margin - 22,
      size: 18,
      font: boldFont,
      color: rgb(0.08, 0.1, 0.14),
    });
    page.drawText(i18n._(msg`Signer: ${signerName}`), {
      x: margin,
      y: pageHeight - margin - 49,
      size: 11,
      font: boldFont,
      color: rgb(0.18, 0.22, 0.29),
    });
    page.drawText(i18n._(msg`Email: ${signer.email}`), {
      x: margin,
      y: pageHeight - margin - 66,
      size: 10,
      font: regularFont,
      color: rgb(0.3, 0.35, 0.43),
    });
    page.drawText(i18n._(msg`Signer ID: ${signer.id} | Evidence page ${signerIndex + 1} of ${signers.length}`), {
      x: margin,
      y: pageHeight - margin - 83,
      size: 9,
      font: regularFont,
      color: rgb(0.42, 0.46, 0.53),
    });

    for (const [index, item] of evidence.entries()) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cellX = margin + column * (cellWidth + gap);
      const cellTop = pageHeight - margin - headerHeight - row * (cellHeight + gap);

      page.drawRectangle({
        x: cellX,
        y: cellTop - cellHeight,
        width: cellWidth,
        height: cellHeight,
        borderWidth: 1,
        borderColor: rgb(0.84, 0.86, 0.89),
        color: rgb(0.98, 0.985, 0.99),
      });

      const imageBytes = await getFileServerSide({ type: item.storageType, data: item.data });
      const image = await pdf.embedJpg(imageBytes);
      const imageBox = fitWithin(image.width, image.height, cellWidth - 20, cellHeight - 44);
      const imageX = cellX + (cellWidth - imageBox.width) / 2;
      const imageY = cellTop - 12 - imageBox.height;

      page.drawImage(image, {
        x: imageX,
        y: imageY,
        width: imageBox.width,
        height: imageBox.height,
      });

      page.drawText(i18n._(msg`Official ID image ${index + 1}`), {
        x: cellX + 10,
        y: cellTop - cellHeight + 22,
        size: 9,
        font: boldFont,
        color: rgb(0.22, 0.26, 0.32),
      });
      page.drawText(`SHA-256: ${item.sha256.slice(0, 20)}...`, {
        x: cellX + 10,
        y: cellTop - cellHeight + 9,
        size: 7,
        font: regularFont,
        color: rgb(0.42, 0.46, 0.53),
      });
    }

    page.drawText(i18n._(msg`Envelope ID: ${envelopeId}`), {
      x: margin,
      y: margin - 2,
      size: 8,
      font: regularFont,
      color: rgb(0.5, 0.54, 0.6),
    });
  }

  return await PDF.load(await pdf.save());
};
