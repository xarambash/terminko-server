import { prisma } from '../db.js';

export type CreateTenantInput = {
  name: string;
  slug: string;
  type: string;
  timezone: string;
  currency: string;
  defaultLanguage: string;
  supportedLanguages?: string[] | undefined;
};

export async function createTenant(data: CreateTenantInput) {
  const languages = data.supportedLanguages?.length
    ? [...new Set([data.defaultLanguage, ...data.supportedLanguages])]
    : [data.defaultLanguage];

  return prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      type: data.type,
      timezone: data.timezone,
      currency: data.currency,
      defaultLanguage: data.defaultLanguage,
      supportedLanguages: {
        create: languages.map((languageCode) => ({ languageCode })),
      },
    },
    include: {
      supportedLanguages: true,
    },
  });
}

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      supportedLanguages: true,
    },
  });
}
