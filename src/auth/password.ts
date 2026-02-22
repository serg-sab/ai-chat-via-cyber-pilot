// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password:p1
// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-user-auth-verify-password:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-password-security:p1

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password:p1:inst-generate-salt
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password:p1:inst-bcrypt-hash
export async function hashPassword(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return hash;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password:p1:inst-bcrypt-hash
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password:p1:inst-generate-salt

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password:p1:inst-return-hash
export { hashPassword as hash };
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-hash-password:p1:inst-return-hash

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-verify-password:p1:inst-bcrypt-compare
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-verify-password:p1:inst-bcrypt-compare

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-verify-password:p1:inst-return-compare-result
export { verifyPassword as verify };
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-verify-password:p1:inst-return-compare-result

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}
