import { buildKpi } from "./kpi";
import { buildKpiBotless } from "./kpi-botless";

const handler = async () => {
  // const today = new Date(2024, 10, 18);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  // build kpi for the last 10 days if not already exists
  for (let i = 0; i < 10; i++) {
    const fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - i);

    await buildKpiBotless(fromDate);
    await buildKpi(fromDate);
  }
};

export default { handler };
