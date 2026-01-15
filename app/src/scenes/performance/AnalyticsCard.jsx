import AnalyticsViz from "../../components/AnalyticsViz";

const AnalyticsCard = ({
  cardId,
  filters,
  type = "bar",
  showLegend = false,
  variables: extraVariables,
  adapterOptions,
  kpiLabel,
  kpiUnit,
  kpiIcon,
  chartProps,
  loaderHeight,
}) => {
  if (!cardId) return null;

  const variables = { ...(extraVariables || {}) };
  if (filters?.from && variables.from === undefined) {
    variables.from = filters.from.toISOString();
  }
  if (filters?.to && variables.to === undefined) {
    variables.to = filters.to.toISOString();
  }

  const resolvedLoaderHeight = loaderHeight || (type === "kpi" ? "7rem" : "16rem");
  const resolvedChartProps = chartProps || { dataKey: "value", color: "#6A6AF4" };

  const content = (
    <AnalyticsViz
      cardId={cardId}
      type={type}
      variables={variables}
      adapterOptions={adapterOptions}
      chartProps={resolvedChartProps}
      showLegend={showLegend}
      loaderHeight={resolvedLoaderHeight}
      kpiLabel={kpiLabel}
      kpiUnit={kpiUnit}
      kpiIcon={kpiIcon}
    />
  );

  if (type === "kpi") return content;

  return <div className="space-y-4 border border-gray-900 p-6">{content}</div>;
};

export default AnalyticsCard;
