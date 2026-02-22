// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-register-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-login-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-oauth-endpoint:p1

import { getPool } from '../db/pool';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password';
import { generateToken } from './jwt';
import { storeSession } from './session';
import { RegisterInput, LoginInput, OAuthGoogleInput, AuthResponse, User, UserPublic, AuthError } from './types';

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-validate-input
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-validate-input

function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    settings: user.settings,
    status: user.status,
  };
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-submit-register
export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { email, password } = input;
  
  // Validate input
  if (!validateEmail(email)) {
    throw new AuthError('Invalid email format', 400);
  }
  
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw new AuthError(passwordValidation.message || 'Invalid password', 400);
  }
  
  const pool = getPool();
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-check-email-unique
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-check-email-unique
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-email-exists-error
  if (existingUser.rows.length > 0) {
    throw new AuthError('Email already registered', 409);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-email-exists-error
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-hash-password
  const passwordHash = await hashPassword(password);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-hash-password
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-insert-user
  const result = await pool.query<User>(
    `INSERT INTO users (email, password_hash, status, settings, created_at, updated_at)
     VALUES ($1, $2, 'active', '{"theme": "system", "improveModelOptIn": false}'::jsonb, NOW(), NOW())
     RETURNING id, email, password_hash as "passwordHash", oauth_provider as "oauthProvider", 
               oauth_id as "oauthId", settings, status, created_at as "createdAt", updated_at as "updatedAt"`,
    [email, passwordHash]
  );
  const user = result.rows[0];
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-insert-user
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-generate-jwt
  const { token, sessionId } = generateToken(user.id, user.email);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-generate-jwt
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-store-session
  await storeSession(sessionId, user.id);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-store-session
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-return-token
  return {
    token,
    user: toUserPublic(user),
  };
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-return-token
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1:inst-submit-register

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-submit-login
export async function login(input: LoginInput): Promise<AuthResponse> {
  const { email, password } = input;
  const pool = getPool();
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-fetch-user
  const result = await pool.query<User>(
    `SELECT id, email, password_hash as "passwordHash", oauth_provider as "oauthProvider",
            oauth_id as "oauthId", settings, status, created_at as "createdAt", updated_at as "updatedAt"
     FROM users WHERE email = $1`,
    [email]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-fetch-user
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-user-not-found
  if (result.rows.length === 0) {
    throw new AuthError('Invalid credentials', 401);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-user-not-found
  
  const user = result.rows[0];
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-check-status
  if (user.status !== 'active') {
    throw new AuthError('Account is not active', 403);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-check-status
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-verify-password
  if (!user.passwordHash) {
    throw new AuthError('Please use OAuth to login', 401);
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-verify-password
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-invalid-password
  if (!isValid) {
    throw new AuthError('Invalid credentials', 401);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-invalid-password
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-generate-jwt-login
  const userRole = (user.settings as { role?: string })?.role || 'user';
  const { token, sessionId } = generateToken(user.id, user.email, userRole);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-generate-jwt-login
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-store-session-login
  await storeSession(sessionId, user.id);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-store-session-login
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-return-token-login
  return {
    token,
    user: toUserPublic(user),
  };
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-return-token-login
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1:inst-submit-login

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-submit-oauth
export async function oauthGoogle(input: OAuthGoogleInput): Promise<AuthResponse> {
  const { token: oauthToken } = input;
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-verify-oauth-token
  // Verify token with Google API using google-auth-library
  const { OAuth2Client } = await import('google-auth-library');
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  
  if (!GOOGLE_CLIENT_ID) {
    throw new AuthError('Google OAuth not configured', 500);
  }
  
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  let payload: { email?: string; sub?: string };
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: oauthToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const ticketPayload = ticket.getPayload();
    if (!ticketPayload || !ticketPayload.email || !ticketPayload.sub) {
      throw new Error('Invalid token payload');
    }
    payload = { email: ticketPayload.email, sub: ticketPayload.sub };
  } catch (err) {
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-oauth-invalid
    console.error('Google OAuth verification failed:', err);
    throw new AuthError('Invalid OAuth token', 401);
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-oauth-invalid
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-verify-oauth-token
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-extract-oauth-profile
  const email = payload.email!;
  const oauthId = payload.sub!;
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-extract-oauth-profile
  
  const pool = getPool();
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-find-oauth-user
  const existingResult = await pool.query<User>(
    `SELECT id, email, password_hash as "passwordHash", oauth_provider as "oauthProvider",
            oauth_id as "oauthId", settings, status, created_at as "createdAt", updated_at as "updatedAt"
     FROM users 
     WHERE email = $1 OR (oauth_provider = 'google' AND oauth_id = $2)`,
    [email, oauthId]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-find-oauth-user
  
  let user: User;
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-create-oauth-user
  if (existingResult.rows.length === 0) {
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-insert-oauth-user
    const insertResult = await pool.query<User>(
      `INSERT INTO users (email, oauth_provider, oauth_id, status, settings, created_at, updated_at)
       VALUES ($1, 'google', $2, 'active', '{"theme": "system", "improveModelOptIn": false}'::jsonb, NOW(), NOW())
       RETURNING id, email, password_hash as "passwordHash", oauth_provider as "oauthProvider",
                 oauth_id as "oauthId", settings, status, created_at as "createdAt", updated_at as "updatedAt"`,
      [email, oauthId]
    );
    user = insertResult.rows[0];
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-insert-oauth-user
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-create-oauth-user
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-link-oauth
  } else if (existingResult.rows[0].oauthId !== oauthId) {
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-update-oauth-link
    const updateResult = await pool.query<User>(
      `UPDATE users SET oauth_provider = 'google', oauth_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, password_hash as "passwordHash", oauth_provider as "oauthProvider",
                 oauth_id as "oauthId", settings, status, created_at as "createdAt", updated_at as "updatedAt"`,
      [oauthId, existingResult.rows[0].id]
    );
    user = updateResult.rows[0];
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-update-oauth-link
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-link-oauth
  } else {
    user = existingResult.rows[0];
  }
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-generate-jwt-oauth
  const { token, sessionId } = generateToken(user.id, user.email);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-generate-jwt-oauth
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-store-session-oauth
  await storeSession(sessionId, user.id);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-store-session-oauth
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-return-token-oauth
  return {
    token,
    user: toUserPublic(user),
  };
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-return-token-oauth
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1:inst-submit-oauth

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1:inst-fetch-user-me
export async function getCurrentUser(userId: string): Promise<UserPublic> {
  const pool = getPool();
  
  const result = await pool.query<User>(
    `SELECT id, email, password_hash as "passwordHash", oauth_provider as "oauthProvider",
            oauth_id as "oauthId", settings, status, created_at as "createdAt", updated_at as "updatedAt"
     FROM users WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw new AuthError('User not found', 404);
  }
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1:inst-return-user-info
  return toUserPublic(result.rows[0]);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1:inst-return-user-info
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1:inst-fetch-user-me
