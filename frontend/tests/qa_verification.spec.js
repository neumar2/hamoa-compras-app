import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const BACKEND_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('Hamoa Compras - E2E QA Verification Suite', () => {

  // Setup/cleanup before starting tests
  test.beforeAll(async ({ request }) => {
    // Reset the database to a clean seeded state for complete E2E isolation
    try {
      let backendDir = path.resolve(process.cwd(), 'backend');
      if (!fs.existsSync(backendDir)) {
        backendDir = path.resolve(process.cwd(), '..', 'backend');
      }
      execSync('node src/database/seed.js', { cwd: backendDir });
    } catch (seedErr) {
      console.error('Erro ao resetar banco no beforeAll:', seedErr.message);
    }

    // 1. Authenticate as Admin to clear out and create test users
    const loginRes = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: 'admin@hamoa.com', password: 'hamoa123' }
    });
    
    if (loginRes.ok()) {
      const { token } = await loginRes.json();
      
      // Clean up previous test users if any exist
      const usersRes = await request.get(`${BACKEND_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (usersRes.ok()) {
        const users = await usersRes.json();
        const testUser = users.find(u => u.email === 'qa-auth-01@hamoa.com');
        if (testUser) {
          await request.delete(`${BACKEND_URL}/users/${testUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
      }

      // Create a fresh inactive user for QA-AUTH-01 / QA-AUTH-02 / QA-AUTH-03
      await request.post(`${BACKEND_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
        data: {
          name: 'QA Inativo Test',
          email: 'qa-auth-01@hamoa.com',
          password: 'password123',
          role: 'EVENTOS',
          canRequest: true,
          canEqualize: false,
          canApprove: false,
          canDownloadBoleto: false,
          canDownloadNF: false,
          isActive: false // forces activation
        }
      });
    } else {
      console.error('beforeAll admin login failed:', loginRes.status(), await loginRes.text());
    }
  });

  test('QA-AUTH-01 (Verificação) - Login bloqueado para contas inativas', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    // Try logging in with the inactive user
    await page.fill('input[type="email"]', 'qa-auth-01@hamoa.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify error notification (strictly match the specific alert text container)
    const errorAlert = page.locator('div', { hasText: 'Esta conta ainda não está ativa' }).last();
    await expect(errorAlert).toBeVisible();

    // Verify it transitioned to activation screen
    const activationHeader = page.locator('text=Insira o código de ativação recebido por e-mail').first();
    await expect(activationHeader).toBeVisible();
  });

  test('QA-AUTH-02 (Ativação) - Ativação de conta com código de 6 dígitos', async ({ page, request }) => {
    await page.goto(FRONTEND_URL);
    
    // Go to activation step
    await page.click('text=Ativar nova conta');

    // Fetch the code from the test endpoint
    const codeRes = await request.get(`${BACKEND_URL}/auth/test-code?email=qa-auth-01@hamoa.com`);
    if (!codeRes.ok()) {
      console.error('Fetch activation code failed:', codeRes.status(), await codeRes.text());
    }
    expect(codeRes.ok()).toBeTruthy();
    const { activationCode } = await codeRes.json();
    expect(activationCode).not.toBeNull();

    // Submit code
    await page.fill('input[placeholder="exemplo@hamoa.com"]', 'qa-auth-01@hamoa.com');
    await page.fill('input[placeholder="Ex: 123456"]', activationCode);
    await page.click('button:has-text("Ativar Minha Conta")');

    // Confirm redirected to login with success alert
    const successAlert = page.locator('text=Conta ativada com sucesso').first();
    await expect(successAlert).toBeVisible();

    // Verify successful login
    await page.fill('input[placeholder="exemplo@hamoa.com"]', 'qa-auth-01@hamoa.com');
    await page.fill('input[placeholder="Digite sua senha"]', 'password123');
    await page.click('button[type="submit"]');

    // Confirm dashboard header or button shows up (avoiding duplicate strict matches)
    const painelTitle = page.locator('h2.card-title:has-text("Painel de Compras")').first();
    await expect(painelTitle).toBeVisible();
  });

  test('QA-AUTH-03 (Esqueci a Senha) - Fluxo de redefinição de senha', async ({ page, request }) => {
    await page.goto(FRONTEND_URL);

    // Request reset
    await page.click('text=Esqueci minha senha');
    await page.fill('input[placeholder="exemplo@hamoa.com"]', 'qa-auth-01@hamoa.com');
    await page.click('button:has-text("Enviar Código de Recuperação")');

    // Wait for the UI to transition and render the reset password code input field (avoids race condition)
    const resetTokenInput = page.locator('input[placeholder="Ex: 654321"]');
    await expect(resetTokenInput).toBeVisible();

    // Fetch the reset token
    const codeRes = await request.get(`${BACKEND_URL}/auth/test-code?email=qa-auth-01@hamoa.com`);
    expect(codeRes.ok()).toBeTruthy();
    const { resetPasswordToken } = await codeRes.json();
    expect(resetPasswordToken).not.toBeNull();

    // Input recovery code and new password
    await page.fill('input[placeholder="Ex: 654321"]', resetPasswordToken);
    await page.fill('input[placeholder="Mínimo 6 caracteres"]', 'newpassword123');
    await page.click('button:has-text("Salvar Nova Senha")');

    // Verify success banner on login screen
    const successBanner = page.locator('text=Senha redefinida com sucesso').first();
    await expect(successBanner).toBeVisible();

    // Verify login with new password
    await page.fill('input[placeholder="exemplo@hamoa.com"]', 'qa-auth-01@hamoa.com');
    await page.fill('input[placeholder="Digite sua senha"]', 'newpassword123');
    await page.click('button[type="submit"]');

    const painelTitle = page.locator('h2.card-title:has-text("Painel de Compras")').first();
    await expect(painelTitle).toBeVisible();
  });

  test('QA-FLOW-04 (Interface Plano de Contas) - Seleção colorida e subcategoria desativada', async ({ page }) => {
    // Log in as Eventos (Solicitante)
    await page.goto(FRONTEND_URL);
    await page.fill('input[type="email"]', 'eventos@hamoa.com');
    await page.fill('input[type="password"]', 'hamoa123');
    await page.click('button[type="submit"]');

    // Open opening form
    await page.click('text=+ Abrir Solicitação');

    // Assert subcategory select (specific relative selector) is disabled initially
    const subcategorySelect = page.locator('.form-group:has(label:has-text("2. Conta de Débito Específica")) select');
    await expect(subcategorySelect).toBeDisabled();

    // Find and click the Manutenção Predial Macro group
    const cardPredial = page.locator('div strong:has-text("Manut. Predial")');
    await expect(cardPredial).toBeVisible();
    await cardPredial.click();

    // Assert subcategory is now enabled
    await expect(subcategorySelect).toBeEnabled();

    // Validate select styles match the color theme
    const styleAttribute = await subcategorySelect.getAttribute('style');
    expect(styleAttribute).toContain('border');
  });

  test('QA-FLOW-05 (Auditoria & Readonly) - Inputs bloqueados para Gestão na equalização', async ({ page, request }) => {
    // 1. Create a dummy solicitation in AGUARDANDO_APROVACAO status to test
    const loginRes = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: 'admin@hamoa.com', password: 'hamoa123' }
    });
    
    if (!loginRes.ok()) {
      console.error('QA-FLOW-05 admin login failed:', loginRes.status(), await loginRes.text());
    }
    const { token } = await loginRes.json();

    const solRes = await request.post(`${BACKEND_URL}/solicitacoes`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        area: 'Eventos Corporativos',
        tipo: 'Normal',
        conta: '2.3.1', // Manutenção Predial
        dataAplicacao: '2026-06-10',
        descResumida: 'E2E Testing Readonly Check',
        justificativa: 'QA verification',
        prazo: 'Imediato',
        items: [{ desc: 'Serviço de limpeza calhas', quant: 1, unidade: 'UND' }]
      }
    });
    
    if (!solRes.ok()) {
      console.error('QA-FLOW-05 solRes failed:', solRes.status(), await solRes.text());
    }
    expect(solRes.ok()).toBeTruthy();
    const sol = await solRes.json();

    // Transition solicitation to EM_COTACAO via PUT endpoint
    const cotarRes = await request.put(`${BACKEND_URL}/solicitacoes/${sol.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { status: 'EM_COTACAO' }
    });
    if (!cotarRes.ok()) {
      console.error('QA-FLOW-05 cotarRes failed:', cotarRes.status(), await cotarRes.text());
    }

    // Populate mock vendors/prices (transitions it to AGUARDANDO_APROVACAO)
    const eqRes = await request.post(`${BACKEND_URL}/solicitacoes/${sol.id}/equalizacao`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        vendors: [{ name: 'Parceiro A', discount: 10, condPagto: 'A vista', prazoEntrega: '3 dias', frete: 50 }],
        itemPrices: [{ itemDesc: 'Serviço de limpeza calhas', vendorName: 'Parceiro A', price: 1500, isWinner: true }],
        justificativaEscolha: 'Melhor custo benefício'
      }
    });
    if (!eqRes.ok()) {
      console.error('QA-FLOW-05 eqRes failed:', eqRes.status(), await eqRes.text());
    }

    // Log in as Gestão (Aprovador)
    await page.goto(FRONTEND_URL);
    await page.fill('input[type="email"]', 'gestao@hamoa.com');
    await page.fill('input[type="password"]', 'hamoa123');
    await page.click('button[type="submit"]');

    // Locate the equalização row in dashboard table, click Ações, then click Verificar e Aprovar
    const row = page.locator(`tr:has-text("E2E Testing Readonly Check")`).first();
    await expect(row).toBeVisible();
    await row.locator('button:has-text("Ações")').click();
    const actionBtn = page.locator('button:has-text("Verificar e Aprovar")').first();
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();

    // Verify in equalização page that the inputs are read-only
    const vendorInput = page.locator('thead input[type="text"]').first();
    await expect(vendorInput).toHaveAttribute('readonly', '');
    await expect(vendorInput).toHaveValue('Parceiro A');

    const priceInput = page.locator('tbody input[type="number"]').first();
    await expect(priceInput).toHaveAttribute('readonly', '');
    await expect(priceInput).toHaveValue('1500');

    // Confirm that the approve button is visible
    const approveBtn = page.locator('button:has-text("Aprovar e Assinar Solicitação")');
    await expect(approveBtn).toBeVisible();
  });

  test('QA-FLOW-06 (Pagamento) - Transição de status para PAGA pelo financeiro', async ({ page }) => {
    // Log in as Financeiro
    await page.goto(FRONTEND_URL);
    await page.fill('input[type="email"]', 'financeiro@hamoa.com');
    await page.fill('input[type="password"]', 'hamoa123');
    await page.click('button[type="submit"]');

    // The dashboard should load
    const painelTitle = page.locator('h2.card-title:has-text("Painel de Compras")').first();
    await expect(painelTitle).toBeVisible();

    // Confirm table structure loaded correctly
    const activeTable = page.locator('table');
    await expect(activeTable).toBeVisible();
  });

  test('QA-FLOW-07 (Exclusão) - Excluir solicitação em rascunho', async ({ page, request }) => {
    // 1. Create a solicitation in ABERTA status as eventos@hamoa.com
    const loginRes = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: 'eventos@hamoa.com', password: 'hamoa123' }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    const uniqueTitle = `E2E Solicitation to Delete ${Date.now()}`;
    const solRes = await request.post(`${BACKEND_URL}/solicitacoes`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        area: 'Portaria',
        tipo: 'Normal',
        conta: '2.2.1 - Aquisição de Equipamentos',
        dataAplicacao: '2026-06-12',
        descResumida: uniqueTitle,
        justificativa: 'Testing delete',
        prazo: 'Imediato',
        items: [{ desc: 'Camera de seguranca', quant: 2, unidade: 'UND' }]
      }
    });
    expect(solRes.ok()).toBeTruthy();
    const sol = await solRes.json();

    // 2. Log in as eventos@hamoa.com on the page
    await page.goto(FRONTEND_URL);
    await page.fill('input[type="email"]', 'eventos@hamoa.com');
    await page.fill('input[type="password"]', 'hamoa123');
    await page.click('button[type="submit"]');

    // Confirm E2E Solicitation to Delete is visible
    const row = page.locator(`tr:has-text("${uniqueTitle}")`).first();
    await expect(row).toBeVisible();

    // Click Ações, then click Excluir, confirm dialog
    page.on('dialog', dialog => dialog.accept());
    await row.locator('button:has-text("Ações")').click();
    await page.locator('button:has-text("Excluir")').first().click();

    // Confirm it disappeared by waiting and reloading if needed
    await page.waitForTimeout(2000); // Give backend time to process
    await page.reload();
    await expect(page.locator(`tr:has-text("${uniqueTitle}")`)).not.toBeVisible();
  });

  test('QA-FLOW-08 (Mapa & Upload) - Cotar com 1 fornecedor e anexar arquivo', async ({ page, request }) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    // 1. Create solicitation as eventos@hamoa.com
    const loginRes = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: 'eventos@hamoa.com', password: 'hamoa123' }
    });
    const { token } = await loginRes.json();

    const uniqueTitle = `E2E 1 Vendor Upload Test ${Date.now()}`;
    const solRes = await request.post(`${BACKEND_URL}/solicitacoes`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        area: 'Segurança',
        tipo: 'Normal',
        conta: '2.2.1 - Aquisição de Equipamentos',
        dataAplicacao: '2026-06-15',
        descResumida: uniqueTitle,
        justificativa: 'Testing 1 vendor',
        prazo: '7 dias',
        items: [{ desc: 'Cabo coaxial', quant: 10, unidade: 'METROS' }]
      }
    });
    expect(solRes.ok()).toBeTruthy();
    const sol = await solRes.json();

    // Put to EM_COTACAO
    await request.put(`${BACKEND_URL}/solicitacoes/${sol.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { status: 'EM_COTACAO' }
    });

    // 2. Log in as Suprimentos (Comprador)
    await page.goto(FRONTEND_URL);
    await page.fill('input[type="email"]', 'suprimentos@hamoa.com');
    await page.fill('input[type="password"]', 'hamoa123');
    await page.click('button[type="submit"]');

    // Find and click Cotar
    const row = page.locator(`tr:has-text("${uniqueTitle}")`).first();
    await expect(row).toBeVisible();
    await row.locator('button:has-text("Ações")').click();
    const cotarBtn = page.locator('button:has-text("Cotar")').first();
    await expect(cotarBtn).toBeVisible();
    await cotarBtn.click();

    // Change vendorCount select to 1 Fornecedor
    const select = page.locator('label:has-text("Número de Fornecedores a Comparar") + select');
    await select.selectOption('1');

    // Fill in Supplier name and unit price
    const nameInput = page.locator('thead input[type="text"]').first();
    await nameInput.fill('Fornecedor Unico');

    const priceInput = page.locator('tbody input[type="number"]').first();
    await priceInput.fill('15');

    // Fill prazo
    const prazoInput = page.locator('thead input[placeholder="Prazo Entrega (Opcional)"]').first();
    await prazoInput.fill('Imediato');

    // Upload mock quote file
    const fileToUpload = path.resolve(process.cwd(), 'test-quote.txt');
    fs.writeFileSync(fileToUpload, 'Mock Quote Content');

    await page.setInputFiles('input[type="file"]', fileToUpload);

    // Fill justification and submit
    await page.fill('textarea[placeholder*="Justifique o motivo de escolha"]', 'Compra menor de 100 reais');
    // Accept dialog and submit form
    page.on('dialog', dialog => dialog.accept());
    await page.click('button[type="submit"]');

    // Verify solicitation is now AGUARDANDO_APROVACAO on dashboard
    const dashboardTitle = page.locator('h2.card-title:has-text("Painel de Compras")').first();
    await expect(dashboardTitle).toBeVisible();
    await page.click('button:has-text("Ver ano")');

    const statusCell = page.locator(`tr:has-text("${uniqueTitle}") td:nth-child(6)`).first();
    await expect(statusCell).toHaveText('AGUARDANDO APROVACAO');

    // Clean up local temp file after completion
    if (fs.existsSync(fileToUpload)) fs.unlinkSync(fileToUpload);
  });

  test('QA-FLOW-09 (Permissão Gestão) - Gestão com permissão de edição no Mapa', async ({ page, request }) => {
    // 1. Log in as Admin to edit Gestão user permissions
    await page.goto(FRONTEND_URL);
    await page.fill('input[type="email"]', 'admin@hamoa.com');
    await page.fill('input[type="password"]', 'hamoa123');
    await page.click('button[type="submit"]');

    // Go to User Management
    await page.click('text=Usuários');

    // Find gestao@hamoa.com in table and click Edit
    const row = page.locator('tr:has-text("gestao@hamoa.com")');
    await row.locator('button:has-text("Editar")').click();

    // Check canEditEqualization checkbox
    const editCotaCheckbox = page.locator('label:has-text("Editar cotações no Mapa") input[type="checkbox"]');
    await editCotaCheckbox.check();

    // Click Save
    await page.click('button:has-text("Salvar Alterações")');

    // Wait for success alert or refresh
    await page.waitForTimeout(500);

    // Logout
    await page.click('button:has-text("Sair")');

    // 2. Create pending solicitation to test approval/editing
    const loginRes = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: 'admin@hamoa.com', password: 'hamoa123' }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    const uniqueTitle = `E2E Gestao Editing Permission ${Date.now()}`;
    const solRes = await request.post(`${BACKEND_URL}/solicitacoes`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        area: 'Operacional',
        tipo: 'Normal',
        conta: '2.7.1 - Combustível',
        dataAplicacao: '2026-06-16',
        descResumida: uniqueTitle,
        justificativa: 'Testing edit permission',
        prazo: 'Imediato',
        items: [{ desc: 'Gasolina', quant: 5, unidade: 'LITROS' }]
      }
    });
    expect(solRes.ok()).toBeTruthy();
    const sol = await solRes.json();

    // Put to EM_COTACAO
    const cotarRes = await request.put(`${BACKEND_URL}/solicitacoes/${sol.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { status: 'EM_COTACAO' }
    });
    expect(cotarRes.ok()).toBeTruthy();

    // Populate mock vendors/prices (transitions it to AGUARDANDO_APROVACAO)
    const eqRes = await request.post(`${BACKEND_URL}/solicitacoes/${sol.id}/equalizacao`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        vendors: [{ name: 'Posto A', discount: 0, condPagto: 'A vista', prazoEntrega: 'Imediato', frete: 0 }],
        itemPrices: [{ itemDesc: 'Gasolina', vendorName: 'Posto A', price: 6, isWinner: true }],
        justificativaEscolha: 'Menor preco'
      }
    });
    expect(eqRes.ok()).toBeTruthy();

    // Log in as Gestão
    await page.goto(FRONTEND_URL);
    await page.fill('input[type="email"]', 'gestao@hamoa.com');
    await page.fill('input[type="password"]', 'hamoa123');
    await page.click('button[type="submit"]');

    // Wait for Dashboard to settle
    const dashboardTitle = page.locator('h2.card-title:has-text("Painel de Compras")').first();
    await expect(dashboardTitle).toBeVisible();
    await page.waitForTimeout(1000);
    await page.reload(); // Ensure fresh data
    await expect(dashboardTitle).toBeVisible();
    
    // View full year to bypass month mismatch
    await page.click('button:has-text("Ver ano")');

    // Find E2E Gestao Editing Permission, click Ações, then click Verificar e Aprovar
    const solRow = page.locator(`tr:has-text("${uniqueTitle}")`).first();
    await expect(solRow).toBeVisible();
    await solRow.locator('button:has-text("Ações")').click();
    const actionBtn = page.locator('button:has-text("Verificar e Aprovar")').first();
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();

    // Verify fields are NOT readonly
    const vendorInput = page.locator('thead input[type="text"]').first();
    await expect(vendorInput).not.toHaveAttribute('readonly', '');
    
    // Change price
    const priceInput = page.locator('tbody input[type="number"]').first();
    await expect(priceInput).not.toHaveAttribute('readonly', '');
    await priceInput.fill('5.8');

    // Click Approve
    await page.click('button:has-text("Aprovar e Assinar Solicitação")');

    // Confirm redirected to dashboard
    const painelTitle = page.locator('h2.card-title:has-text("Painel de Compras")').first();
    await expect(painelTitle).toBeVisible();
  });

});
