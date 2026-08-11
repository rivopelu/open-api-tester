import {
  api,
  unwrap,
  type AuthAccount,
  type AuthResult,
} from '../lib/api';

export interface AuthRepository {
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(name: string, email: string, password: string): Promise<AuthResult>;
  me(): Promise<AuthAccount>;
}

export const authRepository: AuthRepository = {
  signIn(email, password) {
    return unwrap<AuthResult>(api.post('/auth/sign-in', { email, password }));
  },

  signUp(name, email, password) {
    return unwrap<AuthResult>(api.post('/auth/sign-up', { name, email, password }));
  },

  me() {
    return unwrap<AuthAccount>(api.get('/auth/me'));
  },
};
