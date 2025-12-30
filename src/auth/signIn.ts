import { jwtDecode } from 'jwt-decode';

import { Environment } from '../../environment';
import type { Session } from './types';

type SignInResponse = {
  access: string;
};

type AccessTokenDecoded = {
  user_id?: string | number;
};

export const signIn = async (email: string, password: string): Promise<Session> => {
  const response = await fetch(`${Environment.apiBaseUrl}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const token = (await response.json()) as SignInResponse;
  const decoded = jwtDecode<AccessTokenDecoded>(token.access);
  const userId = decoded.user_id;
  if (userId == null || (typeof userId !== 'string' && typeof userId !== 'number')) {
    throw new Error('Access token missing user_id');
  }

  return {
    login: String(userId),
    accessToken: token.access,
    syncUrl: Environment.syncUrl,
  };
};
