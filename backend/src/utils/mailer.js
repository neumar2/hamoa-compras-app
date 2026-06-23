const nodemailer = require('nodemailer');
const { Setting } = require('../database/models');
require('dotenv').config();

async function getSmtpConfig() {
  const host = await Setting.findOne({ where: { key: 'SMTP_HOST' } });
  const port = await Setting.findOne({ where: { key: 'SMTP_PORT' } });
  const user = await Setting.findOne({ where: { key: 'SMTP_USER' } });
  const pass = await Setting.findOne({ where: { key: 'SMTP_PASS' } });
  const secure = await Setting.findOne({ where: { key: 'SMTP_SECURE' } });
  const fromName = await Setting.findOne({ where: { key: 'SMTP_FROM_NAME' } });
  
  if (host && host.value && user && user.value) {
    return {
      host: host.value,
      port: parseInt(port?.value || '587'),
      secure: secure?.value === 'true',
      auth: {
        user: user.value,
        pass: pass?.value || ''
      },
      from: fromName?.value ? `"${fromName.value}" <${user.value}>` : user.value
    };
  }

  // Fallback to .env
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      from: process.env.SMTP_FROM || process.env.SMTP_USER
    };
  }

  return null;
}

async function getTransporter() {
  const config = await getSmtpConfig();
  if (config) {
    return nodemailer.createTransport(config);
  }

  // Fallback to console logger for easy QA/E2E testing and local dev
  return {
    sendMail: async (mailOptions) => {
      console.log('==================================================');
      console.log('📧 [MOCK EMAIL SENT]');
      console.log(`Para: ${mailOptions.to}`);
      console.log(`Assunto: ${mailOptions.subject}`);
      console.log(`Conteúdo:\n${mailOptions.text}`);
      console.log('==================================================');
      return { messageId: 'mock-email-id-' + Date.now() };
    }
  };
}

const sendActivationEmail = async (email, name, code) => {
  const transporter = await getTransporter();
  const config = await getSmtpConfig();
  
  const fromEmail = config?.from || '"Hamoa Compras" <no-reply@hamoa.com>';

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: 'Ative sua conta - Hamoa Compras',
    text: `Olá, ${name}.

Sua conta foi criada no Sistema de Compras Hamoa.
Para ativá-la e realizar o seu primeiro acesso, use o seguinte código de ativação:

👉 CÓDIGO DE ATIVAÇÃO: ${code}

Se você tiver dúvidas, entre em contato com o administrador.`
  };
  return transporter.sendMail(mailOptions);
};

const sendResetPasswordEmail = async (email, token) => {
  const transporter = await getTransporter();
  const config = await getSmtpConfig();
  
  const fromEmail = config?.from || '"Hamoa Compras" <no-reply@hamoa.com>';

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: 'Recuperação de Senha - Hamoa Compras',
    text: `Você solicitou a redefinição de senha para sua conta no Hamoa Compras.

Use o seguinte código de recuperação para redefinir sua senha:

👉 CÓDIGO DE RECUPERAÇÃO: ${token}

Este código expira em 1 hora.`
  };
  return transporter.sendMail(mailOptions);
};

const testSmtpConnection = async (configOverride) => {
  try {
    const transporter = nodemailer.createTransport({
      host: configOverride.host,
      port: configOverride.port,
      secure: configOverride.secure,
      auth: {
        user: configOverride.user,
        pass: configOverride.pass
      }
    });
    
    await transporter.verify();
    
    const mailOptions = {
      from: configOverride.fromName ? `"${configOverride.fromName}" <${configOverride.user}>` : configOverride.user,
      to: configOverride.user,
      subject: 'Teste de Conexão SMTP - Hamoa Compras',
      text: 'Se você está recebendo este e-mail, as configurações do servidor SMTP no Hamoa Compras estão funcionando perfeitamente!'
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  sendActivationEmail,
  sendResetPasswordEmail,
  testSmtpConnection,
  getSmtpConfig
};
