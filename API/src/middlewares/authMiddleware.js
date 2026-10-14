// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido', codigo: 'TOKEN_AUSENTE' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Erro no formato do token', codigo: 'TOKEN_MALFORMADO' });
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formatado', codigo: 'TOKEN_MALFORMADO' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          codigo: 'TOKEN_EXPIRADO'   // ← o app usa isso para acionar o refresh
        });
      }
      return res.status(401).json({ error: 'Token inválido', codigo: 'TOKEN_INVALIDO' });
    }

    req.usuario = {
      usuarioId: decoded.usuarioId,
      usuarioTipo: decoded.usuarioTipo,
      usuarioEmail: decoded.usuarioEmail,
      usuarioNome: decoded.usuarioNome,
      unidadeId: decoded.unidadeId
    };

    return next();
  });
};

module.exports = authMiddleware;