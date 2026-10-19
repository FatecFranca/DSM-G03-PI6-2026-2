// src/controllers/authController.js
const prisma = require('../prisma');
const {
  gerarAccessToken,
  gerarRefreshTokenBruto,
  hashRefreshToken,
  calcularExpiracaoRefresh
} = require('../utils/tokenUtils');
const { gravarLog } = require('../utils/logGrava');

class AuthController {
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ error: 'Refresh token é obrigatório' });
      }

      const hash = hashRefreshToken(refreshToken);

      const registro = await prisma.refreshToken.findUnique({
        where: { RefreshTokenHash: hash },
        include: {
          Pessoa: {
            include: {
              Unidade: {
                select: {
                  UnidadeId: true,
                  UnidadeNome: true,
                  UnidadeStatus: true
                }
              }
            }
          }
        }
      });

      if (!registro) {
        return res.status(401).json({ error: 'Refresh token inválido' });
      }

      if (registro.RefreshTokenRevogado) {
        // Token já foi usado/rotacionado. Indício de reuso ou vazamento.
        // Por segurança, revogamos TODOS os refresh tokens desta pessoa.
        await prisma.refreshToken.updateMany({
          where: { PessoaId: registro.PessoaId, RefreshTokenRevogado: false },
          data: { RefreshTokenRevogado: true }
        });
        await gravarLog(
          registro.PessoaId,
          'REFRESHTOKENREUSO',
          'PESSOA',
          `Tentativa de reuso de refresh token revogado. Todos os tokens da pessoa foram revogados.`,
          registro.PessoaId
        );
        return res.status(401).json({ error: 'Refresh token já utilizado. Faça login novamente.' });
      }

      if (registro.RefreshTokenExpiraEm < new Date()) {
        return res.status(401).json({ error: 'Refresh token expirado. Faça login novamente.' });
      }

      const pessoa = registro.Pessoa;
      if (!pessoa || pessoa.PessoaStatus !== 'ATIVA') {
        return res.status(403).json({ error: 'Conta inativa ou bloqueada' });
      }
      if (pessoa.Unidade.UnidadeStatus !== 'ATIVA') {
        return res.status(403).json({ error: 'Unidade inativa ou bloqueada' });
      }

      // ============================================
      // Rotação: revoga o atual, cria um novo
      // ============================================
      const novoRefreshBruto = gerarRefreshTokenBruto();
      const novoRefreshHash = hashRefreshToken(novoRefreshBruto);

      // Mantém a janela original de expiração (não estende)
      // Se quiser estender a cada refresh, troque por calcularExpiracaoRefresh(true)
      const novaExpiracao = registro.RefreshTokenExpiraEm;

      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { RefreshTokenId: registro.RefreshTokenId },
          data: {
            RefreshTokenRevogado: true,
            RefreshTokenDtUso: new Date()
          }
        }),
        prisma.refreshToken.create({
          data: {
            RefreshTokenHash: novoRefreshHash,
            PessoaId: pessoa.PessoaId,
            RefreshTokenExpiraEm: novaExpiracao,
            RefreshTokenUserAgent: (req.headers['user-agent'] || '').slice(0, 500),
            RefreshTokenIp: req.ip || req.connection?.remoteAddress || null
          }
        })
      ]);

      // ============================================
      // Novo access token
      // ============================================
      const novoAccessToken = gerarAccessToken({
        usuarioId: pessoa.PessoaId,
        usuarioTipo: 'PESSOA',
        usuarioEmail: pessoa.PessoaEmail,
        usuarioNome: pessoa.PessoaNome,
        unidadeId: pessoa.UnidadeId
      });

      return res.status(200).json({
        data: {
          token: novoAccessToken,
          refreshToken: novoRefreshBruto,
          expiraEm: novaExpiracao.toISOString()
        }
      });
    } catch (error) {
      console.error('Erro no refresh da pessoa:', error);
      return res.status(500).json({ error: 'Erro ao renovar sessão' });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken && typeof refreshToken === 'string') {
        const hash = hashRefreshToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: { RefreshTokenHash: hash },
          data: { RefreshTokenRevogado: true }
        });
      }

      return res.status(200).json({ message: 'Logout realizado' });
    } catch (error) {
      console.error('Erro no logout:', error);
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
  }
}

module.exports = new AuthController();
