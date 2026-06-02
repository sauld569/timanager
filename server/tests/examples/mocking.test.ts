/**
 * ═══════════════════════════════════════════════════════════════════
 * EJEMPLO 4: MOCKING AVANZADO - SERVICIOS EXTERNOS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * ¿QUÉ ES MOCKING?
 * - Simular dependencias externas (APIs, DBs, servicios)
 * - Aislar la unidad de código que queremos probar
 * - Controlar completamente el comportamiento en el test
 * 
 * ¿CUÁNDO USAR MOCKS?
 * - Servicios de pago (Stripe, PayPal)
 * - APIs externas (Google Maps, OpenAI, etc.)
 * - Envío de emails
 * - Servicios de notificaciones
 * - Cualquier cosa costosa/lenta/impredecible
 * 
 * ¿POR QUÉ?
 * - Tests rápidos (no esperas respuesta real)
 * - No gastas dinero en APIs de pago
 * - No envías emails reales
 * - Resultados predecibles
 * - Puedes simular errores sin romper nada
 */

import { Request, Response } from 'express';

/**
 * ════════════════════════════════════════════════════════════════════
 * EJEMPLO: Controller que usa servicio de email
 * ════════════════════════════════════════════════════════════════════
 */

// Supongamos que tienes este servicio de email (no lo vamos a probar)
class EmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // En producción, esto enviaría un email real
    console.log(`Enviando email a ${to}...`);
    return true;
  }
}

// Controller que queremos probar
export class NotificacionController {
  constructor(private emailService: EmailService) {}

