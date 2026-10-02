import compression from "compression";

// Les réponses JSON volumineuses (notamment /missions/match) sont compressées lorsque le client
// annonce un encodage compatible. Les petites réponses restent intactes pour éviter un coût CPU inutile.
export default compression({ threshold: 1024 });
