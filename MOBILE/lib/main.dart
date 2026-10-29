// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'models/theme_model.dart';
import 'models/user_provider.dart';
import 'navigation.dart';
import 'screens/shared/auth_gate.dart';
import 'screens/shared/login_screen.dart';
import 'screens/shared/components/bottom_nav_bar.dart';
import 'services/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.instance.carregar();

  final themeModel = ThemeModel();
  final userRestaurado = AuthService.instance.currentUser;
  if (userRestaurado != null) {
    themeModel.setCurrentUser(userRestaurado);
  }

  runApp(MyApp(themeModel: themeModel));
}

class MyApp extends StatelessWidget {
  final ThemeModel themeModel;
  const MyApp({super.key, required this.themeModel});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<ThemeModel>.value(value: themeModel),
        ChangeNotifierProvider(create: (_) => UserProvider()),
      ],
      child: const AuthGate(child: _AppShell()),
    );
  }
}

/// Constrói o MaterialApp. Reconstruído quando o tema muda,
/// mas o AuthGate acima preserva o listener do Stream.
class _AppShell extends StatelessWidget {
  const _AppShell();

  @override
  Widget build(BuildContext context) {
    final themeModel = Provider.of<ThemeModel>(context);
    final brightness = themeModel.currentBrightness;

    return MaterialApp(
      title: 'CDCP',
      debugShowCheckedModeBanner: false,
      navigatorKey: globalNavKey,
      themeMode:
          brightness == Brightness.light ? ThemeMode.light : ThemeMode.dark,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.indigo,
          brightness: Brightness.light,
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.indigo,
          brightness: Brightness.dark,
        ),
      ),
      // ⚠️ SEM AuthGate aqui — o AuthGate está acima do MaterialApp
      home: const _HomeResolver(),
    );
  }
}

class _HomeResolver extends StatelessWidget {
  const _HomeResolver();

  @override
  Widget build(BuildContext context) {
    final auth = AuthService.instance;
    if (!auth.temSessao) return const LoginScreen();

    // Sincroniza o ThemeModel com o user restaurado
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;
      final tm = Provider.of<ThemeModel>(context, listen: false);
      if (tm.currentUser?.id != auth.currentUser?.id) {
        tm.setCurrentUser(auth.currentUser);
      }
    });

    return const BottomNavBarScreen();
  }
}