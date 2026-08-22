// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Obter token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Formato esperado: Bearer <token>
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Erro no formato do token' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token mal formatado' });
    }

    // Verificar token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        // Adicionar dados do usuário à requisição
        req.usuario = {
            usuarioId: decoded.usuarioId,
            usuarioTipo: decoded.usuarioTipo,
            usuarioEmail: decoded.usuarioEmail
        };

        return next();
    });
};

module.exports = authMiddleware;