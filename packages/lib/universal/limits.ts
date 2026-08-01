export type CommunityLimits = {
  documents: number;
  recipients: number;
  directTemplates: number;
};

export type CommunityLimitsResponse = {
  quota: CommunityLimits;
  remaining: CommunityLimits;
  maximumEnvelopeItemCount: number;
};

export const COMMUNITY_UNLIMITED_LIMITS: CommunityLimits = {
  documents: Number.POSITIVE_INFINITY,
  recipients: Number.POSITIVE_INFINITY,
  directTemplates: Number.POSITIVE_INFINITY,
};

export const COMMUNITY_DEFAULT_ENVELOPE_ITEM_COUNT = 5;
export const COMMUNITY_DEFAULT_RECIPIENT_COUNT = 20;

export const normaliseCommunityLimits = (input: unknown): CommunityLimitsResponse => {
  const value = (input ?? {}) as Partial<CommunityLimitsResponse>;
  const read = (limit: unknown) => (limit === null ? Number.POSITIVE_INFINITY : Number(limit ?? 0));

  return {
    quota: {
      documents: read(value.quota?.documents),
      recipients: read(value.quota?.recipients),
      directTemplates: read(value.quota?.directTemplates),
    },
    remaining: {
      documents: read(value.remaining?.documents),
      recipients: read(value.remaining?.recipients),
      directTemplates: read(value.remaining?.directTemplates),
    },
    maximumEnvelopeItemCount: Number(value.maximumEnvelopeItemCount ?? COMMUNITY_DEFAULT_ENVELOPE_ITEM_COUNT),
  };
};
