import { Filters as FilterTypes, MissionBrowseFacets, Widget } from "@/types";
import FiltersBenevolat from "./FiltersBenevolat";
import FiltersVolontariat from "./FiltersVolontariat";

interface FiltersProps {
  widget: Widget;
  facets: MissionBrowseFacets;
  values: FilterTypes;
  total: number;
  onChange: (filters: Partial<FilterTypes>) => void;
  show: boolean;
  onShow: (show: boolean) => void;
}

const Filters = (props: FiltersProps) => {
  const { widget, ...rest } = props;

  if (widget.type === "benevolat") {
    return <FiltersBenevolat widget={widget} {...rest} />;
  } else {
    return <FiltersVolontariat widget={widget} {...rest} />;
  }
};

export default Filters;
