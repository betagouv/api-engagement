export type NewsletterSubscribeRequest = {
  email: string;
  distinctId?: string;
};

export type NewsletterSubscribeResponse = {
  subscribed: boolean;
};
