import type { NextApiRequest, NextApiResponse } from "next";

type HealthcheckResponse = {
  ok: true;
  status: "healthy";
  timestamp: string;
};

export default function handler(_req: NextApiRequest, res: NextApiResponse<HealthcheckResponse>) {
  res.status(200).json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
