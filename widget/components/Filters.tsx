import { Filters as FilterTypes, Widget } from "@/types";
import FiltersBenevolat from "./FiltersBenevolat";
import FiltersVolontariat from "./FiltersVolontariat";

interface FiltersProps {
  widget: Widget;
  apiUrl: string;
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
