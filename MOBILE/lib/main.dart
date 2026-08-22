import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'models/theme_model.dart';
import 'screens/shared/login_screen.dart';
import 'models/user_provider.dart'; // Importe o seu UserProvider aqui

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModel()),
        // CORREÇÃO: Adicionado o UserProvider na árvore global
        ChangeNotifierProvider(create: (_) => UserProvider()),
      ],
      child: Builder(
        builder: (context) {
          // O Provider agora consegue encontrar ambos os modelos abaixo deste Builder
          final themeModel = Provider.of<ThemeModel>(context);
          final brightness = themeModel.currentBrightness;

          return MaterialApp(
            title: 'CDCP',
            debugShowCheckedModeBanner: false, // Opcional: limpa a faixa de debug
            themeMode: brightness == Brightness.light
                ? ThemeMode.light
                : ThemeMode.dark,
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
            home: const LoginScreen(),
          );
        },
      ),
    );
  }
}