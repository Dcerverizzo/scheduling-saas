export type CompanyRole = "OWNER" | "STAFF";

export interface ActorMembership {
  companyId: string;
  role: CompanyRole;
}

export interface Actor {
  userId: string;
  memberships: ActorMembership[];
}

function membershipFor(actor: Actor, companyId: string): ActorMembership | undefined {
  return actor.memberships.find((membership) => membership.companyId === companyId);
}

export function isCompanyOwner(actor: Actor, companyId: string): boolean {
  return membershipFor(actor, companyId)?.role === "OWNER";
}

export function isCompanyMember(actor: Actor, companyId: string): boolean {
  return membershipFor(actor, companyId) !== undefined;
}

export function canManageCompany(actor: Actor, companyId: string): boolean {
  return isCompanyOwner(actor, companyId);
}

export function canManageStaff(actor: Actor, companyId: string): boolean {
  return isCompanyOwner(actor, companyId);
}

export function canManageServices(actor: Actor, companyId: string): boolean {
  return isCompanyOwner(actor, companyId);
}

export function canViewCompanyBookings(actor: Actor, companyId: string): boolean {
  return isCompanyMember(actor, companyId);
}
