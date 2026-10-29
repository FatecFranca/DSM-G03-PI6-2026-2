import 'dart:async';
import 'package:flutter/material.dart';
import '../../navigation.dart';
import '../../services/auth_service.dart';
import 'login_screen.dart';

class AuthGate extends StatefulWidget {
  final Widget child;
  const AuthGate({super.key, required this.child});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  StreamSubscription<SessaoEncerradaMotivo>? _sub;

  @override
  void initState() {
    super.initState();
    debugPrint('🟢 AuthGate.initState — inscrito');
    _sub = AuthService.instance.onSessaoEncerrada.listen(_onSessaoEncerrada);
  }

  @override
  void dispose() {
    debugPrint('🔴 AuthGate.dispose');
    _sub?.cancel();
    super.dispose();
  }

  void _onSessaoEncerrada(SessaoEncerradaMotivo motivo) {
    debugPrint('🔔 AuthGate recebeu: $motivo');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final nav = globalNavKey.currentState;
      debugPrint('🔔 nav = $nav');
      if (nav == null) {
        debugPrint('❌ globalNavKey.currentState é null');
        return;
      }

      final msg = switch (motivo) {
        SessaoEncerradaMotivo.expirada =>
          'Sua sessão expirou. Faça login novamente.',
        SessaoEncerradaMotivo.invalida =>
          'Sessão inválida. Faça login novamente.',
        SessaoEncerradaMotivo.logout => null,
      };

      if (msg != null) {
        ScaffoldMessenger.of(nav.context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: Colors.orange,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }

      nav.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
      debugPrint('✅ AuthGate: navegou para LoginScreen');
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}