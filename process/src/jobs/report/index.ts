import { SLACK_PRODUCT_CHANNEL_ID } from "../../config";
import { captureException } from "../../error";
import { postMessage } from "../../services/slack";
import { generateReports } from "./generate";
import { sendReports } from "./send";

const handler = async () => {
  const start = new Date();
  console.log(`[Report] Starting at ${start.toISOString()}`);
  try {
    const month = new Date().getMonth() !== 0 ? new Date().getMonth() - 1 : 11;
    const year = month === 11 ? new Date().getFullYear() - 1 : new Date().getFullYear();

    console.log(`[Report] Generating report for ${year}-${month}`);
    const generationRes = await generateReports(year, month);
    console.log(
      `[Report] Generated ${generationRes.count} report with ${generationRes.errors.length} errors`
    );
    if (generationRes.errors.length > 0) {
      console.error(`[Report] Errors`, JSON.stringify(generationRes.errors, null, 2));
      captureException(`Report generation with failure`, `Errors while genrating report`);
    }

    console.log(`[Report] Sending report for ${year}-${month}`);
    const sendingRes = await sendReports(year, month);
    console.log(
      `[Report] Sent ${sendingRes.count} report, ${sendingRes.skipped.length} skipped and ${sendingRes.errors.length} errors`
    );
    if (sendingRes.errors.length > 0) {
      console.error(`[Report] Errors`, JSON.stringify(sendingRes.errors, null, 2));
      captureException(`Report sending with failure`, `Errors while sending report`);
    }
    console.log(`[Report] Sending slack message for ${year}-${month}`);

    await postMessage(
      {
        title: `Rapports d'impact du ${month + 1 < 10 ? `0${month + 1}` : month + 1}/${year} générés et envoyés`,
        text: `Rapport générés: ${generationRes.count}, emails envoyés: ${sendingRes.count}, non envoyés: ${sendingRes.skipped.length}, erreurs: ${generationRes.errors.length + sendingRes.errors.length}\n\nListe des rapports d'impact du mois [ici](https://app.api-engagement.beta.gouv.fr/admin-report?month=${month}&year=${year})`,
      },
      SLACK_PRODUCT_CHANNEL_ID
    );
  } catch (error: any) {
    console.error(error);
    captureException(`Report generation failed`, `${error.message} while generating report`);
  }

  console.log(
    `[Report] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`
  );
};

export default { handler };
