import { LoginHistory } from "../../../db/analytics";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";
import { captureException } from "../../../error";
import UserModel from "../../../models/user";

const buildData = (userId: string, loginTime: Date) => {
  return {
    user_id: userId,
    login_at: loginTime,
  } as LoginHistory;
};

const handler = async () => {
  try {
    const start = new Date();

    const data = await UserModel.find().lean();
    console.log(`[User] Found ${data.length} users to process.`);

    const users = {} as { [key: string]: string };
    await prismaClient.user.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (users[d.old_id] = d.id)));
    console.log(`[User] Mapped ${Object.keys(users).length} users to database IDs.`);

    const logins = {} as { [key: string]: Date | null };
    await prismaClient.loginHistory
      .groupBy({
        by: ["user_id"],
        _max: {
          login_at: true,
        },
      })
      .then((data) => data.forEach((e) => (logins[e.user_id] = e._max.login_at)));
    console.log(`[LoginHistory] Fetched latest login times for ${Object.keys(logins).length} users.`);

    const dataToCreate = [] as LoginHistory[];
    for (const user of data) {
      const userId = users[user._id.toString()];
      const latestLoginAt = logins[userId];

      if (userId && user.loginAt && user.loginAt.length) {
        user.loginAt.forEach((loginTime) => {
          const loginDate = new Date(loginTime);
          if (!latestLoginAt || loginDate > new Date(latestLoginAt)) {
            dataToCreate.push(buildData(userId, loginTime));
          }
        });
      }
    }

    if (dataToCreate.length) {
      console.log(`[LoginHistory] Creating ${dataToCreate.length} login history records...`);
      const transactions = [];
      for (const obj of dataToCreate) {
        transactions.push(prismaClient.loginHistory.create({ data: obj }));
      }
      await prismaClient.$transaction(transactions);
      console.log(`[LoginHistory] Created ${dataToCreate.length} records.`);
    }

    console.log(`[LoginHistory] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created: dataToCreate.length };
  } catch (error) {
    captureException(error, "[LoginHistory] Error while syncing login history.");
  }
};

export default handler;
