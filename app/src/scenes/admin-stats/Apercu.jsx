import { Helmet } from "react-helmet-async";

const Apercu = () => {
  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Aperçu - Statistiques - Administration - API Engagement</title>
      </Helmet>

      <iframe
        src="http://reserve-civique-metabase.osc-secnum-fr1.scalingo.io/public/dashboard/13f286f4-9a58-4247-bb5c-e922a80ab2a1"
        frameborder="0"
        width="100%"
        height="1600"
        allowtransparency
      ></iframe>
    </div>
  );
};

export default Apercu;
