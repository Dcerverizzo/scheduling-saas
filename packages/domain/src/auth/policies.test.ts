import { describe, expect, it } from "vitest";
import {
  canManageCompany,
  canManageServices,
  canManageStaff,
  canViewCompanyBookings,
  isCompanyMember,
  isCompanyOwner,
  type Actor,
} from "./policies";

const companyA = "company-a";
const companyB = "company-b";

function actorWith(memberships: Actor["memberships"]): Actor {
  return { userId: "user-1", memberships };
}

describe("company authorization policies", () => {
  it("owner can manage their own company", () => {
    const owner = actorWith([{ companyId: companyA, role: "OWNER" }]);
    expect(canManageCompany(owner, companyA)).toBe(true);
    expect(canManageStaff(owner, companyA)).toBe(true);
    expect(canManageServices(owner, companyA)).toBe(true);
  });

  it("owner cannot manage a company they do not belong to", () => {
    const owner = actorWith([{ companyId: companyA, role: "OWNER" }]);
    expect(canManageCompany(owner, companyB)).toBe(false);
    expect(canManageStaff(owner, companyB)).toBe(false);
    expect(isCompanyMember(owner, companyB)).toBe(false);
  });

  it("staff cannot manage the company, but can view its bookings", () => {
    const staff = actorWith([{ companyId: companyA, role: "STAFF" }]);
    expect(canManageCompany(staff, companyA)).toBe(false);
    expect(canManageStaff(staff, companyA)).toBe(false);
    expect(canManageServices(staff, companyA)).toBe(false);
    expect(canViewCompanyBookings(staff, companyA)).toBe(true);
  });

  it("a user with no membership cannot do anything on the company", () => {
    const outsider = actorWith([]);
    expect(isCompanyOwner(outsider, companyA)).toBe(false);
    expect(isCompanyMember(outsider, companyA)).toBe(false);
    expect(canViewCompanyBookings(outsider, companyA)).toBe(false);
  });

  it("a user with multiple memberships is scoped per company (no cross-tenant leakage)", () => {
    const multi = actorWith([
      { companyId: companyA, role: "OWNER" },
      { companyId: companyB, role: "STAFF" },
    ]);
    expect(canManageCompany(multi, companyA)).toBe(true);
    expect(canManageCompany(multi, companyB)).toBe(false);
    expect(canManageStaff(multi, companyB)).toBe(false);
    expect(canViewCompanyBookings(multi, companyB)).toBe(true);
  });
});
