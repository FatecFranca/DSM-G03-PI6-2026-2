import 'package:flutter/material.dart';

/// Provider responsável por gerenciar o estado do usuário logado em todo o app.
class UserProvider with ChangeNotifier {
  // Armazena o objeto de usuário (pode ser seu model UserProfile ou um Map)
  dynamic _user;

  /// Getter para acessar os dados do usuário
  dynamic get user => _user;

  /// Verifica se existe um usuário logado
  bool get isAuthenticated => _user != null;

  /// Define o usuário após o login e notifica todas as telas interessadas
  void setUser(dynamic newUser) {
    _user = newUser;
    
    // O notifyListeners() é o que faz as telas "reagirem" e 
    // pararem de exibir o carregamento assim que o dado chega.
    notifyListeners();
  }

  /// Limpa os dados do usuário (Logout)
  void logout() {
    _user = null;
    notifyListeners();
  }

  String? get token => _user?['token'] ?? _user?.token;
  
  int? get userId => _user?['id'] ?? _user?.id;
  
  String? get pessoaId => _user?['pessoaId'] ?? _user?.pessoaId;
  
  int? get unidadeId => _user?['unidadeId'] ?? _user?.unidadeId;
}