/**
 * SETUP GLOBAL PARA TODAS LAS PRUEBAS
 * 
 * Este archivo se ejecuta UNA VEZ antes de todas las pruebas
 * Configura el entorno de testing
 */

// Configurar timeout global para pruebas lentas
jest.setTimeout(30000);

// Mock de console para evitar ruido en tests
global.console = {
  ...console,
  // Silenciar logs en tests (opcional)
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};

// Configuración global de variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
