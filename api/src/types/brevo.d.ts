export interface BrevoInboundEmail {
  Uuid: string[];
  MessageId: string;
  InReplyTo?: string;
  From: Mailbox;
  To: Mailbox[];
  Recipients: Mailbox[];
  Cc: Mailbox[];
  ReplyTo?: Mailbox;
  SentAtDate: string;
  Subject: string;
  RawHtmlBody?: string;
  RawTextBody?: string;
  ExtractedMarkdownMessage: string;
  ExtractedMarkdownSignature?: string;
  Spam: {
    Score: number;
  };
  Attachments: Attachment[];
  Headers: string | string[];
}

export interface Mailbox {
  Name: string;
  Address: string;
}

export interface Attachment {
  Name: string;
  ContentType: string;
  ContentLength: number;
  ContentId: string;
  DownloadToken: string;
}
