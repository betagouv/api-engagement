import React from "react";
import { StatsReport } from "../../../../types";

const compare = (a: number, b: number) => (a - b) / (a || 1);

const BroadcastOverview = ({ data, colSpan }: { data: StatsReport; colSpan: number }) => {
  return (
    <div className="p-8 space-y-4 bg-white">
      <div className="space-y-2">
        <h3 className="text-xl font-bold">En tant que diffuseur, vous avez généré</h3>
        <p className="text-sm text-[#666666]">
          L’API Engagement vous met en relation avec des plateformes de bénévolat ou de volontariat qui annoncent des missions que vous diffusez. Ces statistiques résument
          l’engagement que vous avez généré pour vos partenaires annonceurs.
        </p>
      </div>
      {colSpan === 1 ? (
        <div className="grid gap-4 grid-cols-1">
          <Prints data={data} />
          <Clicks data={data} />
          <Accounts data={data} />
          <Applies data={data} />
          <Rate data={data} />
          <Top data={data} />
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            <Prints data={data} />
            <Clicks data={data} />
            <Accounts data={data} />
          </div>
          <div className="flex-1 space-y-4">
            <Applies data={data} />
            <Rate data={data} />
            <Top data={data} />
          </div>
        </div>
      )}
    </div>
  );
};

const Prints = ({ data }: { data: StatsReport }) => {
  const printRaise = compare(data.send.print, data.send.printLastMonth);

  return (
    <div className="border border-[#dddddd] flex items-center h-[82px]">
      <div className="border-r border-[#dddddd] flex items-center justify-center h-full w-[82px]">
        <img src="/svg/print.svg" className="text-[#000091] text-3xl" />
      </div>
      <div className="flex-1 px-6">
        <h4 className="text-base font-bold">{data.send.print.toLocaleString("fr")} impressions</h4>
        <div className="flex item-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-sm ${printRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
            {printRaise < 0 ? "-" : "+"} {Math.abs(printRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
          </span>
          <p className="text-sm">par rapport au mois dernier</p>
        </div>
      </div>
    </div>
  );
};

const Clicks = ({ data }: { data: StatsReport }) => {
  const clickRaise = compare(data.send.click, data.send.clickLastMonth);

  return (
    <div className="border border-[#dddddd] flex items-center h-[82px]">
      <div className="border-r border-[#dddddd] flex items-center justify-center h-full w-[82px]">
        <img src="/svg/click.svg" className="text-[#000091] text-3xl" />
      </div>
      <div className="flex-1 px-6">
        <h4 className="text-base font-bold">{data.send.click.toLocaleString("fr")} redirections</h4>
        <div className="flex item-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-sm ${clickRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
            {clickRaise < 0 ? "-" : "+"} {Math.abs(clickRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
          </span>
          <p className="text-sm">par rapport au mois dernier</p>
        </div>
      </div>
    </div>
  );
};

const Accounts = ({ data }: { data: StatsReport }) => {
  const accountRaise = compare(data.send.account, data.send.accountLastMonth);

  return (
    <div className="border border-[#dddddd] flex items-center h-[82px]">
      <div className="border-r border-[#dddddd] flex items-center justify-center h-full w-[82px]">
        <img src="/svg/account.svg" className="text-[#000091] text-3xl" />
      </div>
      <div className="flex-1 px-6">
        <h4 className="text-base font-bold">{data.send.account.toLocaleString("fr")} créations de compte</h4>
        <div className="flex item-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-sm ${accountRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
            {accountRaise < 0 ? "-" : "+"} {Math.abs(accountRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
          </span>
          <p className="text-sm">par rapport au mois dernier</p>
        </div>
      </div>
    </div>
  );
};

const Applies = ({ data }: { data: StatsReport }) => {
  const applyRaise = compare(data.send.apply, data.send.applyLastMonth);

  return (
    <div className="border border-[#dddddd] flex items-center h-[82px]">
      <div className="border-r border-[#dddddd] flex items-center justify-center h-full w-[82px]">
        <img src="/svg/apply.svg" className="text-[#000091] text-3xl" />
      </div>
      <div className="flex-1 px-6">
        <h4 className="text-base font-bold">{data.send.apply.toLocaleString("fr")} candidatures</h4>
        <div className="flex item-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-sm ${applyRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
            {applyRaise < 0 ? "-" : "+"} {Math.abs(applyRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
          </span>
          <p className="text-sm">par rapport au mois dernier</p>
        </div>
      </div>
    </div>
  );
};

const Rate = ({ data }: { data: StatsReport }) => {
  const rate = data.send.apply / (data.send.click || 1);
  const lastMonthRate = data.send.applyLastMonth / (data.send.clickLastMonth || 1);
  const rateRaise = compare(rate, lastMonthRate);

  return (
    <div className="border border-[#dddddd] flex items-center">
      <div className="border-r border-[#dddddd] flex items-center justify-center h-full w-[82px] py-6">
        <img src="/svg/rate.svg" className="text-[#000091] text-3xl" />
      </div>
      <div className="flex-1 p-6">
        <h4 className="text-base font-bold">{rate.toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })} de taux de conversion (redirections/candidatures)</h4>
        <div className="flex item-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-sm ${rateRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
            {rateRaise < 0 ? "-" : "+"} {Math.abs(rateRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
          </span>
          <p className="text-sm">par rapport au mois dernier</p>
        </div>
      </div>
    </div>
  );
};

const Top = ({ data }: { data: StatsReport }) => {
  return (
    <div className="border border-[#dddddd] flex items-center">
      <div className="border-r border-[#dddddd] flex items-center justify-center h-full w-[82px] py-6">
        <img src="/svg/table.svg" className="text-[#000091] text-3xl" />
      </div>
      <div className="flex-1 p-6">
        <h4 className="text-base font-bold">Vos top annonceurs</h4>

        <ol className="list-decimal list-inside text-sm text-[#666666]">
          {data.send.topPublishers.slice(0, 3).map((top: { key: string; doc_count: number }, index: number) => (
            <li key={index}>
              {top.key} - {top.doc_count.toLocaleString("fr")} redirections
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default BroadcastOverview;
