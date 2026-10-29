// src/controllers/authController.js
const prisma = require('../prisma');
const {
  gerarAccessToken,
  gerarRefreshTokenBruto,
  hashRefreshToken,
} = require('../utils/tokenUtils');
const { gravarLog } = require('../utils/logGrava');

// ============================================================
// Helpers — resolvem o "dono" do refresh token
// ============================================================

/**
 * Busca o usuário correspondente ao refresh token, junto com a Unidade
 * (quando aplicável). Retorna { usuario, valido, motivoInvalido }.
 */
async function buscarDonoDoToken(vinculo, usuarioId) {
  switch (vinculo) {
    case 'PESSOA': {
      const pessoa = await prisma.pessoa.findUnique({
        where: { PessoaId: usuarioId },
        include: { Unidade: true },
      });
      if (!pessoa) return { usuario: null, valido: false, motivo: 'Conta não encontrada' };
      if (pessoa.PessoaStatus !== 'ATIVA')
        return { usuario: pessoa, valido: false, motivo: 'Conta inativa ou bloqueada' };
      if (!pessoa.Unidade || pessoa.Unidade.UnidadeStatus !== 'ATIVA')
        return { usuario: pessoa, valido: false, motivo: 'Unidade inativa ou bloqueada' };
      return { usuario: pessoa, valido: true };
    }

    case 'TECNICO': {
      const tecnico = await prisma.tecnico.findUnique({
        where: { TecnicoId: usuarioId },
        include: { Unidade: true },
      });
      if (!tecnico) return { usuario: null, valido: false, motivo: 'Conta não encontrada' };
      if (tecnico.TecnicoStatus !== 'ATIVO')
        return { usuario: tecnico, valido: false, motivo: 'Conta inativa ou bloqueada' };
      if (!tecnico.Unidade || tecnico.Unidade.UnidadeStatus !== 'ATIVA')
        return { usuario: tecnico, valido: false, motivo: 'Unidade inativa ou bloqueada' };
      return { usuario: tecnico, valido: true };
    }

    case 'GESTOR': {
      const gestor = await prisma.gestor.findUnique({
        where: { GestorId: usuarioId },
        include: { Unidade: true },
      });
      if (!gestor) return { usuario: null, valido: false, motivo: 'Conta não encontrada' };
      if (gestor.GestorStatus !== 'ATIVO')
        return { usuario: gestor, valido: false, motivo: 'Conta inativa ou bloqueada' };
      if (!gestor.Unidade || gestor.Unidade.UnidadeStatus !== 'ATIVA')
        return { usuario: gestor, valido: false, motivo: 'Unidade inativa ou bloqueada' };
      return { usuario: gestor, valido: true };
    }

    case 'ADMINISTRADOR': {
      // AdministradorId é Int
      const adminId = parseInt(usuarioId);
      if (isNaN(adminId))
        return { usuario: null, valido: false, motivo: 'ID de administrador inválido' };
      const admin = await prisma.administrador.findUnique({
        where: { AdministradorId: adminId },
      });
      if (!admin) return { usuario: null, valido: false, motivo: 'Conta não encontrada' };
      if (admin.AdministradorStatus !== 'ATIVO')
        return { usuario: admin, valido: false, motivo: 'Conta inativa ou bloqueada' };
      return { usuario: admin, valido: true };
    }

    default:
      return { usuario: null, valido: false, motivo: 'Vínculo de usuário desconhecido' };
  }
}

/**
 * Monta o payload do JWT (access token) com os campos específicos
 * de cada tipo de usuário.
 */
function montarPayloadAccess(vinculo, usuario) {
  switch (vinculo) {
    case 'PESSOA':
      return {
        usuarioId: usuario.PessoaId,
        usuarioTipo: 'PESSOA',
        usuarioEmail: usuario.PessoaEmail,
        usuarioNome: usuario.PessoaNome,
        unidadeId: usuario.UnidadeId,
      };
    case 'TECNICO':
      return {
        usuarioId: usuario.TecnicoId,
        usuarioTipo: 'TECNICO',
        usuarioEmail: usuario.TecnicoEmail,
        usuarioNome: usuario.TecnicoNome,
        unidadeId: usuario.UnidadeId,
        departamentoId: usuario.DepartamentoId,
      };
    case 'GESTOR':
      return {
        usuarioId: usuario.GestorId,
        usuarioTipo: 'GESTOR',
        usuarioEmail: usuario.GestorEmail,
        usuarioNome: usuario.GestorNome,
        unidadeId: usuario.UnidadeId,
        gestorNivel: usuario.GestorNivel,
      };
    case 'ADMINISTRADOR':
      return {
        usuarioId: usuario.AdministradorId,
        usuarioTipo: 'ADMINISTRADOR',
        usuarioNome: usuario.AdministradorNome,
        usuarioUsuario: usuario.AdministradorUsuario,
      };
    default:
      return null;
  }
}

