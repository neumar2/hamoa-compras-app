import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const BACKEND_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('Hamoa Compras - Concurrency Optimistic Locking E2E tests', () => {

  test.beforeAll(async ({ request }) => {
    // Reset the database to a clean seeded state
    try {
      let backendDir = path.resolve(process.cwd(), 'backend');
      if (!fs.existsSync(backendDir)) {
        backendDir = path.resolve(process.cwd(), '..', 'backend');
      }
      execSync('node src/database/seed.js', { cwd: backendDir });
    } catch (seedErr) {
      console.error('Erro ao resetar banco no beforeAll:', seedErr.message);
    }
  });

  test('QA-CONCURRENCY-01 - Prevent data overwrite when two users edit the same solicitation', async ({ browser, request }) => {
    // 1. Create a solicitation in ABERTA state via API
    const loginRes = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: 'admin@hamoa.com', password: 'hamoa123' }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    const uniqueTitle = `Concurrency Test Sol ${Date.now()}`;
    const solRes = await request.post(`${BACKEND_URL}/solicitacoes`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        area: 'Portaria',
        tipo: 'Normal',
        conta: '2.2.1 - Aquisição de Equipamentos',
        dataAplicacao: '2026-06-12',
        descResumida: uniqueTitle,
        justificativa: 'Testing concurrency',
        prazo: 'Imediato',
        items: [{ desc: 'Camera de seguranca', quant: 2, unidade: 'UND' }]
      }
    });
    expect(solRes.ok()).toBeTruthy();
    const sol = await solRes.json();

    // 2. Open User A session (Admin)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto(FRONTEND_URL);
    await pageA.fill('input[type="email"]', 'admin@hamoa.com');
    await pageA.fill('input[type="password"]', 'hamoa123');
    await pageA.click('button[type="submit"]');

    // 3. Open User B session (Gestão / Carol)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto(FRONTEND_URL);
    await pageB.fill('input[type="email"]', 'gestao@hamoa.com');
    await pageB.fill('input[type="password"]', 'hamoa123');
    await pageB.click('button[type="submit"]');

    // 4. User A goes to Edit Solicitation
    const rowA = pageA.locator(`tr:has-text("${uniqueTitle}")`).first();
    await expect(rowA).toBeVisible();
    await rowA.locator('button:has-text("Ações")').click();
    await pageA.locator('button:has-text("Editar")').click();
    
    // Verify User A is on edit page
    await expect(pageA.locator('h2.card-title:has-text("Editar Solicitação")')).toBeVisible();
    await expect(pageA.locator('textarea[placeholder*="Descreva de forma abrangente"]')).toHaveValue(uniqueTitle);

    // 5. User B goes to Edit Solicitation
    const rowB = pageB.locator(`tr:has-text("${uniqueTitle}")`).first();
    await expect(rowB).toBeVisible();
    await rowB.locator('button:has-text("Ações")').click();
    await pageB.locator('button:has-text("Editar")').click();
    
    // Verify User B is on edit page
    await expect(pageB.locator('h2.card-title:has-text("Editar Solicitação")')).toBeVisible();
    await expect(pageB.locator('textarea[placeholder*="Descreva de forma abrangente"]')).toHaveValue(uniqueTitle);

    // 6. User B makes a quick edit and saves successfully (becomes version 1)
    await pageB.locator('textarea[placeholder*="Descreva de forma abrangente"]').fill('User B Quick Modification text');
    
    // Intercept submit alert dialog and accept it
    pageB.on('dialog', dialog => dialog.accept());
    await pageB.click('button[type="submit"]:has-text("Salvar Alterações")');

    // Verify User B is back on Dashboard
    await expect(pageB.locator('h2.card-title:has-text("Painel de Compras")').first()).toBeVisible();

    // 7. User A (who loaded version 0) now tries to edit and save
    await pageA.locator('textarea[placeholder*="Descreva de forma abrangente"]').fill('User A Stale Modification text');
    
    // Set dialog handler for User A to catch the conflict error
    let dialogMessage = '';
    pageA.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    await pageA.click('button[type="submit"]:has-text("Salvar Alterações")');

    // Wait for dialog event to process
    await pageA.waitForTimeout(1000);

    // Assert that a concurrency conflict error was displayed in the dialog
    expect(dialogMessage).toContain('Esta solicitação foi alterada por outro usuário');

    // Clean up contexts
    await contextA.close();
    await contextB.close();
  });
});
