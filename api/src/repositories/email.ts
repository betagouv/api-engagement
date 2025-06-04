import EmailModel from "../models/email";
import { Email } from "../types";

/**
 * See if should be directly in the postgres
 */

export class EmailRepository {
  static async create(emailData: Partial<Email>): Promise<Email> {
    return EmailModel.create(emailData);
  }

  static async findById(id: string): Promise<Email | null> {
    return EmailModel.findById(id);
  }

  static async find(filters: Partial<Email> = {}): Promise<Email[]> {
    return EmailModel.find(filters);
  }

  static async update(id: string, updateData: Partial<Email>): Promise<Email | null> {
    return EmailModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  static async delete(id: string): Promise<Email | null> {
    return EmailModel.findByIdAndDelete(id);
  }
}

export default EmailRepository;
