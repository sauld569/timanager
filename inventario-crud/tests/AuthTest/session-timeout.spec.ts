import { expect, test } from '@playwright/test';
import { login, navigateTo } from '../utils/test-utils';

test('Verificar que NO hay logout automático después del login', async ({ page }) => {
  test.setTimeout(60000); // 60 segundos para la prueba completa
  
  console.log('🔐 Iniciando sesión...');
  
  // Login
  await login(page);
  
  // Verificar que el login fue exitoso
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  console.log('✅ Login exitoso - Dashboard cargado');
  
  // Verificar que NO aparecen advertencias de sesión
  const toastWarning = page.locator('.Toastify__toast--warning');
  await expect(toastWarning).not.toBeVisible();
  console.log('✅ No hay advertencias de timeout de sesión');
  
  // Esperar 10 segundos sin interacción (simulando inactividad)
  console.log('⏰ Esperando 10 segundos sin interacción...');
  await page.waitForTimeout(10000);
  
  // Verificar que seguimos en dashboard (no hubo logout)
  await expect(page).toHaveURL(/.*dashboard/);
  console.log('✅ Seguimos autenticados después de 10 segundos');
  
  // Verificar que NO hay mensajes de expiración de sesión
  await expect(page.locator('body')).not.toContainText('Tu sesión ha expirado');
  await expect(page.locator('body')).not.toContainText('sesión expirará');
  console.log('✅ No hay mensajes de expiración de sesión');
  
  // Intentar navegar a otra página - debería funcionar
  console.log('🔄 Navegando a inventario...');
  await navigateTo(page, 'inventario');
  await expect(page).toHaveURL(/.*inventario/, { timeout: 10000 });
  console.log('✅ Navegación exitosa - La sesión permanece activa');
  
  // Verificar que podemos usar la funcionalidad
  const addButton = page.getByRole('button', { name: /Agregar Artículo/i });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  console.log('✅ Elementos de la UI funcionan correctamente');
  
  console.log('');
  console.log('✅✅✅ PRUEBA EXITOSA ✅✅✅');
  console.log('SessionTimeout está desactivado correctamente');
  console.log('No hay logout automático por inactividad');
});
