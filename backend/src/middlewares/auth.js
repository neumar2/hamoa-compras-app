const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  console.error("ERRO FATAL: JWT_SECRET não está definido no arquivo .env!");
  process.exit(1);
}
module.exports = (req, res, next) => {
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ error: 'Token de autenticação ausente.' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
    req.user = decoded;
    next();
  });
};
