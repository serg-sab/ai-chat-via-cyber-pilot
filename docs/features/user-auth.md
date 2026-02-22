# Feature: User Authentication

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-featstatus-user-auth`

## 1. Feature Context

- [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-feature-user-auth`

### 1.1 Overview

Enable user registration, login, and session management. Supports email/password and OAuth (Google) authentication flows with JWT-based sessions stored in Redis.

### 1.2 Purpose

This feature provides the authentication layer that enables user-specific features like conversation history persistence and personalized settings.

**Problem**: Users need secure authentication to access their personal chat history and settings across sessions and devices.

**Primary value**: Enables persistent user identity with secure credential management and stateless JWT-based session handling.

**Key assumptions**: Database foundation is in place with users table. Redis is available for session storage.

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-ai-chat-via-cyber-pilot-actor-user` | Registers, logs in, manages session |
| `cpt-ai-chat-via-cyber-pilot-actor-anon` | Registers to become a user, logs in |

### 1.4 References

- **PRD**: [PRD.md](../PRD.md)
- **Design**: [DESIGN.md](../DESIGN.md)
- **Dependencies**: `cpt-ai-chat-via-cyber-pilot-feature-database-foundation`

## 2. Actor Flows (CDSL)

### User Registration Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-user-auth-register`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-anon`

**Success Scenarios**:
- New user account created with hashed password
- JWT token returned for immediate login
- Session stored in Redis

**Error Scenarios**:
- Email already exists — return 409 Conflict
- Invalid email format — return 400 Bad Request
- Weak password — return 400 Bad Request

**Steps**:
1. [x] - `p1` - User submits email and password via POST /api/v1/auth/register - `inst-submit-register`
2. [x] - `p1` - Validate email format and password strength - `inst-validate-input`
3. [x] - `p1` - DB: SELECT FROM users WHERE email = :email to check uniqueness - `inst-check-email-unique`
4. [x] - `p1` - **IF** email exists **THEN** return 409 Conflict - `inst-email-exists-error`
5. [x] - `p1` - Algorithm: hash password using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password` - `inst-hash-password`
6. [x] - `p1` - DB: INSERT INTO users (email, password_hash, status, created_at, updated_at) - `inst-insert-user`
7. [x] - `p1` - Algorithm: generate JWT using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt` - `inst-generate-jwt`
8. [x] - `p1` - Algorithm: store session using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session` - `inst-store-session`
9. [x] - `p1` - **RETURN** JWT token and user info - `inst-return-token`

### User Login Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-user-auth-login`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- User authenticated with valid credentials
- JWT token returned
- Session stored in Redis

**Error Scenarios**:
- User not found — return 401 Unauthorized
- Invalid password — return 401 Unauthorized
- Account suspended — return 403 Forbidden

**Steps**:
1. [x] - `p1` - User submits email and password via POST /api/v1/auth/login - `inst-submit-login`
2. [x] - `p1` - DB: SELECT FROM users WHERE email = :email - `inst-fetch-user`
3. [x] - `p1` - **IF** user not found **THEN** return 401 Unauthorized - `inst-user-not-found`
4. [x] - `p1` - **IF** user.status != 'active' **THEN** return 403 Forbidden - `inst-check-status`
5. [x] - `p1` - Algorithm: verify password using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-verify-password` - `inst-verify-password`
6. [x] - `p1` - **IF** password invalid **THEN** return 401 Unauthorized - `inst-invalid-password`
7. [x] - `p1` - Algorithm: generate JWT using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt` - `inst-generate-jwt-login`
8. [x] - `p1` - Algorithm: store session using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session` - `inst-store-session-login`
9. [x] - `p1` - **RETURN** JWT token and user info - `inst-return-token-login`

### OAuth Login Flow (Google)

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-anon`, `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- New user created from OAuth profile
- Existing user linked/logged in via OAuth
- JWT token returned

**Error Scenarios**:
- Invalid OAuth token — return 401 Unauthorized
- OAuth provider error — return 502 Bad Gateway

**Steps**:
1. [x] - `p1` - User submits Google OAuth token via POST /api/v1/auth/oauth/google - `inst-submit-oauth`
2. [x] - `p1` - Verify OAuth token with Google API - `inst-verify-oauth-token`
3. [x] - `p1` - **IF** token invalid **THEN** return 401 Unauthorized - `inst-oauth-invalid`
4. [x] - `p1` - Extract email and oauth_id from token payload - `inst-extract-oauth-profile`
5. [x] - `p1` - DB: SELECT FROM users WHERE email = :email OR (oauth_provider = 'google' AND oauth_id = :oauth_id) - `inst-find-oauth-user`
6. [x] - `p1` - **IF** user not found **THEN** - `inst-create-oauth-user`
   1. [x] - `p1` - DB: INSERT INTO users (email, oauth_provider, oauth_id, status, created_at, updated_at) - `inst-insert-oauth-user`
7. [x] - `p1` - **ELSE IF** user found by email but no oauth_id **THEN** - `inst-link-oauth`
   1. [x] - `p1` - DB: UPDATE users SET oauth_provider = 'google', oauth_id = :oauth_id WHERE id = :id - `inst-update-oauth-link`
8. [x] - `p1` - Algorithm: generate JWT using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt` - `inst-generate-jwt-oauth`
9. [x] - `p1` - Algorithm: store session using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session` - `inst-store-session-oauth`
10. [x] - `p1` - **RETURN** JWT token and user info - `inst-return-token-oauth`

### Logout Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Session invalidated in Redis
- Client clears token

**Error Scenarios**:
- Invalid token — return 401 Unauthorized (but still clear client)

**Steps**:
1. [x] - `p1` - User submits POST /api/v1/auth/logout with JWT - `inst-submit-logout`
2. [x] - `p1` - Extract session ID from JWT - `inst-extract-session-id`
3. [x] - `p1` - REDIS: DEL session:{session_id} - `inst-delete-session`
4. [x] - `p1` - **RETURN** 200 OK - `inst-return-logout-ok`

### Get Current User Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-user-auth-me`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Current user info returned