  async enviarNotificacion(req: Request, res: Response) {
    try {
      const { email, mensaje } = req.body;

      if (!email || !mensaje) {
        return res.status(400).json({ error: 'Email y mensaje requeridos' });
      }

      // Enviar email (esto lo vamos a mockear)
      const enviado = await this.emailService.sendEmail(
        email,
        'Notificación',
        mensaje  
      );

      if (enviado) {
        return res.json({ message: 'Notificación enviada' });
      } else {
        return res.status(500).json({ error: 'Error al enviar notificación' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error interno' });
    }
  }
}

/**
 * ════════════════════════════════════════════════════════════════════
 * PRUEBAS CON MOCKS
 * ════════════════════════════════════════════════════════════════════
 */

describe('NotificacionController - Mocking EmailService', () => {
  let emailService: EmailService;
  let controller: NotificacionController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    // CREAR MOCK del EmailService
    emailService = new EmailService();
    
    // MOCKEAR el método sendEmail
    // jest.spyOn() intercepta las llamadas al método
    jest.spyOn(emailService, 'sendEmail').mockResolvedValue(true);

    // Crear controller con el servicio mockeado
    controller = new NotificacionController(emailService);

    // Mock de Request y Response
    req = {
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  afterEach(() => {
    // Limpiar todos los mocks después de cada test
    jest.clearAllMocks();
  });

  test('Debe enviar notificación exitosamente', async () => {
    // ARRANGE
    req.body = {
      email: 'usuario@example.com',
      mensaje: 'Tu pedido ha sido procesado'
    };

    // ACT
    await controller.enviarNotificacion(req as Request, res as Response);

    // ASSERT
    // 1. Verificar que se llamó al servicio de email
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'usuario@example.com',
      'Notificación',
      'Tu pedido ha sido procesado'
    );

    // 2. Verificar la respuesta
    expect(res.json).toHaveBeenCalledWith({ message: 'Notificación enviada' });
  });

  test('Debe rechazar request sin email', async () => {
    // ARRANGE
    req.body = {
      mensaje: 'Solo mensaje, sin email'
    };

    // ACT
    await controller.enviarNotificacion(req as Request, res as Response);

    // ASSERT
    // No debe llamar al servicio de email
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    
    // Debe retornar error 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email y mensaje requeridos' });
  });

  test('Debe manejar error cuando el servicio de email falla', async () => {
    // ARRANGE
    req.body = {
      email: 'usuario@example.com',
      mensaje: 'Test mensaje'
    };

    // MOCKEAR que el servicio de email FALLA
    jest.spyOn(emailService, 'sendEmail').mockResolvedValue(false);

    // ACT
    await controller.enviarNotificacion(req as Request, res as Response);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al enviar notificación' });
  });

  test('Debe manejar excepción del servicio de email', async () => {
    // ARRANGE
    req.body = {
      email: 'usuario@example.com',
      mensaje: 'Test'
    };

    // MOCKEAR que el servicio lanza una excepción
    jest.spyOn(emailService, 'sendEmail').mockRejectedValue(
      new Error('Servidor de email caído')
    );

    // ACT
    await controller.enviarNotificacion(req as Request, res as Response);

    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno' });
  });
});

/**
 * ════════════════════════════════════════════════════════════════════
 * TIPOS DE MOCKS EN JEST
 * ════════════════════════════════════════════════════════════════════
 */

describe('Guía de Mocking con Jest', () => {
  
  test('jest.fn() - Mock básico de función', () => {
    // Crear función mock
    const mockFn = jest.fn();

    // Usar la función
    mockFn('arg1', 'arg2');
    mockFn('otro call');

    // Verificar llamadas
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockFn).toHaveBeenLastCalledWith('otro call');
  });

  test('jest.fn().mockReturnValue() - Mock con valor de retorno', () => {
    // Mock que siempre retorna 42
    const mockFn = jest.fn().mockReturnValue(42);

    const resultado = mockFn();
    expect(resultado).toBe(42);
  });

  test('jest.fn().mockResolvedValue() - Mock async exitoso', async () => {
    // Mock de promesa resuelta
    const mockAsyncFn = jest.fn().mockResolvedValue({ data: 'success' });

    const resultado = await mockAsyncFn();
    expect(resultado).toEqual({ data: 'success' });
  });

  test('jest.fn().mockRejectedValue() - Mock async con error', async () => {
    // Mock de promesa rechazada
    const mockAsyncFn = jest.fn().mockRejectedValue(new Error('Failed'));

    await expect(mockAsyncFn()).rejects.toThrow('Failed');
  });

  test('jest.spyOn() - Espiar método de objeto real', () => {
    // Objeto real
    const calculator = {
      add: (a: number, b: number) => a + b
    };

    // Espiar el método add
    const spy = jest.spyOn(calculator, 'add');

    // Usar normalmente
    const result = calculator.add(2, 3);

    // Verificar
    expect(result).toBe(5);
    expect(spy).toHaveBeenCalledWith(2, 3);

    // Restaurar implementación original
    spy.mockRestore();
  });

  test('jest.spyOn().mockImplementation() - Reemplazar implementación', () => {
    const calculator = {
      add: (a: number, b: number) => a + b
    };

    // Espiar Y cambiar implementación
    jest.spyOn(calculator, 'add').mockImplementation((a, b) => {
      return 999; // Siempre retorna 999
    });

    expect(calculator.add(2, 3)).toBe(999);
  });

  test('Mock de módulo completo con jest.mock()', () => {
    // Esto se hace al inicio del archivo:
    // jest.mock('axios');
    
    // Luego puedes usar:
    // import axios from 'axios';
    // (axios.get as jest.Mock).mockResolvedValue({ data: 'mocked' });
  });
});

/**
 * ════════════════════════════════════════════════════════════════════
 * CHEAT SHEET DE ASSERTIONS DE JEST
 * ════════════════════════════════════════════════════════════════════
 * 
 * IGUALDAD:
 * expect(value).toBe(expected)           → Igualdad estricta (===)
 * expect(value).toEqual(expected)        → Igualdad profunda (objetos/arrays)
 * expect(value).not.toBe(expected)       → Negación
 * 
 * EXISTENCIA:
 * expect(value).toBeDefined()            → No undefined
 * expect(value).toBeUndefined()          → Es undefined
 * expect(value).toBeNull()               → Es null
 * expect(value).toBeTruthy()             → Evalúa a true
 * expect(value).toBeFalsy()              → Evalúa a false
 * 
 * NÚMEROS:
 * expect(value).toBeGreaterThan(3)       → Mayor que
 * expect(value).toBeLessThan(10)         → Menor que
 * expect(value).toBeCloseTo(0.3)         → Aprox igual (floats)
 * 
 * STRINGS:
 * expect(str).toMatch(/regex/)           → Match regex
 * expect(str).toContain('texto')         → Contiene substring
 * 
 * ARRAYS:
 * expect(arr).toHaveLength(3)            → Longitud específica
 * expect(arr).toContain(item)            → Contiene elemento
 * expect(arr).toContainEqual(obj)        → Contiene objeto igual
 * 
 * OBJETOS:
 * expect(obj).toHaveProperty('key')      → Tiene propiedad
 * expect(obj).toMatchObject(partial)     → Contiene propiedades
 * 
 * FUNCIONES:
 * expect(fn).toHaveBeenCalled()          → Fue llamada
 * expect(fn).toHaveBeenCalledTimes(2)    → Llamada N veces
 * expect(fn).toHaveBeenCalledWith(args)  → Llamada con args
 * expect(fn).toHaveBeenLastCalledWith()  → Última llamada con args
 * 
 * EXCEPCIONES:
 * expect(fn).toThrow()                   → Lanza error
 * expect(fn).toThrow('mensaje')          → Lanza error específico
 * 
 * PROMESAS:
 * await expect(promise).resolves.toBe(x) → Resuelve con valor
 * await expect(promise).rejects.toThrow()→ Rechaza con error
 */
