import { AuthService } from '../../app/auth/service/auth.service'
import type { SignUpInput, SignInInput, AuthResult } from '../../app/auth/types/auth.types'

export class AuthBffService {
  constructor(private authService: AuthService = new AuthService()) {}

  async signUp(input: SignUpInput): Promise<AuthResult> {
    return this.authService.signUp(input)
  }

  async signIn(input: SignInInput): Promise<AuthResult> {
    return this.authService.signIn(input)
  }

  async getProfile(id: string) {
    return this.authService.getProfile(id)
  }
}