**Error Scenarios**:
- Invalid/expired token — return 401 Unauthorized

**Steps**:
1. [x] - `p1` - User submits GET /api/v1/auth/me with JWT - `inst-submit-me`
2. [x] - `p1` - Algorithm: validate JWT using `cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt` - `inst-validate-jwt-me`
3. [x] - `p1` - DB: SELECT FROM users WHERE id = :user_id - `inst-fetch-user-me`
4. [x] - `p1` - **RETURN** user info (id, email, settings, status) - `inst-return-user-info`

## 3. Processes / Business Logic (CDSL)

### Hash Password

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password`

**Input**: Plain text password

**Output**: Bcrypt hash string

**Steps**:
1. [x] - `p1` - Generate salt with cost factor 12 - `inst-generate-salt`
2. [x] - `p1` - Hash password with bcrypt using salt - `inst-bcrypt-hash`
3. [x] - `p1` - **RETURN** hash string - `inst-return-hash`

### Verify Password

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-user-auth-verify-password`

**Input**: Plain text password, stored hash

**Output**: Boolean (valid/invalid)

**Steps**:
1. [x] - `p1` - Compare password against hash using bcrypt.compare - `inst-bcrypt-compare`
2. [x] - `p1` - **RETURN** comparison result - `inst-return-compare-result`

### Generate JWT

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt`

**Input**: User ID, email

**Output**: Signed JWT string

**Steps**:
1. [x] - `p1` - Generate unique session ID (UUID) - `inst-generate-session-id`
2. [x] - `p1` - Build claims: sub (user_id), email, sid (session_id), iat, exp (24h) - `inst-build-claims`
3. [x] - `p1` - Sign JWT with HS256 using JWT_SECRET - `inst-sign-jwt`
4. [x] - `p1` - **RETURN** signed token - `inst-return-jwt`

### Validate JWT

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt`

**Input**: JWT token string

**Output**: Decoded claims or error

**Steps**:
1. [x] - `p1` - Verify JWT signature using JWT_SECRET - `inst-verify-signature`
2. [x] - `p1` - **IF** signature invalid **THEN** throw AuthError - `inst-invalid-signature`
3. [x] - `p1` - Check exp claim for expiration - `inst-check-expiration`
4. [x] - `p1` - **IF** expired **THEN** throw AuthError - `inst-token-expired`
5. [x] - `p1` - REDIS: GET session:{sid} to verify session exists - `inst-check-session-exists`
6. [x] - `p1` - **IF** session not found **THEN** throw AuthError - `inst-session-not-found`
7. [x] - `p1` - **RETURN** decoded claims - `inst-return-claims`

### Store Session

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session`

**Input**: Session ID, user ID

**Output**: Session stored in Redis

**Steps**:
1. [x] - `p1` - Build session data: user_id, created_at, last_active - `inst-build-session-data`
2. [x] - `p1` - REDIS: SET session:{session_id} with TTL 24h - `inst-redis-set-session`
3. [x] - `p1` - **RETURN** success - `inst-return-session-stored`

## 4. States (CDSL)

### User Session State

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-state-user-session`

