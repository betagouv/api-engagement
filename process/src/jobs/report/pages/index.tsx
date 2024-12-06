import React from "react";
import { Publisher } from "../../../types";
import { StatsReport } from "../../../types";
import Header from "./components/Header";
import AnnounceOverview from "./components/AnnounceOverview";
import BroadcastOverview from "./components/BroadcastOverview";
import Announce from "./components/Announce";
import Broadcast from "./components/Broadcast";

const ReactApp = ({ data, publisher, year, month }: { data: StatsReport; publisher: Publisher; year: number; month: number }) => {
  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <title>API Engagement</title>
        <link rel="stylesheet" href="/css/style.css" />
        <script src="/js/chart.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="w-[1360px] bg-[#F6F6F6]">
        <div className="w-full flex flex-col h-[1116px]">
          <Header publisher={publisher} month={month} year={year} page={1} pages={data.send?.hasStats && data.receive?.hasStats ? 3 : 2} />
          <div className="flex-1 flex gap-6 p-6">
            {data.send?.hasStats && data.receive?.hasStats ? (
              <>
                <AnnounceOverview data={data} colSpan={1} />
                <BroadcastOverview data={data} colSpan={1} />
              </>
            ) : data.receive?.hasStats ? (
              <AnnounceOverview data={data} colSpan={2} />
            ) : data.send?.hasStats ? (
              <BroadcastOverview data={data} colSpan={2} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-[#666666]">Aucune donnée insuffisante</p>
              </div>
            )}
          </div>
        </div>

        {data.receive?.hasStats && (
          <div className="w-full flex flex-col h-[1116px]">
            <Header publisher={publisher} month={month} year={year} page={2} pages={data.send?.hasStats ? 3 : 2} />
            <Announce data={data} year={2024} />
          </div>
        )}

        {data.send?.hasStats && (
          <div className="w-full flex flex-col h-[1116px]">
            <Header publisher={publisher} month={month} year={year} page={data.receive?.hasStats ? 3 : 2} pages={data.receive?.hasStats ? 3 : 2} />
            <Broadcast data={data} year={2024} />
          </div>
        )}
      </body>
    </html>
  );
};

export default ReactApp;
