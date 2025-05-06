import { captureException } from "../../error";
import PublisherModel from "../../models/publisher";
import UserModel from "../../models/user";
import Brevo from "../../services/brevo";
import { BrevoContact } from "../../types/brevo";

const BREVO_CONTACTS_LIMIT = 1000;

export const syncContact = async () => {
  try {
    const users = await UserModel.find({});
    const publishers = await PublisherModel.find({});
    console.log(`[Brevo Contacts] Syncing ${users.length} contacts`);

    const res = await Brevo.api(`/contacts?limit=${BREVO_CONTACTS_LIMIT}`, {}, "GET");
    if (!res.ok) {
      throw res;
    }

    const count = res.data.count;
    console.log(`[Brevo Contacts] Brevo has ${count} contacts`);
    const contacts = res.data.contacts as BrevoContact[];

    if (contacts.length < count) {
      for (let i = BREVO_CONTACTS_LIMIT; i < count; i += BREVO_CONTACTS_LIMIT) {
        const res = await Brevo.api(
          `/contacts?limit=${BREVO_CONTACTS_LIMIT}&offset=${i}`,
          {},
          "GET"
        );
        if (!res.ok) {
          throw res;
        }
        contacts.push(...res.data.contacts);
      }
    }

    console.log(`[Brevo Contacts] Fetched ${contacts.length} contacts`);

    const toUpdate = users
      .filter((user) => !user.deleted)
      .filter((user) =>
        contacts.some(
          (contact) => contact.email?.toLowerCase().trim() === user.email.toLowerCase().trim()
        )
      );
    const toCreate = users
      .filter((user) => !user.deleted)
      .filter(
        (user) =>
          !contacts.some(
            (contact) => contact.email?.toLowerCase().trim() === user.email.toLowerCase().trim()
          )
      );

    console.log(`[Brevo Contacts] Updating ${toUpdate.length} contacts`);
    let updated = 0;
    for (const user of toUpdate) {
      const contact = contacts.find(
        (contact) => contact.email?.toLowerCase().trim() === user.email.toLowerCase().trim()
      );
      if (!contact) {
        toCreate.push(user);
        continue;
      }

      const updates = {} as Record<string, any>;
      const attributes = {} as Record<string, any>;

      if (contact.attributes.PRENOM !== user.firstname && user.firstname) {
        attributes.PRENOM = user.firstname;
      }
      if (contact.attributes.NOM !== user.lastname && user.lastname) {
        attributes.NOM = user.lastname;
      }
      if (contact.attributes.EXT_ID !== user._id.toString()) {
        updates.ext_id = user._id.toString();
      }

      if (user.publishers.length > 0) {
        const publisher = publishers.find((publisher) => publisher.id === user.publishers[0]);
        if (publisher) {
          if (!contact.attributes.ENTREPRISE) {
            attributes.ENTREPRISE = publisher.name;
          }
          if (
            publisher?.role_promoteur &&
            (publisher?.role_annonceur_api ||
              publisher?.role_annonceur_campagne ||
              publisher?.role_annonceur_widget)
          ) {
            attributes.ROLE = "Annonceur & Diffuseur";
          } else if (publisher?.role_promoteur) {
            attributes.ROLE = "Annonceur";
          } else if (
            publisher?.role_annonceur_api ||
            publisher?.role_annonceur_campagne ||
            publisher?.role_annonceur_widget
          ) {
            attributes.ROLE = "Diffuseur";
          }
        }
      }

      if (updates.ext_id || Object.keys(attributes).length > 0) {
        if (Object.keys(attributes).length > 0) {
          updates.attributes = attributes;
        }
        console.log(`[Brevo Contacts] Updating ${user.email}`, updates);
        const res = await Brevo.api(`/contacts/${contact.id}`, updates, "PUT");
        if (!res.ok) {
          throw res;
        }
        user.brevoContactId = contact.id;
        await user.save();
        updated++;
      }
    }
    console.log(`[Brevo Contacts] Updated ${updated} contacts`);

    console.log(`[Brevo Contacts] Creating ${toCreate.length} contacts`);
    let created = 0;
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
          if (
            publisher?.role_promoteur &&
            (publisher?.role_annonceur_api ||
              publisher?.role_annonceur_campagne ||
              publisher?.role_annonceur_widget)
          ) {
            body.attributes.ROLE = "Annonceur & Diffuseur";
          } else if (publisher?.role_promoteur) {
            body.attributes.ROLE = "Annonceur";
          } else if (
            publisher?.role_annonceur_api ||
            publisher?.role_annonceur_campagne ||
            publisher?.role_annonceur_widget
          ) {
            body.attributes.ROLE = "Diffuseur";
          }
        }
      }

      const res = await Brevo.api(`/contacts`, body, "POST");
      if (!res.ok) {
        throw res;
      }
      user.brevoContactId = res.data.id;
      await user.save();
      created++;
    }
    console.log(`[Brevo Contacts] Created ${created} contacts`);

    const toDelete = contacts.filter((contact) =>
      users
        .filter((user) => user.deleted)
        .some((user) => user.email.toLowerCase().trim() === contact.email?.toLowerCase().trim())
    );
    console.log(`[Brevo Contacts] Deleting ${toDelete.length} contacts`);
    let deleted = 0;
    for (const contact of toDelete) {
      console.log(`[Brevo Contacts] Deleting ${contact.email} ${contact.id}`);
      const res = await Brevo.api(`/contacts/${contact.id}`, {}, "DELETE");
      if (!res.ok) {
        throw res;
      }
      deleted++;
    }
    console.log(`[Brevo Contacts] Deleted ${deleted} contacts`);
  } catch (error) {
    captureException(error, `[Brevo Contacts] Error syncing contacts`);
  }
};