```
[Anonymous] --register/login--> [Authenticated] --logout/expire--> [Anonymous]
                                      |
                                      +--token_refresh--> [Authenticated]
```

**States**:
- **Anonymous**: No valid session, cannot access protected resources
- **Authenticated**: Valid JWT and Redis session, full access to user resources

**Transitions**:
- `register`: Anonymous → Authenticated (new user created)
- `login`: Anonymous → Authenticated (existing user)
- `oauth_login`: Anonymous → Authenticated (OAuth flow)
- `logout`: Authenticated → Anonymous (session invalidated)
- `expire`: Authenticated → Anonymous (token/session expired)
- `token_refresh`: Authenticated → Authenticated (extend session)

## 5. Definitions of Done

### User Registration Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-user-auth-register-endpoint`

The system **MUST** expose POST /api/v1/auth/register that accepts email and password, validates input, creates user with hashed password, and returns JWT.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-user-auth-register`

**Touches**:
- API: POST /api/v1/auth/register
- DB: users table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-auth`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-auth-service`

### User Login Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-user-auth-login-endpoint`

The system **MUST** expose POST /api/v1/auth/login that accepts email and password, verifies credentials, and returns JWT.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-user-auth-login`

**Touches**:
- API: POST /api/v1/auth/login
- DB: users table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-auth`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-auth-service`
- `cpt-ai-chat-via-cyber-pilot-seq-auth-login`

### OAuth Google Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-user-auth-oauth-endpoint`

The system **MUST** expose POST /api/v1/auth/oauth/google that accepts Google OAuth token, verifies with Google, creates/links user, and returns JWT.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google`

**Touches**:
- API: POST /api/v1/auth/oauth/google
- DB: users table
- External: Google OAuth API

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-auth`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-auth-service`

### Logout Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-user-auth-logout-endpoint`

The system **MUST** expose POST /api/v1/auth/logout that invalidates the session in Redis.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout`

**Touches**:
- API: POST /api/v1/auth/logout
- Redis: session keys

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-auth`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-auth-service`

### JWT Middleware

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-user-auth-jwt-middleware`

The system **MUST** have middleware that validates JWT on protected routes, extracts user context, and rejects invalid/expired tokens with 401.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt`

**Touches**:
- API: All protected routes
- Redis: session verification

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-api-gateway`
- `cpt-ai-chat-via-cyber-pilot-principle-stateless-api`

### Session Management

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-user-auth-session-mgmt`

The system **MUST** store sessions in Redis with 24h TTL, allowing session invalidation on logout and session verification on each request.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session`

**Touches**:
- Redis: session:{session_id} keys

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-auth-service`
- `cpt-ai-chat-via-cyber-pilot-principle-stateless-api`

### Password Security

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-user-auth-password-security`

The system **MUST** hash passwords using bcrypt with cost factor 12. Plain text passwords must never be stored or logged.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password`
- `cpt-ai-chat-via-cyber-pilot-algo-user-auth-verify-password`

**Touches**:
- DB: users.password_hash column

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-auth-service`

## 6. Acceptance Criteria

- [ ] Registration with valid email/password creates user and returns JWT
- [ ] Registration with existing email returns 409 Conflict
- [ ] Login with valid credentials returns JWT
- [ ] Login with invalid credentials returns 401 Unauthorized
- [ ] Login with suspended account returns 403 Forbidden
- [ ] OAuth login with valid Google token creates/links user and returns JWT
- [ ] JWT validates successfully on protected routes
- [ ] Invalid/expired JWT returns 401 on protected routes
- [ ] Logout invalidates session in Redis
- [ ] GET /api/v1/auth/me returns current user info
- [ ] Passwords are hashed with bcrypt (not stored in plain text)
- [ ] Sessions expire after 24 hours

## 7. Additional Context

### API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /api/v1/auth/register | Create new user | No |
| POST | /api/v1/auth/login | Login with email/password | No |
| POST | /api/v1/auth/oauth/google | Login with Google OAuth | No |
| POST | /api/v1/auth/logout | Invalidate session | Yes |
| GET | /api/v1/auth/me | Get current user | Yes |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| JWT_SECRET | Secret key for signing JWTs | `your-256-bit-secret` |
| JWT_EXPIRES_IN | Token expiration time | `24h` |
| GOOGLE_CLIENT_ID | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | `xxx` |

### Security Considerations

- **Password Requirements**: Minimum 8 characters, at least one uppercase, one lowercase, one number
- **Rate Limiting**: Auth endpoints should be rate limited (e.g., 5 attempts per minute per IP)
- **Timing Attacks**: Use constant-time comparison for password verification
- **Token Storage**: Client should store JWT in httpOnly cookie or secure storage
