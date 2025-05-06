import { syncContact } from "./contact";

const handler = async () => {
  const start = new Date();
  console.log(`[Brevo] Starting at ${start.toISOString()}`);

  await syncContact();

  console.log(
    `[Brevo] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`
  );
};

export default { handler };
