/** @type {import('jest').Config} */
module.exports = {
  // Usar ts-jest para TypeScript
  preset: 'ts-jest',
  
  // Entorno de ejecución (Node.js)
  testEnvironment: 'node',
  
  // Ubicación de las pruebas
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/tests/**/*.test.ts'
  ],
  
  // Archivos a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // Configuración de cobertura
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Archivo principal no necesita cobertura
    '!src/types/**',
  ],
  
  // Umbral de cobertura mínima
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Limpiar mocks entre tests
  clearMocks: true,
  
  // Configuración de timeouts (útil para DB)
  testTimeout: 30000,
  
  // Configuración de módulos
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Variables de entorno para testing
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
