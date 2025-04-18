import mongoose from 'mongoose';

// Fonction pour se connecter à MongoDB
export async function connectToMongoDB(dbEndpoint: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose; // Déjà connecté
  }

  mongoose.connection.on('open', () => console.log('MongoDB connected'));
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Trying to reconnect...');
    setTimeout(() => {
      try {
        mongoose.connect(dbEndpoint, { maxPoolSize: 5000 });
      } catch (error) {
        console.error('Error reconnecting to MongoDB:', error);
      }
    }, 5000);
  });

  try {
    await mongoose.connect(dbEndpoint, { maxPoolSize: 5000 });
    return mongoose;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Fonction pour fermer la connexion à MongoDB
export async function disconnectFromMongoDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}
