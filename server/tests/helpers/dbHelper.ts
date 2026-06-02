/**
 * HELPER PARA MANEJAR BASE DE DATOS EN TESTS
 * 
 * Proporciona funciones para conectar/desconectar MongoDB en memoria
 * Esto hace que las pruebas sean rápidas y aisladas
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Conectar a MongoDB en memoria
 * Se ejecuta ANTES de todas las pruebas
 */
export const connectDB = async () => {
  // Crear servidor MongoDB en RAM
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Conectar mongoose
  await mongoose.connect(uri);
};

/**
 * Desconectar y limpiar
 * Se ejecuta DESPUÉS de todas las pruebas
 */
export const disconnectDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

/**
 * Limpiar todas las colecciones
 * Se ejecuta ENTRE pruebas para aislarlas
 */
export const clearDB = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};
