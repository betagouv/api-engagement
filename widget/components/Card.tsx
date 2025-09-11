import { Mission, Widget } from "../types";
import CardBenevolat from "./CardBenevolat";
import CardVolontariat from "./CardVolontariat";

interface CardProps {
  widget: Widget;
  mission: Mission;
  request: string | null;
  [key: string]: any;
}

const Card = (props: CardProps) => {
  const { widget, request, ...rest } = props;

  if (widget.type === "volontariat") {
    return <CardVolontariat widget={widget} request={request} {...rest} />;
  } else {
    return <CardBenevolat widget={widget} request={request} {...rest} />;
  }
};

export default Card;
