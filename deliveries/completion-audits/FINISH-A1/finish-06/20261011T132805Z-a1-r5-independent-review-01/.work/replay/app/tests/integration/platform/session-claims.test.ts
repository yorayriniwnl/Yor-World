import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { verifyOwner,setTestAuthRegistry } from "@/server/auth/require-owner";

const session=vi.hoisted(() => ({ aal: "aal1",active: true,claimError: false }));
vi.mock("@/server/auth/clients",() => ({
  createPublicServerClient: () => ({ auth: {
    getUser: async () => ({ data: { user: { id: "11111111-1111-1111-1111-111111111111",email: "owner@fixture.test",app_metadata: { aal: "aal2",amr: [{ method: "totp" }] } } },error: null }),
    getClaims: async () => ({ data: { claims: { sub: "11111111-1111-1111-1111-111111111111",aal: session.aal } },error: session.claimError ? new Error("Synthetic claims verification failure") : null }),
  } }),
  createAdminServiceRoleClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: "11111111-1111-1111-1111-111111111111",role: "owner",active: session.active },error: null }) }) }) }) }),
}));

describe("Server authorization uses verified session claims and current owner record",() => {
  beforeEach(() => { setTestAuthRegistry(null); session.aal="aal1"; session.active=true; session.claimError=false; });
  afterEach(() => setTestAuthRegistry(null));
  const request=() => new Request("http://localhost/api/admin/verify",{ headers: { Authorization: "Bearer synthetic-session-token" } });
  it("metadata claiming MFA cannot elevate an AAL1 session",async () => {
    const result=await verifyOwner(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN_MFA_REQUIRED");
  });
  it("cryptographic claims verification failure denies identity",async () => {
    session.aal="aal2"; session.claimError=true;
    const result=await verifyOwner(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });
  it("verified AAL2 and active owner succeed",async () => {
    session.aal="aal2";
    const result=await verifyOwner(request());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.assurance).toBe("aal2");
  });
  it("owner revoked after issuance is denied with still-valid AAL2 claims",async () => {
    session.aal="aal2"; session.active=false;
    const result=await verifyOwner(request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN_REVOKED");
  });
});
