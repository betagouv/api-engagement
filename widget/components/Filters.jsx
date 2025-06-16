import FiltersBenevolat from "./FiltersBenevolat";
import FiltersVolontariat from "./FiltersVolontariat";

const Filters = (props) => {
  const { widget, ...rest } = props;

  if (widget.type === "volontariat") {
    return <FiltersVolontariat widget={widget} {...rest} />;
  } else if (widget.type === "benevolat") {
    return <FiltersBenevolat widget={widget} {...rest} />;
  } else {
    console.warn("Unknown widgetType for Filters:", widget.type);
    return <FiltersVolontariat widget={widget} {...rest} />;
  }
};

export default Filters;
