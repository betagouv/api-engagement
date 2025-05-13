import { User as PgUser } from "@prisma/client";
import prisma from "../../db/postgres";
import { captureException } from "../../error";
import UserModel from "../../models/user";
import { User } from "../../types";

interface UserUpdate extends PgUser {
  partners: { create: { partner_id: string }[] };
}

const buildData = (doc: User, partners: { [key: string]: string }) => {
  const connections = doc.publishers
    .map((p) => {
      const partnerId = partners[p.toString()];
      if (!partnerId) {
        return null;
      }
      return { partner_id: partnerId };
    })
    .filter((p) => p);

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

    partners: {
      create: connections,
    },
  } as UserUpdate;

  return obj;
};

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[Users] Starting at ${start.toISOString()}`);

    const data = await UserModel.find().lean();
    console.log(`[Users] Found ${data.length} doc to sync.`);

    const stored = {} as { [key: string]: { old_id: string; updated_at: Date } };
    await prisma.user.findMany({ select: { old_id: true, updated_at: true } }).then((data) => data.forEach((d) => (stored[d.old_id] = d)));
    console.log(`[Users] Found ${Object.keys(stored).length} docs in database.`);

    const partners = {} as { [key: string]: string };
    await prisma.partner.findMany({ select: { id: true, old_id: true } }).then((data) => data.forEach((d) => (partners[d.old_id] = d.id)));

    const dataToCreate = [];
    const dataToUpdate = [];
    for (const doc of data) {
      const exists = stored[doc._id.toString()];
      const obj = buildData(doc as User, partners);
      if (exists && new Date(exists.updated_at).getTime() !== obj.updated_at.getTime()) {
        dataToUpdate.push(obj);
      } else if (!exists) {
        dataToCreate.push(obj);
      }
    }

    // Create data
    if (dataToCreate.length) {
      console.log(`[Users] Creating ${dataToCreate.length} docs...`);
      const transactions = [];
      for (const obj of dataToCreate) {
        const { partners, ...userData } = obj;
        transactions.push(
          prisma.user.create({
            data: {
              ...userData,
              partners: partners,
            },
          })
        );
      }
      const res = await prisma.$transaction(transactions);
      console.log(`[Users] Created ${res.length} docs.`);
    }

    // Update data
    if (dataToUpdate.length) {
      console.log(`[Users] Updating ${dataToUpdate.length} docs...`);
      const transactions = [];
      for (const obj of dataToUpdate) {
        const { partners, ...userData } = obj;

        const user = await prisma.user.findUnique({
          where: { old_id: obj.old_id },
          select: { id: true },
        });

        if (!user) {
          console.log(`[Users] User ${obj.old_id} not found in database.`);
          continue;
        }

        const existsPartnerToUser = await prisma.partnerToUser.findMany({
          where: { user_id: user.id },
          select: { partner_id: true },
        });

        const existsPartnerIds = existsPartnerToUser.map((p) => p.partner_id);

        transactions.push(
          prisma.user.update({
            where: { old_id: obj.old_id },
            data: {
              ...userData,
              partners: {
                deleteMany: {
                  user_id: user.id,
                  partner_id: {
                    in: existsPartnerIds.filter((id) => !partners.create.map((p) => p.partner_id).includes(id)),
                  },
                },
                create: partners.create.filter((p) => !existsPartnerIds.includes(p.partner_id)),
              },
            },
          })
        );
      }
      const res = await prisma.$transaction(transactions);
      console.log(`[Users] Updated ${res.length} docs.`);
    }

    console.log(`[Users] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s.`);
    return { created: dataToCreate.length, updated: dataToUpdate.length };
  } catch (error) {
    captureException(error, "[Users] Error while syncing docs.");
  }
};

export default handler;
