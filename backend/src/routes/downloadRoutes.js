const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middlewares/auth');

router.get('/:filename', authMiddleware, (req, res, next) => {
  try {
    const { filename } = req.params;
    
    // Evitar Directory Traversal (ex: filename = "../../../etc/passwd")
    const safeFilename = path.basename(filename);
    
    const filePath = path.join(__dirname, '..', '..', '..', 'uploads', safeFilename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
