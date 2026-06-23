const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middlewares/auth');
const { User } = require('../database/models');
const { sendActivationEmail } = require('../utils/mailer');

// Helper to restrict access to TI or users with canManageUsers permission
const isAdmin = (req, res, next) => {
  if (req.user.canManageUsers === true || req.user.role === 'TI') {
    return next();
  }
  return res.status(403).json({ error: 'Permissão negada. Apenas usuários autorizados ou Administradores TI podem gerenciar usuários.' });
};

// GET all users
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'canRequest', 'canEqualize', 'canApprove', 'canDownloadBoleto', 'canDownloadNF', 'canEditEqualization', 'canDeleteRequest', 'canAccessReceitas', 'canConfirmReceitas', 'canManageUsers', 'canAccessSettings', 'isActive', 'activationCode', 'createdAt']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// POST create user
router.post('/', auth, isAdmin, async (req, res) => {
  const { name, email, role, password, canRequest, canEqualize, canApprove, canDownloadBoleto, canDownloadNF, canEditEqualization, canDeleteRequest, canAccessReceitas, canConfirmReceitas, canManageUsers, canAccessSettings, isActive } = req.body;

  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: 'Todos os campos (nome, email, cargo, senha) são obrigatórios.' });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'E-mail já está sendo utilizado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // If isActive is explicitly provided, respect it. Otherwise, default to false (requires activation)
    const active = isActive !== undefined ? !!isActive : false;
    const activationCode = active ? null : Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = await User.create({
      name,
      email,
      role,
      password: passwordHash,
      canRequest: !!canRequest,
      canEqualize: !!canEqualize,
      canApprove: !!canApprove,
      canDownloadBoleto: !!canDownloadBoleto,
      canDownloadNF: !!canDownloadNF,
      canEditEqualization: !!canEditEqualization,
      canDeleteRequest: !!canDeleteRequest,
      canAccessReceitas: !!canAccessReceitas,
      canConfirmReceitas: !!canConfirmReceitas,
      canManageUsers: !!canManageUsers,
      canAccessSettings: !!canAccessSettings,
      isActive: active,
      activationCode
    });

    if (!active && activationCode) {
      try {
        await sendActivationEmail(newUser.email, newUser.name, activationCode);
      } catch (mailError) {
        console.error('Falha ao enviar e-mail de ativação:', mailError.message);
      }
    }

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      canRequest: newUser.canRequest,
      canEqualize: newUser.canEqualize,
      canApprove: newUser.canApprove,
      canDownloadBoleto: newUser.canDownloadBoleto,
      canDownloadNF: newUser.canDownloadNF,
      canEditEqualization: newUser.canEditEqualization,
      canDeleteRequest: newUser.canDeleteRequest,
      canAccessReceitas: newUser.canAccessReceitas,
      canConfirmReceitas: newUser.canConfirmReceitas,
      canManageUsers: newUser.canManageUsers,
      canAccessSettings: newUser.canAccessSettings,
      isActive: newUser.isActive,
      activationCode: newUser.activationCode
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

// PUT update user
router.put('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password, canRequest, canEqualize, canApprove, canDownloadBoleto, canDownloadNF, canEditEqualization, canDeleteRequest, canAccessReceitas, canConfirmReceitas, canManageUsers, canAccessSettings, isActive } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'E-mail já cadastrado por outro usuário.' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (role) user.role = role;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (canRequest !== undefined) user.canRequest = !!canRequest;
    if (canEqualize !== undefined) user.canEqualize = !!canEqualize;
    if (canApprove !== undefined) user.canApprove = !!canApprove;
    if (canDownloadBoleto !== undefined) user.canDownloadBoleto = !!canDownloadBoleto;
    if (canDownloadNF !== undefined) user.canDownloadNF = !!canDownloadNF;
    if (canEditEqualization !== undefined) user.canEditEqualization = !!canEditEqualization;
    if (canDeleteRequest !== undefined) user.canDeleteRequest = !!canDeleteRequest;
    if (canAccessReceitas !== undefined) user.canAccessReceitas = !!canAccessReceitas;
    if (canConfirmReceitas !== undefined) user.canConfirmReceitas = !!canConfirmReceitas;
    if (canManageUsers !== undefined) user.canManageUsers = !!canManageUsers;
    if (canAccessSettings !== undefined) user.canAccessSettings = !!canAccessSettings;
    if (isActive !== undefined) {
      user.isActive = !!isActive;
      if (user.isActive) {
        user.activationCode = null; // Clear activation code if activated manually by admin
      }
    }

    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
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
      canAccessSettings: user.canAccessSettings,
      isActive: user.isActive,
      activationCode: user.activationCode
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// DELETE user
router.delete('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Avoid self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Não é possível excluir a sua própria conta.' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    await user.destroy();
    res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

// PUT update user theme preference
router.put('/theme', auth, async (req, res) => {
  const { theme } = req.body;
  if (!theme) {
    return res.status(400).json({ error: 'O tema é obrigatório.' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    user.theme = theme;
    await user.save();

    res.json({ message: 'Preferência de tema salva com sucesso.', theme: user.theme });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar preferência de tema.' });
  }
});

module.exports = router;