// ============================================================
// Controller
// ============================================================
class AuthController {
  // ============================================================
  // POST /api/auth/refresh
  // Body: { refreshToken: "<hex>" }
  // ============================================================
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      console.log('Chegouuuuuuuuuuuuuuuuuuuuuuu');

      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ error: 'Refresh token é obrigatório' });
      }

      const hash = hashRefreshToken(refreshToken);

      const registro = await prisma.refreshToken.findUnique({
        where: { RefreshTokenHash: hash },
      });

      if (!registro) {
        return res.status(401).json({ error: 'Refresh token inválido' });
      }

      // ---------- Reuso de token já revogado ----------
      if (registro.RefreshTokenRevogado) {
        // Revoga TODOS os tokens do mesmo usuário (proteção contra vazamento)
        await prisma.refreshToken.updateMany({
          where: {
            RefreshUsuarioId: registro.RefreshUsuarioId,
            RefreshUsuarioVinculo: registro.RefreshUsuarioVinculo,
            RefreshTokenRevogado: false,
          },
          data: { RefreshTokenRevogado: true },
        });

        await gravarLog(
          registro.RefreshUsuarioId,
          'REFRESHTOKENREUSO',
          registro.RefreshUsuarioVinculo,
          `Tentativa de reuso de refresh token revogado. Todos os tokens deste usuário foram revogados.`,
          registro.RefreshUsuarioId,
        );

        //console.log('Refresh token já utilizado. Faça login novamente.');
        return res
          .status(401)
          .json({ error: 'Refresh token já utilizado. Faça login novamente.' });
      }

      // ---------- Expirado ----------
      if (registro.RefreshTokenExpiraEm < new Date()) {
        //console.log('Refresh token expirado. Faça login novamente.');
        return res
          .status(401)
          .json({ error: 'Refresh token expirado. Faça login novamente.' });
      }

      // ---------- Buscar o dono ----------
      const { usuario, valido, motivo } = await buscarDonoDoToken(
        registro.RefreshUsuarioVinculo,
        registro.RefreshUsuarioId,
      );

      if (!valido) {
        //console.log('Conta inválida');
        return res.status(403).json({ error: motivo || 'Conta inválida' });
      }

      // ---------- Rotação ----------
      const novoRefreshBruto = gerarRefreshTokenBruto();
      const novoRefreshHash = hashRefreshToken(novoRefreshBruto);

      // Mantém a janela original de expiração (não estende)
      const novaExpiracao = registro.RefreshTokenExpiraEm;

      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { RefreshTokenId: registro.RefreshTokenId },
          data: {
            RefreshTokenRevogado: true,
            RefreshTokenDtUso: new Date(),
          },
        }),
        prisma.refreshToken.create({
          data: {
            RefreshTokenHash: novoRefreshHash,
            RefreshUsuarioId: registro.RefreshUsuarioId,
            RefreshUsuarioVinculo: registro.RefreshUsuarioVinculo,
            RefreshTokenExpiraEm: novaExpiracao,
            RefreshTokenUserAgent: (req.headers['user-agent'] || '').slice(0, 500),
            RefreshTokenIp: req.ip || req.connection?.remoteAddress || null,
          },
        }),
      ]);

      // ---------- Novo access token ----------
      const payload = montarPayloadAccess(registro.RefreshUsuarioVinculo, usuario);
      if (!payload) {
        //console.log('Tipo de usuário desconhecido');
        return res.status(500).json({ error: 'Tipo de usuário desconhecido' });
      }

      const novoAccessToken = gerarAccessToken(payload);

      console.log('Tudo certo kkkkkkkkkkkkkkkkkkkkkkkk');
      return res.status(200).json({
        data: {
          token: novoAccessToken,
          refreshToken: novoRefreshBruto,
          expiraEm: novaExpiracao.toISOString(),
          tipo: registro.RefreshUsuarioVinculo,
        },
      });
    } catch (error) {
      console.error('Erro no refresh:', error);
      return res.status(500).json({ error: 'Erro ao renovar sessão' });
    }
  }

  // ============================================================
  // POST /api/auth/logout
  // Body: { refreshToken: "<hex>" }
  // ============================================================
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken && typeof refreshToken === 'string') {
        const hash = hashRefreshToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: { RefreshTokenHash: hash },
          data: { RefreshTokenRevogado: true },
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