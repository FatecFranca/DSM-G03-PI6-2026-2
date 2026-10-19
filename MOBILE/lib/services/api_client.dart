// lib/services/api_client.dart
import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import 'auth_service.dart';

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  final _auth = AuthService.instance;

  // Garante que apenas UM refresh aconteça por vez, mesmo com várias
  // requests em paralelo batendo em 401 ao mesmo tempo.
  Future<bool>? _refreshEmAndamento;

  // ============================================================
  // GET / POST / PUT / DELETE genéricos
  // ============================================================
  Future<http.Response> get(String path, {Map<String, String>? headers}) {
    return _executar(
      (h) => http.get(Uri.parse('${AppConfig.baseUrl}$path'), headers: h),
      headers: headers,
      temCorpo: false,
    );
  }

  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, String>? headers,
  }) {
    return _executar(
      (h) => http.post(
        Uri.parse('${AppConfig.baseUrl}$path'),
        headers: h,
        body: body != null ? jsonEncode(body) : null,
      ),
      headers: headers,
      temCorpo: body != null,
    );
  }

  Future<http.Response> put(
    String path, {
    Object? body,
    Map<String, String>? headers,
  }) {
    return _executar(
      (h) => http.put(
        Uri.parse('${AppConfig.baseUrl}$path'),
        headers: h,
        body: body != null ? jsonEncode(body) : null,
      ),
      headers: headers,
      temCorpo: body != null,
    );
  }

  Future<http.Response> patch(
    String path, {
    Object? body,
    Map<String, String>? headers,
  }) {
    return _executar(
      (h) => http.patch(
        Uri.parse('${AppConfig.baseUrl}$path'),
        headers: h,
        body: body != null ? jsonEncode(body) : null,
      ),
      headers: headers,
      temCorpo: body != null,
    );
  }

  Future<http.Response> delete(String path, {Map<String, String>? headers}) {
    return _executar(
      (h) => http.delete(Uri.parse('${AppConfig.baseUrl}$path'), headers: h),
      headers: headers,
      temCorpo: false,
    );
  }

  // ============================================================
  // Núcleo: executar, detectar 401, tentar refresh, repetir
  // ============================================================
  Future<http.Response> _executar(
    Future<http.Response> Function(Map<String, String> headers) request, {
    Map<String, String>? headers,
    required bool temCorpo,
  }) async {
    final h = _montarHeaders(extras: headers, temCorpo: temCorpo);
    var response = await request(h).timeout(const Duration(seconds: 20));

    // Se não for 401, retorna como está
    if (response.statusCode != 401) return response;

    // Verifica se o corpo indica "token expirado" (vs. token inválido)
    bool deveTentarRefresh = false;
    try {
      final body = jsonDecode(response.body);
      deveTentarRefresh = body['codigo'] == 'TOKEN_EXPIRADO';
    } catch (_) {
      // Corpo não é JSON — assume que não deve refrescar
    }

    if (!deveTentarRefresh) return response;

    // Tenta o refresh (uma vez, compartilhado entre requests concorrentes)
    final refrescou = await _refreshCompartilhado();
    if (!refrescou) return response; // devolve o 401 original

    // Refaz a request com o novo access token
    final h2 = _montarHeaders(extras: headers, temCorpo: temCorpo);
    response = await request(h2).timeout(const Duration(seconds: 20));
    return response;
  }

  // ============================================================
  // Monta os headers comuns a toda requisição.
  // - "Accept" sempre presente (indica que esperamos JSON de volta).
  // - "Content-Type" só quando há corpo (POST/PUT/PATCH com body).
  // - "Authorization" quando há token em memória.
  // - Headers extras passados pelo chamador sobrescrevem os defaults.
  // ============================================================
  Map<String, String> _montarHeaders({
    Map<String, String>? extras,
    required bool temCorpo,
  }) {
    final h = <String, String>{'Accept': 'application/json'};

    if (temCorpo) {
      h['Content-Type'] = 'application/json';
    }

    final token = _auth.accessToken;
    if (token != null) {
      h['Authorization'] = 'Bearer $token';
    }

    if (extras != null) h.addAll(extras);
    return h;
  }

  Future<bool> _refreshCompartilhado() async {
    if (_refreshEmAndamento != null) return _refreshEmAndamento!;

    _refreshEmAndamento = _auth.tentarRefresh().whenComplete(() {
      _refreshEmAndamento = null;
    });

    return _refreshEmAndamento!;
  }
}
