import { PrismaClient } from '@prisma/client';

// Exporter une instance unique du client Prisma
let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

// Réexporter les types de Prisma
export * from '@prisma/client';
