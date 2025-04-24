/**
 * Interface représentant un email
 */
export interface Email {
  _id?: string;
  message_id?: string;
  in_reply_to?: string;
  from_name?: string;
  from_email?: string;
  to?: {
    name?: string;
    email?: string;
  }[];
  subject?: string;
  sent_at?: Date;
  raw_text_body?: string;
  raw_html_body?: string;
  md_text_body?: string;
  attachments?: {
    name?: string;
    content_type?: string;
    content_length?: number;
    content_id?: string;
    token?: string;
    url?: string;
  }[];
  raw?: any;
  status?: "PENDING" | "PROCESSED" | "FAILED" | "DUPLICATE";
  report_url?: string | null;
  file_object_name?: string | null;
  date_from?: Date | null;
  date_to?: Date | null;
  created_count?: number | null;
  failed?: any | null;
  deleted_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}
