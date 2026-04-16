export type Answer = {
  id: string;
  label: string;
};

export type Question = {
  slug: string;
  label: string;
  type: "single" | "multi";
  answers: Answer[];
};

export type Mission = {
  _id: string;
  title: string;
  description: string;
  city?: string;
  department?: string;
  organizationName: string;
  applicationUrl: string;
  domaine?: string;
};
