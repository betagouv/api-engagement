import { vi } from "vitest";

export type PrismaCrudMock = ReturnType<typeof createPrismaCrudMock>;
export type PrismaClientMock = ReturnType<typeof createPrismaClientMock>;

const DEFAULT_MODELS = ["statEvent", "publisher", "publisherDiffusion", "email"] as const;

export const createPrismaCrudMock = (): Record<string | symbol, ReturnType<typeof vi.fn>> =>
  new Proxy(
    {},
    {
      get(target, property: string | symbol) {
        if (!Reflect.has(target, property)) {
          Reflect.set(target, property, vi.fn());
        }
        return Reflect.get(target, property);
      },
    }
  );

export const createPrismaClientMock = (models: readonly string[] = DEFAULT_MODELS) => {
  const client: Record<string, unknown> = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  };

  models.forEach((model) => {
    client[model] = createPrismaCrudMock();
  });

  return new Proxy(client, {
    get(target, property: string | symbol, receiver) {
      if (!Reflect.has(target, property) && typeof property === "string") {
        Reflect.set(target, property, createPrismaCrudMock());
      }
      return Reflect.get(target, property, receiver);
    },
  });
};

const pgMock = createPrismaClientMock();

export default pgMock;
