// lib/services/auth_service.dart
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user_model.dart';
import '../../services/api_client.dart';

import 'package:http/http.dart' as http;
import '../config.dart';

/// Motivo pelo qual a sessão foi encerrada.
/// Permite ao widget raiz decidir o que mostrar (ex.: mensagem diferente
/// para "expirado" vs. "logout voluntário").
enum SessaoEncerradaMotivo { expirada, logout, invalida }

class AuthService extends ChangeNotifier {
  AuthService._();
  static final AuthService instance = AuthService._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _keyAccessToken = 'auth_access_token';
  static const _keyRefreshToken = 'auth_refresh_token';
  static const _keyExpiraEm = 'auth_expira_em';
  static const _keyManterLogado = 'auth_manter_logado';

  String? _accessToken;
  String? _refreshToken;
  DateTime? _expiraEm;
  bool _manterLogado = false;

  UserProfile? _currentUser;

  UserProfile? get currentUser => _currentUser;

  /// Disparado quando a sessão cai por qualquer motivo.
  /// O widget raiz escuta e navega para a tela de login.
  final StreamController<SessaoEncerradaMotivo> _sessaoEncerradaCtrl =
      StreamController<SessaoEncerradaMotivo>.broadcast();

  Stream<SessaoEncerradaMotivo> get onSessaoEncerrada =>
      _sessaoEncerradaCtrl.stream;

  // ============================================================
  // Getters
  // ============================================================
  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  bool get temSessao =>
      _refreshToken != null &&
      _expiraEm != null &&
      _currentUser != null;

  bool get accessTokenExpirado {
    if (_accessToken == null) return true;
    return DateTime.now().isAfter(
      _decodificarExpiracaoAccessToken() ?? DateTime.now(),
    );
  }

  // ============================================================
  // Carregar tokens guardados (chamado no boot do app)
  // ============================================================
  Future<void> carregar() async {
    final prefs = await SharedPreferences.getInstance();

    _refreshToken = await _storage.read(key: _keyRefreshToken);
    _accessToken = await _storage.read(key: _keyAccessToken);

    final expiraStr = prefs.getString(_keyExpiraEm);
    _expiraEm = expiraStr != null ? DateTime.tryParse(expiraStr) : null;

    _manterLogado = prefs.getBool(_keyManterLogado) ?? false;

    // Se o refresh já expirou, limpa tudo e não tenta buscar o usuário
    if (_expiraEm != null && _expiraEm!.isBefore(DateTime.now())) {
      await _limparInterno();
      notifyListeners();
      return;
    }

    // ✅ Se tem sessão, busca o usuário atual na API
    if (_refreshToken != null && _accessToken != null) {
      await _buscarUsuarioAtual();
    }

    notifyListeners();
  }

