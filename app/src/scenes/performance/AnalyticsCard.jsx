import AnalyticsViz from "@/components/AnalyticsViz";

const AnalyticsCard = ({
  cardId,
  filters,
  type = "bar",
  showLegend = false,
  variables: extraVariables,
  adapterOptions,
  tableProps,
  columns,
  formatCell,
  kpiLabel,
  kpiUnit,
  kpiIcon,
  kpiTooltip,
  chartProps,
  loaderHeight,
  caption,
  chartTitle,
  chartDescription,
  chartDescriptionMode,
  chartDescriptionId,
  chartNameLabel,
  chartValueLabel,
}) => {
  if (!cardId) {
    return null;
  }

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
      tableProps={tableProps}
      columns={columns}
      formatCell={formatCell}
      kpiLabel={kpiLabel}
      kpiUnit={kpiUnit}
      kpiIcon={kpiIcon}
      kpiTooltip={kpiTooltip}
      caption={caption}
      chartTitle={chartTitle}
      chartDescription={chartDescription}
      chartDescriptionMode={chartDescriptionMode}
      chartDescriptionId={chartDescriptionId}
      chartNameLabel={chartNameLabel}
      chartValueLabel={chartValueLabel}
    />
  );

  if (type === "kpi") {
    return content;
  }

  if (type === "table") {
    return (
      <div className="relative w-full min-w-0">
        <div className="w-full min-w-0 space-y-4 p-0 sm:p-6">{content}</div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0">
      <div className="w-full min-w-0 space-y-4 p-0 sm:p-6">{content}</div>
    </div>
  );
};

export default AnalyticsCard;
