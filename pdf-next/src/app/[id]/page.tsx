import Announce from "@/components/Announce";
import AnnounceOverview from "@/components/AnnounceOverview";
import Broadcast from "@/components/Broadcast";
import BroadcastOverview from "@/components/BroadcastOverview";
import Header from "@/components/Header";
import api from "@/services/api";
import { Publisher, StatsReport } from "@/types";

const Page = async ({ params, searchParams }: { params: { id: string }; searchParams: { [key: string]: string | string[] | undefined } }) => {
  const id = params.id;
  const year = searchParams?.year ? Number(searchParams?.year) : new Date().getFullYear();
  const month = searchParams?.month ? Number(searchParams?.month) : new Date().getMonth();

  const res = await api.get<{ data: StatsReport; publisher: Publisher }>(`/stats-report?year=${year}&month=${month}&publisherId=${id}`);
  if (!res.data) return null;
  return (
    <>
      <div className="w-full flex flex-col h-[1116px]">
        <Header publisher={res.data.publisher} month={month} year={year} page={1} pages={res.data.data.send?.hasStats && res.data.data.receive?.hasStats ? 3 : 2} />
        <div className="flex-1 flex gap-6 p-6">
          {res.data.data.send?.hasStats && res.data.data.receive?.hasStats ? (
            <>
              <AnnounceOverview data={res.data.data} colSpan={1} />
              <BroadcastOverview data={res.data.data} colSpan={1} />
            </>
          ) : res.data.data.receive?.hasStats ? (
            <AnnounceOverview data={res.data.data} colSpan={2} />
          ) : res.data.data.send?.hasStats ? (
            <BroadcastOverview data={res.data.data} colSpan={2} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-[#666666]">Aucune donnée insuffisante</p>
            </div>
          )}
        </div>
      </div>

      {res.data.data.receive?.hasStats && (
        <div className="w-full flex flex-col h-[1116px]">
          <Header publisher={res.data.publisher} month={month} year={year} page={2} pages={res.data.data.send?.hasStats ? 3 : 2} />
          <Announce data={res.data.data} year={2024} />
        </div>
      )}
      {res.data.data.send?.hasStats && (
        <div className="w-full flex flex-col h-[1116px]">
          <Header publisher={res.data.publisher} month={month} year={year} page={res.data.data.receive?.hasStats ? 3 : 2} pages={res.data.data.receive?.hasStats ? 3 : 2} />
          <Broadcast data={res.data.data} year={2024} />
        </div>
      )}
    </>
  );
};

export default Page;
