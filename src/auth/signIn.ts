import { Environment } from '../../environment';
import type { Session } from './types';

const DEV_ACCESS_TOKEN = 'dev-local-token';

export const signIn = async (): Promise<Session> => {
  return {
    login: '1',
    accessToken: DEV_ACCESS_TOKEN,
    syncUrl: Environment.syncUrl,
  };
};
