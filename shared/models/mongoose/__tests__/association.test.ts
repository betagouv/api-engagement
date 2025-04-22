import { describe, it, expect } from "vitest";
import { AssociationModel } from "../association";
import { setupMongoDBForTesting } from "./helpers/mongodb";

describe("Association Model", () => {

  setupMongoDBForTesting([AssociationModel]);

  it("should create an association successfully", async () => {
    const associationData = {
      id_siren: "123456789",
      id_rna: "W123456789",
      identite_nom: "Association Test",
      identite_active: "active",
      category: "culture",
      tags: ["test", "association"]
    };

    const association = new AssociationModel(associationData);
    await association.save();

    const foundAssociation = await AssociationModel.findOne({ id_siren: "123456789" });
    expect(foundAssociation).toBeDefined();
    expect(foundAssociation?.id_siren).toBe("123456789");
    expect(foundAssociation?.id_rna).toBe("W123456789");
    expect(foundAssociation?.identite_nom).toBe("Association Test");
  });

  it("should find associations by id_siren", async () => {
    // Création d'une autre association
    const associationData = {
      id_siren: "987654321",
      id_rna: "W987654321",
      identite_nom: "Autre Association",
    };

    await new AssociationModel(associationData).save();

    const foundAssociation = await AssociationModel.findOne({ id_siren: "987654321" });
    expect(foundAssociation).toBeDefined();
    expect(foundAssociation?.id_siren).toBe("987654321");
    expect(foundAssociation?.identite_nom).toBe("Autre Association");
  });

});
