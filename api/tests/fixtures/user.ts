import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { SECRET } from "../../src/config";
import { userService } from "../../src/services/user";
import type { UserCreateInput, UserRecord } from "../../src/types/user";

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
