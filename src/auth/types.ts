// Auth module type definitions
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-register-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-login-endpoint:p1

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  oauthProvider: string | null;
  oauthId: string | null;
  settings: UserSettings;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultModel?: string;
  improveModelOptIn: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface OAuthGoogleInput {
  token: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface UserPublic {
  id: string;
  email: string;
  settings: UserSettings;
  status: string;
}

export interface JwtPayload {
  sub: string;      // user_id
  email: string;
  sid: string;      // session_id
  iat: number;
  exp: number;
}

export interface SessionData {
  userId: string;
  createdAt: string;
  lastActive: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
