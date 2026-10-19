// lib/services/auth_service.dart
import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
//import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

//import '../config.dart';
import '../models/user_model.dart';
import '../../services/api_client.dart';

class AuthService {
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

  // ============================================================
  // Getters
  // ============================================================
  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  bool get temSessao => _refreshToken != null && _expiraEm != null;

  bool get accessTokenExpirado {
    if (_accessToken == null) return true;
    // Margem de 30s para evitar corrida com o clock do servidor
    return DateTime.now().isAfter(
      // Não temos a expiração do access token isoladamente; usamos um decoder
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

    // Se o refresh expirou, limpa tudo
    if (_expiraEm != null && _expiraEm!.isBefore(DateTime.now())) {
      await limpar();
    }
  }

  // ============================================================
  // Login
  // ============================================================
  Future<UserProfile> login({
    required String cpf,
    required String senha,
    required bool manterLogado,
  }) async {
    /*
    final response = await http
        .post(
          Uri.parse('${AppConfig.baseUrl}/api/pessoa/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'PessoaUsuario': cpf,
            'PessoaSenha': senha,
            'manterLogado': manterLogado,
          }),
        )
        .timeout(const Duration(seconds: 15));
    */

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

    // ✅ Fonte única de verdade — o `fromJson` já lê `data['tipo']` = 'PESSOA'
    return UserProfile.fromJson(data);
  }

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

    // ✅ Fonte única — mesmo padrão do login da pessoa
    return UserProfile.fromJson(resposta);
  }

  // ============================================================
  // Refresh
  // ============================================================
  Future<bool> tentarRefresh() async {
    if (_refreshToken == null) return false;

    try {
      /*
      final response = await http
          .post(
            Uri.parse('${AppConfig.baseUrl}/api/pessoa/refresh'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refreshToken': _refreshToken}),
          )
          .timeout(const Duration(seconds: 15));
      */

      final response = await ApiClient.instance.post(
        '/api/auth/refresh', // era /api/pessoa/refresh
        body: {'refreshToken': _refreshToken},
      );

      if (response.statusCode != 200) {
        // Refresh inválido/expirado — limpa sessão
        await limpar();
        return false;
      }

      final data = jsonDecode(response.body)['data'];

      await _salvarTokens(
        accessToken: data['token'],
        refreshToken: data['refreshToken'],
        expiraEm: DateTime.parse(data['expiraEm']),
        manterLogado: _manterLogado, // mantém a preferência
      );

      return true;
    } catch (e) {
      print('Erro no refresh: $e');
      return false;
    }
  }

  // ============================================================
  // Logout
  // ============================================================
  Future<void> logout() async {
    try {
      if (_refreshToken != null) {
        /*
        await http
            .post(
              Uri.parse('${AppConfig.baseUrl}/api/pessoa/logout'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({'refreshToken': _refreshToken}),
            )
            .timeout(const Duration(seconds: 10));
        */

        await ApiClient.instance.post(
          '/api/auth/logout', // era /api/pessoa/logout
          body: {'refreshToken': _refreshToken},
        );
      }
    } catch (_) {
      // Ignora erro de rede no logout — limpa localmente de todo jeito
    }
    await limpar();
  }

  // ============================================================
  // Helpers privados
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
  }

  Future<void> limpar() async {
    _accessToken = null;
    _refreshToken = null;
    _expiraEm = null;

    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyExpiraEm);
    await prefs.remove(_keyManterLogado);
  }

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

      // Margem de 30s para evitar race com o servidor
      return DateTime.fromMillisecondsSinceEpoch(
        exp * 1000,
      ).subtract(const Duration(seconds: 30));
    } catch (_) {
      return null;
    }
  }
}
