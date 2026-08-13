import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  RECIPIENT_IDENTITY_ACCEPTED_MIME_TYPES,
  RECIPIENT_IDENTITY_MAX_FILE_SIZE,
  RECIPIENT_IDENTITY_MAX_FILES,
  RECIPIENT_IDENTITY_MIN_FILES,
} from '@documenso/lib/constants/recipient-identity';
import { deleteFile } from '@documenso/lib/universal/upload/delete-file';
import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';
import { putFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { prisma } from '@documenso/prisma';
import { DocumentStatus, RecipientRole, SigningStatus } from '@prisma/client';
import { Hono } from 'hono';
import sharp from 'sharp';

import type { HonoEnv } from '../../router';

const normalizeFileName = (fileName: string, position: number) => {
  const baseName = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9._-]+/g, '-');

  return `${baseName || `official-id-${position + 1}`}.jpg`;
};

const getPendingSigner = async (token: string) => {
  return await prisma.recipient.findFirst({
    where: {
      token,
      role: RecipientRole.SIGNER,
      signingStatus: SigningStatus.NOT_SIGNED,
      envelope: {
        status: DocumentStatus.PENDING,
        documentMeta: {
          identityVerificationRequired: true,
        },
      },
    },
    select: {
      id: true,
      envelopeId: true,
    },
  });
};

