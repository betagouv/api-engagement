"use client";
import { StatsReport } from "@/types";
import { CartesianGrid, Line, LineChart as LineChartRechart, BarChart as BarChartRechart, ResponsiveContainer, XAxis, YAxis, Bar } from "recharts";

const compare = (a: number, b: number) => (a - b) / (a || 1);

const COLORS = ["#000091", "#FB955D", "#F96666", "#54D669", "#FF6FF1"];

const Announce = ({ data, year }: { data: StatsReport; year: number }) => {
  const clickRaise = compare(data.receive.click, data.receive.clickLastMonth);
  const clickYearRaise = compare(data.receive.clickYear, data.receive.clickLastYear);
  const applyRaise = compare(data.receive.apply, data.receive.applyLastMonth);
  const applyYearRaise = compare(data.receive.applyYear, data.receive.applyLastYear);

  return (
    <div className="w-full p-8">
      <h2 className="text-xl font-bold mb-6">Votre rôle d’annonceur</h2>
      <div className="flex items-start gap-8">
        <div className="flex-1 bg-white p-8 h-full space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Redirections et candidatures reçues</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <div className="w-4 h-3 bg-[#000091]" />
                <div className="w-4 h-3 bg-[#FA7A35]" />
                <p className="text-[10px] text-[#666666] ml-2">Aujourd’hui</p>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-3 bg-[#B3B3DE]" />
                <div className="w-4 h-3 bg-[#FDD7C2]" />
                <p className="text-[10px] text-[#666666] ml-2">Il y a un an</p>
              </div>
            </div>
          </div>
          <div className="w-full h-[300px]">
            <LineChart data={data.receive.graphYears} />
          </div>
          <div className="flex items-start gap-6">
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[#000091]">Redirections ce mois-ci</h4>
                <p className="text-base font-bold">{data.receive.click.toLocaleString("fr")}</p>
                <div className="flex item-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded-sm ${clickRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
                    {clickRaise < 0 ? "-" : "+"} {Math.abs(clickRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-sm">par rapport au mois dernier</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[#000091]">Total {year}</h4>
                <p className="text-base font-bold">{data.receive.clickYear.toLocaleString("fr")}</p>
                <div className="flex item-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded-sm ${clickYearRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
                    {clickYearRaise < 0 ? "-" : "+"} {Math.abs(clickYearRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-sm">par rapport à {year - 1}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[#FA7A35]">Candidatures ce mois-ci</h4>
                <p className="text-base font-bold">{data.receive.apply.toLocaleString("fr")}</p>
                <div className="flex item-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded-sm ${applyRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
                    {applyRaise < 0 ? "-" : "+"} {Math.abs(applyRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-sm">par rapport au mois dernier</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[#FA7A35]">Total {year}</h4>
                <p className="text-base font-bold">{data.receive.applyYear.toLocaleString("fr")}</p>
                <div className="flex item-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded-sm ${applyYearRaise < 0 ? "bg-[#FFE9E9] text-[#CE0500]" : "bg-[#B8FEC9] text-[#18753C]"} font-bold`}>
                    {applyYearRaise < 0 ? "-" : "+"} {Math.abs(applyYearRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-sm">par rapport à {year - 1}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6 flex-1">
          <div className="w-full bg-white p-8 h-full space-y-6">
            <h2 className="text-base font-bold">Top des organisations ce mois-ci</h2>
            <table className="table-fixed w-full">
              <tbody className="p-0 m-0 text-xs">
                {data.receive.topOrganizations.length ? (
                  data.receive.topOrganizations.map((item, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="py-2">
                        <div className="flex items-center gap-4">
                          <div className="w-4 font-bold" style={{ color: COLORS[i] }}>
                            {i + 1}.
                          </div>
                          <p>{item.key}</p>
                        </div>
                      </td>
                      <td colSpan={2} className="text-[#666666]">
                        {item.doc_count.toLocaleString("fr")} redirections
                      </td>
                      <td className="text-[#666666]">{(item.doc_count / data.receive.click).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-[#666666] text-center">
                      Aucune donnée disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="w-full bg-white p-8 h-full space-y-6">
            <h2 className="text-base font-bold">Répartition des top organisations</h2>
            <div className="w-full h-[300px]">
              {data.receive.organizationHistogram.length > 0 ? (
                <BarChart data={data.receive.organizationHistogram} />
              ) : (
                <div className="w-full h-full flex justify-center items-center">
                  <p className="text-[#666666]">Aucune donnée disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MONTHS = ["janv.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const LineChart = ({ data }: { data: { month: Date; click: number; clickLastYear: number; apply: number; applyLastYear: number }[] }) => {
  data.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChartRechart
        width={500}
        height={300}
        data={data.map((d) => ({ ...d, name: MONTHS[new Date(d.month).getMonth()] }))}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Line type="monotone" dataKey="click" stroke="#000091" activeDot={{ r: 8 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="clickLastYear" stroke="#B3B3DE" activeDot={{ r: 8 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="apply" stroke="#FA7A35" isAnimationActive={false} />
        <Line type="monotone" dataKey="applyLastYear" stroke="#FDD7C2" isAnimationActive={false} />
      </LineChartRechart>
    </ResponsiveContainer>
  );
};

const BarChart = ({ data }: { data: { [key: string]: number | Date }[] }) => {
  data.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChartRechart
        width={500}
        height={300}
        data={data.map((d) => ({ ...d, name: MONTHS[new Date(d.month).getMonth()] }))}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        {Object.keys(data[0])
          .filter((key) => key !== "month")
          .map((key, i) => (
            <Bar key={i} stackId="a" dataKey={key} fill={COLORS[i]} isAnimationActive={false} />
          ))}
      </BarChartRechart>
    </ResponsiveContainer>
  );
};

export default Announce;
