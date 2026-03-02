import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import { SECRET } from "@/config";
import { userService } from "@/services/user";
import type { UserCreateInput, UserRecord } from "@/types/user";

export const createTestUser = async (data: Partial<UserCreateInput> = {}): Promise<{ user: UserRecord; token: string }> => {
  const uniqueSuffix = randomUUID();

  const user = await userService.createUser({
    firstname: "Test",
    lastname: "User",
    email: `test-user-${uniqueSuffix}@example.com`,
    publishers: [],
    role: "user",
    ...data,
  });

  const token = jwt.sign({ _id: user.id }, SECRET);

  return { user, token };
};
