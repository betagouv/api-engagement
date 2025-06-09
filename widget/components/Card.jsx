import CardBenevolat from "./CardBenevolat";
import CardVolontariat from "./CardVolontariat";

const Card = (props) => {
  const { widget, ...rest } = props;

  if (widget.type === "volontariat") {
    return <CardVolontariat widget={widget} {...rest} />;
  } else if (widget.type === "benevolat") {
    return <CardBenevolat widget={widget} {...rest} />;
  } else {
    console.warn("Unknown widgetType for Card:", widget.type);
    return <CardVolontariat widget={widget} {...rest} />;
  }
};

export default Card;
