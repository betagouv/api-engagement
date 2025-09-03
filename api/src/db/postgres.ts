import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
});

export const pgConnected = new Promise<void>((resolve, reject) => {
  prisma
    .$connect()
    .then(() => {
      console.log("[PostgreSQL] Connected");
      resolve();
    })
    .catch((error) => {
      console.error("[PostgreSQL] Connection error:", error);
      reject(error);
    });
});

export default prisma;
