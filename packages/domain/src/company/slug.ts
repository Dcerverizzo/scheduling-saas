export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const RESERVED_SLUGS = new Set([
  "app",
  "signup",
  "change-password",
  "login",
  "account",
  "api",
  "admin",
  "assets",
  "public",
  "www",
  "_next",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
