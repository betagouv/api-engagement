import { User as PgUser } from "@prisma/client";
import prisma from "../../../db/postgres";
import { captureException, captureMessage } from "../../../error";
import UserModel from "../../../models/user";
import { User } from "../../../types";

const buildData = (doc: User, partners: { [key: string]: string }) => {
  const partnerIds = doc.publishers.map((p) => partners[p.toString()]);
  if (partnerIds.some((p) => !p)) {
    const missing = doc.publishers.filter((p) => !partners[p.toString()]);
    captureMessage(`[Users] Partner ${missing.join(", ")} not found for user ${doc._id.toString()}`);
  }

  const obj = {
    old_id: doc._id.toString(),
    brevo_contact_id: doc.brevoContactId,
    first_name: doc.firstname,
    last_name: doc.lastname,
    role: doc.role,
    password: doc.password,
    email: doc.email,

    last_activity_at: doc.lastActivityAt,

    invitation_completed_at: doc.invitationCompletedAt,
    invitation_token: doc.invitationToken,
    invitation_expires_at: doc.invitationExpiresAt,
    forgot_password_token: doc.forgotPasswordToken,
    forgot_password_expires_at: doc.forgotPasswordExpiresAt,

    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
    deleted_at: doc.deletedAt || null,
  } as PgUser;

  return { user: obj, partners: partnerIds };
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Users] Starting at ${start.toISOString()}`);

    const data = await UserModel.find().lean();
    console.log(`[Users] Found ${data.length} doc to sync.`);

    const stored = {} as { [key: string]: { old_id: string; id: string } };
    await prisma.user.findMany({ select: { old_id: true, id: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Users] Found ${Object.keys(stored).length} docs in database.`);

    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    const dataToCreate = [];
    const dataToUpdate = [];
    for (const doc of data) {
      const exists = stored[doc._id.toString()];
      const obj = buildData(doc as User, partners);
      if (!obj) {
        continue;
      }
      if (!exists) {
        dataToCreate.push(obj);
        continue;
      }
      dataToUpdate.push({ ...obj, id: exists.id });
    }

    // Create data
    if (dataToCreate.length) {
      console.log(`[Users] Creating ${dataToCreate.length} docs...`);
      for (const obj of dataToCreate) {
        const { partners, user } = obj;
        try {
          await prisma.user.create({
            data: {
              ...user,
              partners: { create: partners.map((p) => ({ partner_id: p })) },
            },
          });
        } catch (error) {
          captureException(error, { extra: { user, partners } });
        }
      }
      console.log(`[Users] Created ${dataToCreate.length} docs.`);
    }

    // Update data
    if (dataToUpdate.length) {
      console.log(`[Users] Updating ${dataToUpdate.length} docs...`);

      for (const obj of dataToUpdate) {
        const { partners, user, id } = obj;

        try {
          await prisma.user.update({ where: { id }, data: user });
          await prisma.partnerToUser.deleteMany({ where: { user_id: id } });
          await prisma.partnerToUser.createMany({ data: partners.map((p) => ({ partner_id: p, user_id: id })) });
        } catch (error) {
          captureException(error, { extra: { user, partners, id } });
        }
      }

      console.log(`[Users] Updated ${dataToUpdate.length} docs.`);
    }

    console.log(`[Users] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created: dataToCreate.length, updated: dataToUpdate.length };
  } catch (error) {
    captureException(error, "[Users] Error while syncing docs.");
  }
};

export default handler;
