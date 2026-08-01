import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { NEXT_PUBLIC_WEBAPP_URL } from '../../constants/app';
import {
  COMMUNITY_DEFAULT_ENVELOPE_ITEM_COUNT,
  COMMUNITY_UNLIMITED_LIMITS,
  type CommunityLimitsResponse,
  normaliseCommunityLimits,
} from '../../universal/limits';

export type CommunityLimitsContextValue = CommunityLimitsResponse & {
  refreshLimits: () => Promise<void>;
};

const CommunityLimitsContext = createContext<CommunityLimitsContextValue | null>(null);

export const useCommunityLimits = () => {
  const limits = useContext(CommunityLimitsContext);
  if (!limits) {
    throw new Error('useCommunityLimits must be used within CommunityLimitsProvider');
  }
  return limits;
};

type CommunityLimitsProviderProps = {
  initialValue?: CommunityLimitsResponse;
  disableLimitsFetch?: boolean;
  teamId: number;
  children?: React.ReactNode;
};

const defaultValue: CommunityLimitsResponse = {
  quota: COMMUNITY_UNLIMITED_LIMITS,
  remaining: COMMUNITY_UNLIMITED_LIMITS,
  maximumEnvelopeItemCount: COMMUNITY_DEFAULT_ENVELOPE_ITEM_COUNT,
};

export const CommunityLimitsProvider = ({
  initialValue = defaultValue,
  disableLimitsFetch = false,
  teamId,
  children,
}: CommunityLimitsProviderProps) => {
  const [limits, setLimits] = useState(initialValue);

  const refreshLimits = useCallback(async () => {
    if (disableLimitsFetch) {
      return;
    }

    const url = new URL('/api/limits', NEXT_PUBLIC_WEBAPP_URL());
    const response = await fetch(url, {
      headers: {
        'team-id': teamId.toString(),
      },
    });
    if (response.ok) {
      setLimits(normaliseCommunityLimits(await response.json()));
    }
  }, [disableLimitsFetch, teamId]);

  useEffect(() => {
    void refreshLimits();
  }, [refreshLimits]);

  return (
    <CommunityLimitsContext.Provider value={{ ...limits, refreshLimits }}>{children}</CommunityLimitsContext.Provider>
  );
};
