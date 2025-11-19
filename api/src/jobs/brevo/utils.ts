import { captureException } from "../../error";
import Brevo from "../../services/brevo";
import { publisherService } from "../../services/publisher";
import { userService } from "../../services/user";
import { slugify } from "../../utils";
import { BrevoContact } from "./types";

const BREVO_CONTACTS_LIMIT = 1000;

export const syncContact = async () => {
  let updated = 0;
  let deleted = 0;
  let created = 0;
  try {
    const users = await userService.findUsers({ includeDeleted: true });
    const publishers = await publisherService.findPublishers();
    console.log(`[Brevo Contacts] Syncing ${users.length} contacts`);

    const res = await Brevo.api(`/contacts?limit=${BREVO_CONTACTS_LIMIT}`, {}, "GET");
    if (!res.ok) {
      throw new Error(JSON.stringify(res));
    }

    const count = res.data.count;
    console.log(`[Brevo Contacts] Brevo has ${count} contacts`);
    const contacts = res.data.contacts as BrevoContact[];

    if (contacts.length < count) {
      for (let i = BREVO_CONTACTS_LIMIT; i < count; i += BREVO_CONTACTS_LIMIT) {
        const res = await Brevo.api(`/contacts?limit=${BREVO_CONTACTS_LIMIT}&offset=${i}`, {}, "GET");
        if (!res.ok) {
          throw new Error(JSON.stringify(res));
        }
        contacts.push(...res.data.contacts);
      }
    }

    console.log(`[Brevo Contacts] Fetched ${contacts.length} contacts`);

    const toUpdate = users
      .filter((user) => user.deletedAt === null)
      .filter((user) => contacts.some((contact) => contact.email?.toLowerCase().trim() === user.email.toLowerCase().trim()));
    const toCreate = users
      .filter((user) => user.deletedAt === null)
      .filter((user) => !contacts.some((contact) => contact.email?.toLowerCase().trim() === user.email.toLowerCase().trim()));

    console.log(`[Brevo Contacts] Updating ${toUpdate.length} contacts`);

    for (const user of toUpdate) {
      const contact = contacts.find((contact) => contact.email?.toLowerCase().trim() === user.email.toLowerCase().trim());
      if (!contact) {
        toCreate.push(user);
        continue;
      }

      const updates = {
        attributes: {} as Record<string, any>,
        ext_id: undefined as string | undefined,
      };

      if (contact.attributes.PRENOM !== user.firstname && user.firstname) {
        updates.attributes.PRENOM = user.firstname;
      }
      if (contact.attributes.NOM !== user.lastname && user.lastname) {
        updates.attributes.NOM = user.lastname;
      }
      if (contact.attributes.EXT_ID !== user._id.toString()) {
        updates.ext_id = user._id.toString();
      }

      if (user.publishers.length > 0) {
        const publisher = publishers.find((publisher) => publisher.id === user.publishers[0]);
        if (publisher) {
          if (!contact.attributes.ENTREPRISE || slugify(contact.attributes.ENTREPRISE) !== slugify(publisher.name)) {
            updates.attributes.ENTREPRISE = publisher.name;
          }
          let role = "";
          if (publisher.isAnnonceur && (publisher.hasApiRights || publisher.hasCampaignRights || publisher.hasWidgetRights)) {
            role = "Annonceur & Diffuseur";
          } else if (publisher.isAnnonceur) {
            role = "Annonceur";
          } else if (publisher.hasApiRights || publisher.hasCampaignRights || publisher.hasWidgetRights) {
            role = "Diffuseur";
          }
          if (role !== contact.attributes.ROLE) {
            updates.attributes.ROLE = role;
          }
        }
      }

      if (!updates.ext_id && Object.keys(updates.attributes).length === 0) {
        console.log(`[Brevo Contacts] No updates for ${user.email}`);
        continue;
      }

      console.log(`[Brevo Contacts] Updating ${user.email}`, updates);
      const res = await Brevo.api(`/contacts/${contact.id}`, updates, "PUT");
      if (!res.ok) {
        throw new Error(JSON.stringify(res));
      }
      await userService.updateUser(user.id, { brevoContactId: contact.id ?? null });
      updated++;
    }
    console.log(`[Brevo Contacts] Updated ${updated} contacts`);

    console.log(`[Brevo Contacts] Creating ${toCreate.length} contacts`);
    for (const user of toCreate) {
      console.log(`[Brevo Contacts] Creating ${user.email}`);
      const body = {
        email: user.email,
        ext_id: user._id.toString(),
        attributes: { PRENOM: user.firstname, NOM: user.lastname } as Record<string, any>,
      };

      if (user.publishers.length > 0) {
        const publisher = publishers.find((publisher) => publisher.id === user.publishers[0]);
        if (publisher) {
          body.attributes.ENTREPRISE = publisher.name;
          if (publisher.isAnnonceur && (publisher.hasApiRights || publisher.hasCampaignRights || publisher.hasWidgetRights)) {
            body.attributes.ROLE = "Annonceur & Diffuseur";
          } else if (publisher.isAnnonceur) {
            body.attributes.ROLE = "Annonceur";
          } else if (publisher.hasApiRights || publisher.hasCampaignRights || publisher.hasWidgetRights) {
            body.attributes.ROLE = "Diffuseur";
          }
        }
      }

      const res = await Brevo.api(`/contacts`, body, "POST");
      if (!res.ok) {
        throw new Error(JSON.stringify(res));
      }
      await userService.updateUser(user.id, { brevoContactId: res.data.id ?? null });
      created++;
    }
    console.log(`[Brevo Contacts] Created ${created} contacts`);

    const toDelete = contacts.filter((contact) =>
      users.filter((user) => user.deletedAt !== null).some((user) => user.email.toLowerCase().trim() === contact.email?.toLowerCase().trim())
    );
    console.log(`[Brevo Contacts] Deleting ${toDelete.length} contacts`);
    for (const contact of toDelete) {
      console.log(`[Brevo Contacts] Deleting ${contact.email} ${contact.id}`);
      const res = await Brevo.api(`/contacts/${contact.id}`, {}, "DELETE");
      if (!res.ok) {
        throw new Error(JSON.stringify(res));
      }
      deleted++;
    }
    console.log(`[Brevo Contacts] Deleted ${deleted} contacts`);
  } catch (error) {
    captureException(error, `[Brevo Contacts] Error syncing contacts`);
  }
  return {
    deleted,
    created,
    updated,
  };
};