export const recipientIdentityEvidenceRoute = new Hono<HonoEnv>()
  .get('/:token', async (c) => {
    const signer = await getPendingSigner(c.req.param('token'));

    if (!signer) {
      return c.json({ error: 'Signing request not found or no longer accepts evidence' }, 404);
    }

    const evidence = await prisma.recipientIdentityEvidence.findMany({
      where: { recipientId: signer.id },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        fileName: true,
        position: true,
        sha256: true,
        createdAt: true,
      },
    });

    return c.json({
      evidence,
      minimum: RECIPIENT_IDENTITY_MIN_FILES,
      maximum: RECIPIENT_IDENTITY_MAX_FILES,
    });
  })
  .get('/:token/:evidenceId', async (c) => {
    const signer = await getPendingSigner(c.req.param('token'));

    if (!signer) {
      return c.json({ error: 'Signing request not found or no longer accepts evidence' }, 404);
    }

    const evidence = await prisma.recipientIdentityEvidence.findFirst({
      where: {
        id: c.req.param('evidenceId'),
        recipientId: signer.id,
      },
      select: {
        storageType: true,
        data: true,
        sha256: true,
      },
    });

    if (!evidence) {
      return c.json({ error: 'Identification image not found' }, 404);
    }

    if (c.req.header('If-None-Match') === evidence.sha256) {
      return c.status(304);
    }

    const image = await getFileServerSide({ type: evidence.storageType, data: evidence.data });

    c.header('Content-Type', 'image/jpeg');
    c.header('Cache-Control', 'private, max-age=300');
    c.header('ETag', evidence.sha256);

    return c.body(image);
  })
  .post('/:token', async (c) => {
    const signer = await getPendingSigner(c.req.param('token'));

    if (!signer) {
      return c.json({ error: 'Signing request not found or no longer accepts evidence' }, 404);
    }

    const formData = await c.req.formData();
    const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);

    if (files.length === 0 || files.length > RECIPIENT_IDENTITY_MAX_FILES) {
      return c.json(
        {
          error: `Upload between 1 and ${RECIPIENT_IDENTITY_MAX_FILES} images`,
        },
        400,
      );
    }

    const existingEvidence = await prisma.recipientIdentityEvidence.findMany({
      where: { recipientId: signer.id },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        fileName: true,
        position: true,
        sha256: true,
      },
    });

    if (existingEvidence.length + files.length > RECIPIENT_IDENTITY_MAX_FILES) {
      return c.json(
        {
          error: `A maximum of ${RECIPIENT_IDENTITY_MAX_FILES} identification images is allowed`,
        },
        400,
      );
    }

    if (
      files.some(
        (file) =>
          !RECIPIENT_IDENTITY_ACCEPTED_MIME_TYPES.includes(
            file.type as (typeof RECIPIENT_IDENTITY_ACCEPTED_MIME_TYPES)[number],
          ) || file.size > RECIPIENT_IDENTITY_MAX_FILE_SIZE,
      )
    ) {
      return c.json({ error: 'Only JPEG or PNG images up to 10 MB each are accepted' }, 400);
    }

    const uploadedEvidence: Array<{
      fileName: string;
      mimeType: string;
      storageType: Awaited<ReturnType<typeof putFileServerSide>>['type'];
      data: string;
      sha256: string;
      position: number;
    }> = [];

    try {
      const nextPosition = Math.max(-1, ...existingEvidence.map(({ position }) => position)) + 1;

      for (const [index, file] of files.entries()) {
        const position = nextPosition + index;
        const input = Buffer.from(await file.arrayBuffer());

        // Sharp decodes the actual image bytes, applies phone orientation,
        // strips EXIF/GPS metadata and produces a bounded JPEG for storage/PDF.
        const normalized = await sharp(input, { failOn: 'error' })
          .rotate()
          .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 86, mozjpeg: true })
          .toBuffer();

        const fileName = normalizeFileName(file.name, position);
        const stored = await putFileServerSide({
          name: fileName,
          type: 'image/jpeg',
          arrayBuffer: async () => normalized,
        });

        uploadedEvidence.push({
          fileName,
          mimeType: 'image/jpeg',
          storageType: stored.type,
          data: stored.data,
          sha256: createHash('sha256').update(normalized).digest('hex'),
          position,
        });
      }
    } catch (error) {
      await Promise.allSettled(
        uploadedEvidence.map(({ storageType, data }) => deleteFile({ type: storageType, data })),
      );

      c.get('logger').warn({ error }, 'Failed to normalize official identification images');
      return c.json({ error: 'One or more files are not valid identification images' }, 400);
    }

    try {
      await prisma.recipientIdentityEvidence.createMany({
        data: uploadedEvidence.map((evidence) => ({
          ...evidence,
          envelopeId: signer.envelopeId,
          recipientId: signer.id,
        })),
      });
    } catch (error) {
      await Promise.allSettled(
        uploadedEvidence.map(({ storageType, data }) => deleteFile({ type: storageType, data })),
      );
      throw error;
    }

    const savedEvidence = await prisma.recipientIdentityEvidence.findMany({
      where: { recipientId: signer.id },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        fileName: true,
        position: true,
        sha256: true,
      },
    });

    return c.json({
      count: savedEvidence.length,
      evidence: savedEvidence,
    });
  })
  .delete('/:token/:evidenceId', async (c) => {
    const signer = await getPendingSigner(c.req.param('token'));

    if (!signer) {
      return c.json({ error: 'Signing request not found or no longer accepts evidence' }, 404);
    }

    const evidence = await prisma.recipientIdentityEvidence.findFirst({
      where: {
        id: c.req.param('evidenceId'),
        recipientId: signer.id,
      },
      select: {
        id: true,
        storageType: true,
        data: true,
      },
    });

    if (!evidence) {
      return c.json({ error: 'Identification image not found' }, 404);
    }

    await prisma.recipientIdentityEvidence.delete({
      where: { id: evidence.id },
    });

    await deleteFile({ type: evidence.storageType, data: evidence.data }).catch((error: unknown) => {
      c.get('logger').warn({ error, evidenceId: evidence.id }, 'Failed to delete identification image from storage');
    });

    const remainingEvidence = await prisma.recipientIdentityEvidence.findMany({
      where: { recipientId: signer.id },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        fileName: true,
        position: true,
        sha256: true,
      },
    });

    return c.json({
      count: remainingEvidence.length,
      evidence: remainingEvidence,
    });
  });
