import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'user_model.dart';
import 'user_type.dart'; // Importe o enum UserType

enum ThemeModeOption { system, light, dark }

class ThemeModel extends ChangeNotifier {
  late SharedPreferences _prefs;
  ThemeModeOption _themeMode = ThemeModeOption.system;
  double _fontSizeScale = 1.0;
  UserProfile? _currentUser;

  ThemeModeOption get themeMode => _themeMode;
  double get fontSizeScale => _fontSizeScale;
  UserProfile? get currentUser => _currentUser;

  // NOVO: Getter que converte role para UserType
  UserType get userType {
    if (_currentUser?.role == 'technician') {
      return UserType.technician;
    } else {
      return UserType.citizen;
    }
  }

  ThemeModel() {
    _init();
  }

  Future<void> _init() async {
    _prefs = await SharedPreferences.getInstance();
    final modeStr = _prefs.getString('themeMode') ?? 'system';
    _themeMode = ThemeModeOption.values.firstWhere(
      (e) => e.name == modeStr,
      orElse: () => ThemeModeOption.system,
    );
    _fontSizeScale = _prefs.getDouble('fontSizeScale') ?? 1.0;
    notifyListeners();
  }

  void setThemeMode(ThemeModeOption mode) {
    _themeMode = mode;
    _prefs.setString('themeMode', mode.name);
    notifyListeners();
  }

  void setFontSize(double scale) {
    _fontSizeScale = scale;
    _prefs.setDouble('fontSizeScale', _fontSizeScale);
    notifyListeners();
  }

  void setCurrentUser(UserProfile user) {
    _currentUser = user;

    debugPrint('✅ ThemeModel: Usuário logado! ID: ${user.id}, Role: ${user.role}');

    notifyListeners();
  }

  void clearCurrentUser() {
    _currentUser = null;
    notifyListeners();
  }

  Brightness get currentBrightness {
    if (_themeMode == ThemeModeOption.system) {
      return WidgetsBinding.instance.platformDispatcher.platformBrightness;
    }
    return _themeMode == ThemeModeOption.dark ? Brightness.dark : Brightness.light;
  }

  bool get isDark => currentBrightness == Brightness.dark;
}