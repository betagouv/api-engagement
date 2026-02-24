import { Mission, Widget } from "@/types";
import Carousel from "./Carousel";
import Grid from "./Grid";

interface MissionContainerProps {
  widget: Widget;
  missions: Mission[];
  total: number;
  request: string | null;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

const getContainerHeight = (widget: Widget): string => {
  const isBenevolat = widget.type === "benevolat";
  const isCarousel = widget.style === "carousel";

  if (isCarousel) {
    if (isBenevolat) {
      return "h-[780px] md:h-[686px]";
    }
    return "h-[670px] md:h-[620px]";
  }

  if (isBenevolat) {
    return "h-[3324px] sm:h-[1812px] lg:h-[1264px]";
  }

  return "h-[2200px] sm:h-[1350px] lg:h-[1050px]";
};

const CardSkeleton = () => (
  <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
    <div className="mb-3 h-4 w-3/4 rounded bg-gray-200" />
    <div className="mb-2 h-3 w-1/2 rounded bg-gray-200" />
    <div className="mb-4 h-3 w-2/3 rounded bg-gray-200" />
    <div className="flex gap-2">
      <div className="h-6 w-16 rounded-full bg-gray-200" />
      <div className="h-6 w-20 rounded-full bg-gray-200" />
    </div>
  </div>
);

const GridSkeleton = () => (
  <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

const CarouselSkeleton = () => (
  <div className="mt-4 flex gap-4 overflow-hidden">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="min-w-0 flex-1">
        <CardSkeleton />
      </div>
    ))}
  </div>
);

const MissionContainer = ({ widget, missions, total, request, isLoading, page, onPageChange }: MissionContainerProps) => {
  const isCarousel = widget.style === "carousel";

  return (
    <div className={getContainerHeight(widget)}>
      {isLoading ? (
        isCarousel ? (
          <CarouselSkeleton />
        ) : (
          <GridSkeleton />
        )
      ) : isCarousel ? (
        <Carousel widget={widget} missions={missions} request={request} />
      ) : (
        <Grid widget={widget} missions={missions} total={total} request={request} page={page} handlePageChange={onPageChange} />
      )}
    </div>
  );
};

export default MissionContainer;
