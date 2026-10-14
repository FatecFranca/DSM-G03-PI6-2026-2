// src/utils/tokenUtils.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ============================================================
// Access token (JWT, curto)
// ============================================================
function gerarAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
  });
}

function verificarAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// ============================================================
// Refresh token (opaco, aleatório, longo)
// ============================================================
function gerarRefreshTokenBruto() {
  // 64 bytes = 128 caracteres hex. Alto o suficiente para ser imprevisível.
  return crypto.randomBytes(64).toString('hex');
}

function hashRefreshToken(tokenBruto) {
  // SHA-256 é suficiente porque o token já tem alta entropia
  // (não precisa de bcrypt — não é senha, é chave aleatória)
  return crypto.createHash('sha256').update(tokenBruto).digest('hex');
}

// ============================================================
// Janela de expiração do refresh
// ============================================================
function calcularExpiracaoRefresh(manterLogado) {
  const agora = Date.now();
  // "Manter logado": 90 dias. Caso contrário: 8h (mesmo tempo da sessão atual)
  const duracaoMs = manterLogado
    ? 90 * 24 * 60 * 60 * 1000   // 90 dias
    : 8 * 60 * 60 * 1000;         // 8 horas
  return new Date(agora + duracaoMs);
}

module.exports = {
  gerarAccessToken,
  verificarAccessToken,
  gerarRefreshTokenBruto,
  hashRefreshToken,
  calcularExpiracaoRefresh
};