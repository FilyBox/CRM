import { communityLimitsHandler as limitsHandler } from '@documenso/lib/server-only/limits/community-limits-handler';

import type { Route } from './+types/limits';

export async function loader({ request }: Route.LoaderArgs) {
  return limitsHandler(request);
}
