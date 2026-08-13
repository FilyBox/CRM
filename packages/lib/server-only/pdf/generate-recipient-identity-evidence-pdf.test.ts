import { DocumentDataType, RecipientRole } from '@prisma/client';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/core/macro', () => ({
  msg: (parts: TemplateStringsArray, ...values: unknown[]) => ({
    id: parts.reduce(
      (message, part, index) => message + part + (index < values.length ? String(values[index]) : ''),
      '',
    ),
  }),
}));

import { generateRecipientIdentityEvidencePdf } from './generate-recipient-identity-evidence-pdf';

const createEvidence = async (position: number) => {
  const image = await sharp({
    create: {
      width: 40,
      height: 30,
      channels: 3,
      background: { r: 245, g: 245, b: 245 },
    },
  })
    .jpeg()
    .toBuffer();

  return {
    data: image.toString('base64'),
    fileName: `official-id-${position + 1}.jpg`,
    mimeType: 'image/jpeg',
    position,
    sha256: 'a'.repeat(64),
    storageType: DocumentDataType.BYTES_64,
  };
};

describe('generateRecipientIdentityEvidencePdf', () => {
  it('creates exactly one evidence page for each signer', async () => {
    const evidence = await Promise.all([createEvidence(0), createEvidence(1)]);
    const pdf = await generateRecipientIdentityEvidencePdf({
      envelopeId: 'envelope-1',
      language: 'en',
      pageWidth: 612,
      pageHeight: 792,
      recipients: [
        { id: 1, name: 'Signer One', email: 'one@example.com', role: RecipientRole.SIGNER, identityEvidence: evidence },
        { id: 2, name: 'Signer Two', email: 'two@example.com', role: RecipientRole.SIGNER, identityEvidence: evidence },
        { id: 3, name: 'Viewer', email: 'viewer@example.com', role: RecipientRole.VIEWER, identityEvidence: [] },
      ],
    });

    expect(pdf.getPageCount()).toBe(2);
  });

  it('rejects a signer with fewer than two identification images', async () => {
    await expect(
      generateRecipientIdentityEvidencePdf({
        envelopeId: 'envelope-1',
        language: 'en',
        pageWidth: 612,
        pageHeight: 792,
        recipients: [
          {
            id: 1,
            name: 'Signer One',
            email: 'one@example.com',
            role: RecipientRole.SIGNER,
            identityEvidence: [await createEvidence(0)],
          },
        ],
      }),
    ).rejects.toThrow('does not have enough official identification evidence');
  });
});
