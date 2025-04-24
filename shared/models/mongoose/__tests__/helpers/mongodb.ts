import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';

/**
 * Helper pour configurer MongoDB Memory Server pour les tests
 * @param models - Liste des modu00e8les Mongoose à vider avant chaque test
 */
export function setupMongoDBForTesting(models: mongoose.Model<any>[] = []) {
  let mongoServer: MongoMemoryServer;

  // Connexion à la base de données avant les tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Nettoyage apru00e8s les tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Nettoyage apru00e8s chaque test
  beforeEach(async () => {
    // Si des modu00e8les spécifiques sont fournis, vider uniquement ces collections
    if (models.length > 0) {
      await Promise.all(models.map(model => model.deleteMany({})));
    } else {
      // Sinon, vider toutes les collections
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });

  return { mongoose };
}
