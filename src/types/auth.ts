export type JwtPayload = {
  userId: string;
  tenantId: string | null;
  resourceId: string | null;
  role: string;
};
