const bcrypt = require('bcryptjs');
const { sequelize, User, PlanoContas } = require('./models');
const path = require('path');
const fs = require('fs');

async function seed() {
  try {
    console.log('Sincronizando tabelas do banco de dados...');
    await sequelize.sync({ force: true });
    console.log('Tabelas sincronizadas com sucesso.');

    console.log('Criando plano de contas genérico...');
    const accountsData = [
      { code: '1.1', name: 'Receitas Diversas', icon: '💰', color: '#10b981' },
      { code: '2.1', name: 'Despesas Administrativas', icon: '🏢', color: '#2563eb' },
      { code: '2.2', name: 'Manutenção Predial', icon: '🛠️', color: '#ea580c' },
      { code: '2.3', name: 'Tecnologia da Informação', icon: '💻', color: '#8b5cf6' },
      { code: '2.4', name: 'Despesas com Pessoal', icon: '👥', color: '#dc2626' },
      { code: '2.5', name: 'Serviços Terceirizados', icon: '🤝', color: '#0891b2' }
    ];

    for (const acc of accountsData) {
      await PlanoContas.create({
        code: acc.code,
        name: acc.name,
        icon: acc.icon,
        color: acc.color,
        isActive: true
      });
    }
    console.log(`${accountsData.length} contas contábeis de demonstração cadastradas.`);

    console.log('Criando usuários de teste...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin', salt); // Default password 'admin'
    const passwordUser = await bcrypt.hash('123456', salt); // Default password '123456'

    const usersData = [
      { name: 'Administrador (TI)', email: 'admin@hamoa.com', password: passwordHash, role: 'TI',
        canRequest: true, canEqualize: true, canApprove: true, canDownloadBoleto: true, canDownloadNF: true,
        canEditEqualization: true, canDeleteRequest: true, canAccessReceitas: true, canConfirmReceitas: true,
        canManageUsers: true, canAccessSettings: true, isActive: true },
      { name: 'Gestor(a)', email: 'gestao@example.com', password: passwordUser, role: 'GESTAO',
        canRequest: false, canEqualize: false, canApprove: true, canDownloadBoleto: true, canDownloadNF: true,
        canEditEqualization: false, canDeleteRequest: true, canAccessReceitas: true, canConfirmReceitas: false,
        canManageUsers: true, canAccessSettings: false, isActive: true },
      { name: 'Comprador(a)', email: 'compras@example.com', password: passwordUser, role: 'SUPRIMENTOS',
        canRequest: false, canEqualize: true, canApprove: false, canDownloadBoleto: true, canDownloadNF: true,
        canEditEqualization: false, canDeleteRequest: false, canAccessReceitas: false, canConfirmReceitas: false,
        canManageUsers: false, canAccessSettings: false, isActive: true },
      { name: 'Requisitante', email: 'operacional@example.com', password: passwordUser, role: 'EVENTOS',
        canRequest: true, canEqualize: false, canApprove: false, canDownloadBoleto: false, canDownloadNF: false,
        canEditEqualization: false, canDeleteRequest: false, canAccessReceitas: false, canConfirmReceitas: false,
        canManageUsers: false, canAccessSettings: false, isActive: true },
      { name: 'Analista Financeiro', email: 'financeiro@example.com', password: passwordUser, role: 'FINANCEIRO',
        canRequest: false, canEqualize: false, canApprove: false, canDownloadBoleto: true, canDownloadNF: true,
        canEditEqualization: false, canDeleteRequest: false, canAccessReceitas: true, canConfirmReceitas: true,
        canManageUsers: false, canAccessSettings: false, isActive: true }
    ];

    for (const u of usersData) {
      await User.create(u);
      console.log(`Usuário criado: ${u.name} (${u.role})`);
    }

    console.log('Semeamento concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante o sementamento do banco:', error);
    process.exit(1);
  }
}

seed();
