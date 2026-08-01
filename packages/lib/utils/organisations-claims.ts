import {
  COMMUNITY_DEFAULT_ENVELOPE_ITEM_COUNT as DEFAULT_MINIMUM_ENVELOPE_ITEM_COUNT,
  COMMUNITY_DEFAULT_RECIPIENT_COUNT as DEFAULT_RECIPIENT_COUNT,
} from '@documenso/lib/universal/limits';
import type { SubscriptionClaim } from '@prisma/client';

export const generateDefaultSubscriptionClaim = (): Omit<
  SubscriptionClaim,
  'id' | 'organisation' | 'createdAt' | 'updatedAt' | 'originalSubscriptionClaimId'
> => {
  return {
    name: '',
    teamCount: 1,
    memberCount: 1,
    envelopeItemCount: DEFAULT_MINIMUM_ENVELOPE_ITEM_COUNT,
    recipientCount: DEFAULT_RECIPIENT_COUNT,
    locked: false,
    flags: {},

    documentRateLimits: [],
    documentQuota: null,
    emailRateLimits: [],
    emailQuota: null,
    apiRateLimits: [],
    apiQuota: null,
    emailTransportId: null,
  };
};
