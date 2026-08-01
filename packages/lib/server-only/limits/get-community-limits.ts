import { prisma } from '@documenso/prisma';

import {
  COMMUNITY_DEFAULT_ENVELOPE_ITEM_COUNT,
  COMMUNITY_UNLIMITED_LIMITS,
  type CommunityLimitsResponse,
} from '../../universal/limits';

export type GetCommunityLimitsOptions = {
  userId: number;
  teamId: number;
};

/**
 * Limits for the self-hosted community build.
 *
 * This implementation is intentionally independent of packages/ee. It only
 * verifies membership and returns the unlimited quotas expected by an
 * installation with billing disabled.
 */
export const getCommunityLimits = async ({
  userId,
  teamId,
}: GetCommunityLimitsOptions): Promise<CommunityLimitsResponse> => {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      organisation: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      organisation: {
        include: {
          organisationClaim: true,
        },
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  return {
    quota: { ...COMMUNITY_UNLIMITED_LIMITS },
    remaining: { ...COMMUNITY_UNLIMITED_LIMITS },
    maximumEnvelopeItemCount:
      team.organisation.organisationClaim.envelopeItemCount ?? COMMUNITY_DEFAULT_ENVELOPE_ITEM_COUNT,
  };
};