  /// Busca `/me` no backend para reidratar o `UserProfile`.
  /// Detecta o tipo a partir do access token (PESSOA vs TECNICO).
  Future<void> _buscarUsuarioAtual() async {
    try {
      final tipo = _extrairTipoDoAccessToken();
      final endpoint = switch (tipo) {
        'PESSOA' => '/api/pessoa/me',
        'TECNICO' => '/api/tecnico/me',
        _ => null,
      };

      if (endpoint == null) {
        debugPrint('⚠️ Tipo de usuário desconhecido no token');
        await _limparENotificar(SessaoEncerradaMotivo.invalida);
        return;
      }

      final response = await ApiClient.instance.get(endpoint);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        _currentUser = UserProfile.fromJson(json);
        debugPrint('✅ UserProfile restaurado: ${_currentUser?.name}');
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        debugPrint('🔒 /me rejeitado (${response.statusCode}). Limpando sessão.');
        await _limparENotificar(SessaoEncerradaMotivo.expirada);
      } else {
        debugPrint('⚠️ /me retornou ${response.statusCode}. Mantendo sessão sem user.');
      }
    } catch (e) {
      debugPrint('⚠️ Erro ao buscar /me: $e');
      // Não derruba a sessão por erro de rede — o próximo request resolve
    }
  }

  // ============================================================
  // Login (pessoa)
  // ============================================================
  Future<UserProfile> login({
    required String cpf,
    required String senha,
    required bool manterLogado,
  }) async {
    final response = await ApiClient.instance.post(
      '/api/pessoa/login',
      body: {
        'PessoaUsuario': cpf,
        'PessoaSenha': senha,
        'manterLogado': manterLogado,
      },
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Erro ao realizar login');
    }

    final data = jsonDecode(response.body);
    final payload = data['data'];

    await _salvarTokens(
      accessToken: payload['token'],
      refreshToken: payload['refreshToken'],
      expiraEm: DateTime.parse(payload['expiraEm']),
      manterLogado: manterLogado,
    );

    _currentUser = UserProfile.fromJson(data);
    notifyListeners();
    return _currentUser!;
  }

  // ============================================================
  // Login (técnico)
  // ============================================================
  Future<UserProfile> loginTecnico({
    required String usuario,
    required String senha,
    required bool manterLogado,
  }) async {
    final response = await ApiClient.instance.post(
      '/api/tecnico/login',
      body: {
        'TecnicoUsuario': usuario,
        'TecnicoSenha': senha,
        'manterLogado': manterLogado,
      },
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Erro ao realizar login');
    }

    final resposta = jsonDecode(response.body);
    final payload = resposta['data'];
    

    await _salvarTokens(
      accessToken: payload['token'],
      refreshToken: payload['refreshToken'],
      expiraEm: DateTime.parse(payload['expiraEm']),
      manterLogado: manterLogado,
    );

    _currentUser = UserProfile.fromJson(resposta);
    notifyListeners();
    return _currentUser!;
  }

  // ============================================================
  // Refresh
  // ============================================================
  Future<bool> tentarRefresh() async {
    if (_refreshToken == null) return false;

    try {
      final response = await http
          .post(
            Uri.parse('${AppConfig.baseUrl}/api/auth/refresh'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refreshToken': _refreshToken}),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body)['data'];
        await _salvarTokens(
          accessToken: data['token'],
          refreshToken: data['refreshToken'],
          expiraEm: DateTime.parse(data['expiraEm']),
          manterLogado: _manterLogado,
        );
        // ✅ Se ainda não temos o UserProfile em memória, busca agora
        if (_currentUser == null) {
          await _buscarUsuarioAtual();
        }
        return true;
      }

      if (response.statusCode == 401 || response.statusCode == 403) {
        debugPrint('🔒 Refresh rejeitado (${response.statusCode}). Sessão expirada.');
        await _limparENotificar(SessaoEncerradaMotivo.expirada);
        return false;
      }

      debugPrint('⚠️ Refresh falhou com ${response.statusCode}. Mantendo sessão.');
      return false;
    } catch (e) {
      debugPrint('⚠️ Erro de rede no refresh: $e');
      return false;
    }
  }

  // ============================================================
  // Logout (voluntário)
  // ============================================================
  Future<void> logout() async {
    debugPrint('🚪 AuthService.logout() iniciou');
    try {
      if (_refreshToken != null) {
        debugPrint('🚪 Enviando refresh token para /api/auth/logout');
        await ApiClient.instance.post(
          '/api/auth/logout',
          body: {'refreshToken': _refreshToken},
        );
        debugPrint('🚪 Backend respondeu');
      } else {
        debugPrint('⚠️ Sem refreshToken — pulando chamada ao backend');
      }
    } catch (e) {
      debugPrint('⚠️ Erro no logout remoto: $e');
    }
    debugPrint('🚪 Chamando _limparENotificar');
    await _limparENotificar(SessaoEncerradaMotivo.logout);
    debugPrint('🚪 _limparENotificar retornou');
  }

  // ============================================================
  // Helper: extrai o `usuarioTipo` do access token (sem validar assinatura)
  // ============================================================
  String? _extrairTipoDoAccessToken() {
    final token = _accessToken;
    if (token == null) return null;

    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      final payload = utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      );
      final json = jsonDecode(payload) as Map<String, dynamic>;
      return json['usuarioTipo'] as String?;
    } catch (_) {
      return null;
    }
  }

  // ============================================================
  // Helpers
  // ============================================================
  Future<void> _salvarTokens({
    required String accessToken,
    required String refreshToken,
    required DateTime expiraEm,
    required bool manterLogado,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _expiraEm = expiraEm;
    _manterLogado = manterLogado;

    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyExpiraEm, expiraEm.toIso8601String());
    await prefs.setBool(_keyManterLogado, manterLogado);

    notifyListeners();
  }

  /// Limpa sem notificar — usado no boot quando a sessão já estava vencida.
  Future<void> _limparInterno() async {
    _accessToken = null;
    _refreshToken = null;
    _expiraEm = null;
    _manterLogado = false;
    _currentUser = null;

    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyExpiraEm);
    await prefs.remove(_keyManterLogado);
  }

  /// Limpa E notifica o widget raiz para navegar ao login.
  Future<void> _limparENotificar(SessaoEncerradaMotivo motivo) async {
    debugPrint('🧹 _limparENotificar: $motivo');
    await _limparInterno();
    debugPrint('🧹 Limpou o storage');

    notifyListeners();
    debugPrint('🧹 notifyListeners chamado');

    if (_sessaoEncerradaCtrl.isClosed) {
      debugPrint('❌ StreamController FECHADO — não vai emitir');
      return;
    }
    debugPrint('📤 hasListener: ${_sessaoEncerradaCtrl.hasListener}');

    _sessaoEncerradaCtrl.add(motivo);
    debugPrint('📤 Evento emitido');
  }

  /// Chamado pelo widget raiz para limpar a sessão manualmente (opcional).
  Future<void> forcarLogout() =>
      _limparENotificar(SessaoEncerradaMotivo.logout);

  // Decodifica o JWT sem validar assinatura só para pegar o "exp"
  DateTime? _decodificarExpiracaoAccessToken() {
    final token = _accessToken;
    if (token == null) return null;

    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      final payload = utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      );
      final json = jsonDecode(payload) as Map<String, dynamic>;

      final exp = json['exp'];
      if (exp is! int) return null;

      return DateTime.fromMillisecondsSinceEpoch(
        exp * 1000,
      ).subtract(const Duration(seconds: 30));
    } catch (_) {
      return null;
    }
  }

  /*
  @override
  void dispose() {
    _sessaoEncerradaCtrl.close();
    super.dispose();
  }
  */
}
