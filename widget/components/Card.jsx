import CardBenevolat from "./CardBenevolat";
import CardVolontariat from "./CardVolontariat";

const Card = (props) => {
  const { widget, ...rest } = props;

  if (widget.type === "volontariat") {
    return <CardVolontariat widget={widget} {...rest} />;
  } else {
    return <CardBenevolat widget={widget} {...rest} />;
  }
};

export default Card;
