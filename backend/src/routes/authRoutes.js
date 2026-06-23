const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../database/models');
const { sendActivationEmail, sendResetPasswordEmail } = require('../utils/mailer');

const SECRET_KEY = process.env.JWT_SECRET || 'hamoasecretkey123';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Senha incorreta.' });

    // Enforce active account check
    if (user.isActive === false) {
      // If they are inactive but don't have an activation code, generate one now
      if (!user.activationCode) {
        user.activationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await user.save();
      }
      try {
        await sendActivationEmail(user.email, user.name, user.activationCode);
      } catch (mailErr) {
        console.error('Falha ao enviar e-mail de ativação durante login:', mailErr.message);
      }
      return res.status(403).json({
        error: 'ACCOUNT_INACTIVE',
        email: user.email,
        message: 'Esta conta ainda não está ativa. Um e-mail com o código de ativação de 6 dígitos foi enviado.'
      });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        email: user.email,
        theme: user.theme,
        canRequest: user.canRequest,
        canEqualize: user.canEqualize,
        canApprove: user.canApprove,
        canDownloadBoleto: user.canDownloadBoleto,
        canDownloadNF: user.canDownloadNF,
        canEditEqualization: user.canEditEqualization,
        canDeleteRequest: user.canDeleteRequest,
        canAccessReceitas: user.canAccessReceitas,
        canConfirmReceitas: user.canConfirmReceitas,
        canManageUsers: user.canManageUsers,
        canAccessSettings: user.canAccessSettings
      },
      SECRET_KEY,
      { expiresIn: '8h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        email: user.email,
        theme: user.theme,
        canRequest: user.canRequest,
        canEqualize: user.canEqualize,
        canApprove: user.canApprove,
        canDownloadBoleto: user.canDownloadBoleto,
        canDownloadNF: user.canDownloadNF,
        canEditEqualization: user.canEditEqualization,
        canDeleteRequest: user.canDeleteRequest,
        canAccessReceitas: user.canAccessReceitas,
        canConfirmReceitas: user.canConfirmReceitas,
        canManageUsers: user.canManageUsers,
        canAccessSettings: user.canAccessSettings
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao efetuar login.' });
  }
});

// Route to activate account using 6-digit code
router.post('/activate-account', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'E-mail e código de ativação são obrigatórios.' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (user.activationCode !== code.toString().trim()) {
      return res.status(400).json({ error: 'Código de ativação incorreto.' });
    }

    user.isActive = true;
    user.activationCode = null;
    await user.save();

    res.json({ message: 'Conta ativada com sucesso! Você já pode realizar o login.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ativar a conta.' });
  }
});

// Route to request password reset token
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'O e-mail é obrigatório.' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'E-mail corporativo não encontrado.' });
    }

    // Generate a 6-digit password reset token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    try {
      await sendResetPasswordEmail(user.email, token);
    } catch (mailErr) {
      console.error('Falha ao enviar e-mail de recuperação:', mailErr.message);
    }

    res.json({ message: 'Código de recuperação de senha enviado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar solicitação de recuperação de senha.' });
  }
});

// Route to reset password using token
router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'E-mail, código de recuperação e nova senha são obrigatórios.' });
  }

  try {
    const user = await User.findOne({
      where: {
        email,
        resetPasswordToken: token.toString().trim(),
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Código de recuperação inválido ou expirado.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    // Auto-activate account if it was inactive
    user.isActive = true;
    user.activationCode = null;

    await user.save();

    res.json({ message: 'Senha redefinida com sucesso! Prossiga para o login.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao redefinir a senha.' });
  }
});

// Test utility endpoint to fetch codes for E2E tests (only available in development/testing)
router.get('/test-code', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({
      activationCode: user.activationCode,
      resetPasswordToken: user.resetPasswordToken
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar código de teste' });
  }
});

module.exports = router;
