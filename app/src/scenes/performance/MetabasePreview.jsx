import MetabaseChart from "../../components/MetabaseChart";

const MetabasePreview = ({ cardId, filters, type = "bar", showLegend = false }) => {
  if (!cardId) return null;

  const variables = {};
  if (filters?.from && filters?.to) variables.intervalle_date = [filters.from.toISOString(), filters.to.toISOString()];

  return (
    <div className="space-y-4 border border-gray-900 p-6">
      <MetabaseChart cardId={cardId} type={type} variables={variables} chartProps={{ dataKey: "value", color: "#6A6AF4" }} showLegend={showLegend} loaderHeight="16rem" />
    </div>
  );
};

export default MetabasePreview;
