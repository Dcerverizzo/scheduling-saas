import type { DefaultSession } from "next-auth";
import type { CompanyRole } from "@scheduling-saas/domain";

type Membership = { companyId: string; role: CompanyRole };

declare module "next-auth" {
  interface User {
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      mustChangePassword: boolean;
      memberships: Membership[];
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    mustChangePassword: boolean;
    memberships: Membership[];
  }
}
