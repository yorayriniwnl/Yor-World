/**
 * YOR WORLD Milestone A3: Server-side Authentication & Authorization Contracts
 *
 * Implements strict type contracts for owner administration, multi-factor assurance (AAL2),
 * and least-privilege identity verification.
 */

export type OwnerAssurance = "aal1" | "aal2";

export interface OwnerContext {
  userId: string;
  email: string;
  assurance: "aal2";
  role: "owner";
  active: true;
  sessionId?: string;
}

export type AuthFailureCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN_ORIGIN"
  | "FORBIDDEN_NOT_OWNER"
  | "FORBIDDEN_MFA_REQUIRED"
  | "FORBIDDEN_REVOKED";

export interface AuthFailure {
  ok: false;
  status: 401 | 403;
  code: AuthFailureCode;
  message: string;
}

export interface AuthSuccess {
  ok: true;
  context: OwnerContext;
}

export type AuthResult = AuthSuccess | AuthFailure;

export class OwnerAuthError extends Error {
  readonly status: 401 | 403;
  readonly code: AuthFailureCode;

  constructor(status: 401 | 403, code: AuthFailureCode, message: string) {
    super(message);
    this.name = "OwnerAuthError";
    this.status = status;
    this.code = code;
  }
}
