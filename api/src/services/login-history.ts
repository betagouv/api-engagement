import { loginHistoryRepository } from "@/repositories/login-history";

export interface LoginHistoryEntry {
  userId: string;
  loginAt: Date;
}

export const loginHistoryService = {
  async recordLogin(userId: string, loginAt: Date = new Date()): Promise<void> {
    await loginHistoryRepository.create({
      data: {
        user: { connect: { id: userId } },
        loginAt,
      },
    });
  },
};
