import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { RecipientRole } from '@prisma/client';

import { RECIPIENT_IDENTITY_MIN_FILES } from '../../constants/recipient-identity';

type AssertRecipientIdentityEvidenceOptions =
  | { recipientId: number; token?: never }
  | { recipientId?: never; token: string };

export const assertRecipientIdentityEvidence = async (options: AssertRecipientIdentityEvidenceOptions) => {
  const recipient = await prisma.recipient.findFirstOrThrow({
    where: 'recipientId' in options ? { id: options.recipientId } : { token: options.token },
    select: {
      id: true,
      role: true,
      _count: {
        select: {
          identityEvidence: true,
        },
      },
    },
  });

  if (recipient.role !== RecipientRole.SIGNER) {
    return;
  }

  if (recipient._count.identityEvidence < RECIPIENT_IDENTITY_MIN_FILES) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: `At least ${RECIPIENT_IDENTITY_MIN_FILES} official identification images are required before signing`,
      statusCode: 400,
    });
  }
};
