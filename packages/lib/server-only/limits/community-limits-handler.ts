import { getSession } from '@documenso/auth/server/lib/utils/get-session';

import { getCommunityLimits } from './get-community-limits';

export const communityLimitsHandler = async (request: Request) => {
  try {
    const { user } = await getSession(request);
    const teamId = Number(request.headers.get('team-id'));
    if (!Number.isInteger(teamId) || teamId <= 0) {
      return Response.json({ error: 'Invalid team id' }, { status: 400 });
    }
    return Response.json(await getCommunityLimits({ userId: user.id, teamId }));
  } catch {
    return Response.json({ error: 'Unable to resolve limits' }, { status: 401 });
  }
};
