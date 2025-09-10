import { PrismaClient as PrismaClientAnalytics } from "./analytics";
import { PrismaClient as PrismaClientCore } from "./core";

const prismaCore = new PrismaClientCore({
  log: ["error"],
});
const prismaAnalytics = new PrismaClientAnalytics({
  log: ["error"],
});

export const pgConnected = Promise.all(
  [prismaCore, prismaAnalytics].map((prisma) => {
    return new Promise<void>((resolve, reject) => {
      prisma
        .$connect()
        .then(() => {
          console.log(`[PostgreSQL] ${prisma} connected`);
          resolve();
        })
        .catch((error) => {
          console.error(`[PostgreSQL] ${prisma} Connection error:`, error);
          reject(error);
        });
    });
  })
);

export default { prismaCore, prismaAnalytics };
