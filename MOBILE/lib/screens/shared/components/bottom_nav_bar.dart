// lib/screens/shared/components/bottom_nav_bar.dart
import 'dart:ui';

import 'package:CDCP/models/theme_model.dart';
import 'package:CDCP/screens/citizen/c_calls_screen.dart';
import 'package:CDCP/screens/citizen/c_home_screen.dart';
import 'package:CDCP/screens/citizen/manual_screen.dart';
import 'package:CDCP/screens/citizen/new_call_screen.dart';
import 'package:CDCP/screens/shared/profile_settings_screen.dart';
import 'package:CDCP/screens/technician/t_calls_screen.dart';
import 'package:CDCP/screens/technician/t_home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:CDCP/services/auth_service.dart';

class BottomNavBarScreen extends StatefulWidget {
  const BottomNavBarScreen({super.key});

  @override
  State<BottomNavBarScreen> createState() => _BottomNavBarScreenState();
}

class _BottomNavBarScreenState extends State<BottomNavBarScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final themeModel = Provider.of<ThemeModel>(context);
    final cs = Theme.of(context).colorScheme;
    final user = themeModel.currentUser;

    // Deriva o tipo do próprio UserProfile — fonte única de verdade.
    // Se o usuário não tem `isTecnico` (ex.: deslogado), assume cidadão.
    final bool isTecnico = user?.isTecnico ?? false;

    final List<Widget> children;
    final List<_NavItemConfig> navItems;

    if (isTecnico) {
      // TÉCNICO: 3 ITENS (0, 1, 2)
      children = [
        const THomeScreen(),
        const TCallsScreen(),
        user != null
            ? ProfileSettingsScreen(user: user)
            : const _SessaoInvalidaScreen(),
      ];
      navItems = const [
        _NavItemConfig(0, Icons.home_outlined, Icons.home_rounded, 'Início'),
        _NavItemConfig(
          1,
          Icons.list_alt_outlined,
          Icons.list_alt_rounded,
          'Chamados',
        ),
        _NavItemConfig(
          2,
          Icons.person_outline_rounded,
          Icons.person_rounded,
          'Perfil',
        ),
      ];
    } else {
      // CIDADÃO: 4 ITENS (0, 1, 2, 3)
      children = [
        const HomeScreen(),
        const CallsScreen(),
        const ManualScreen(),
        user != null
            ? ProfileSettingsScreen(user: user)
            : const _SessaoInvalidaScreen(),
      ];
      navItems = const [
        _NavItemConfig(
          0,
          Icons.grid_view_outlined,
          Icons.grid_view_rounded,
          'Início',
        ),
        _NavItemConfig(
          1,
          Icons.confirmation_number_outlined,
          Icons.confirmation_number_rounded,
          'Chamados',
        ),
        _NavItemConfig(
          2,
          Icons.help_center_outlined,
          Icons.help_center_rounded,
          'Manual',
        ),
        _NavItemConfig(
          3,
          Icons.person_outline_rounded,
          Icons.person_rounded,
          'Perfil',
        ),
      ];
    }

    // Segurança: se o índice selecionado for maior que a lista (ex.: trocou de usuário), reseta
    if (_selectedIndex >= children.length) {
      _selectedIndex = 0;
    }

    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _selectedIndex, children: children),
      bottomNavigationBar: _buildModernNavBar(cs, navItems, isTecnico),
    );
  }

  Widget _buildModernNavBar(
    ColorScheme cs,
    List<_NavItemConfig> navItems,
    bool isTecnico,
  ) {
    return Container(
      padding: const EdgeInsets.only(bottom: 10),
      child: Stack(
        alignment: Alignment.bottomCenter,
        clipBehavior: Clip.none,
        children: [
          Container(
            margin: const EdgeInsets.fromLTRB(18, 0, 18, 24),
            height: 70,
            decoration: BoxDecoration(
              color: cs.surface.withOpacity(0.8),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: Colors.white.withOpacity(0.2),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Ícone 0 e 1 (sempre existem)
                      _buildNavItemFromConfig(navItems[0], cs),
                      _buildNavItemFromConfig(navItems[1], cs),

                      // Espaço central só para cidadão
                      if (!isTecnico) ...[
                        const SizedBox(width: 48),
                        _buildNavItemFromConfig(navItems[2], cs),
                        _buildNavItemFromConfig(navItems[3], cs),
                      ] else ...[
                        _buildNavItemFromConfig(navItems[2], cs),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Botão flutuante só para cidadão
          if (!isTecnico) Positioned(bottom: 45, child: _buildAddButton(cs)),
        ],
      ),
    );
  }

  // Helper para não errar o index
  Widget _buildNavItemFromConfig(_NavItemConfig config, ColorScheme cs) {
    return _buildNavItem(
      config.index,
      config.icon,
      config.activeIcon,
      config.label,
      cs,
    );
  }

  Widget _buildAddButton(ColorScheme cs) {
    return GestureDetector(
      onTap: () async {
        HapticFeedback.heavyImpact();
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const NewCallScreen()),
        );
        setState(() {});
      },
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: cs.surface,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: cs.primary.withOpacity(0.3),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [cs.primary, cs.primary.withBlue(255)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.add_rounded, color: Colors.white, size: 32),
        ),
      ),
    );
  }

  Widget _buildNavItem(
    int index,
    IconData icon,
    IconData activeIcon,
    String label,
    ColorScheme cs,
  ) {
    final isSelected = _selectedIndex == index;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _selectedIndex = index);
      },
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        height: 70,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isSelected
                    ? cs.primary.withOpacity(0.12)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                isSelected ? activeIcon : icon,
                color: isSelected
                    ? cs.primary
                    : cs.onSurfaceVariant.withOpacity(0.6),
                size: 24,
              ),
            ),
            const SizedBox(height: 4),
            AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: isSelected ? 1.0 : 0.0,
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: cs.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItemConfig {
  final int index;
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const _NavItemConfig(this.index, this.icon, this.activeIcon, this.label);
}

class PlaceholderScreen extends StatelessWidget {
  final String title;
  final IconData icon;

  const PlaceholderScreen({super.key, required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 80,
                color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
              ),
              const SizedBox(height: 24),
              Text(
                'Tela de $title',
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Em breve teremos novidades aqui!',
                style: GoogleFonts.inter(fontSize: 14, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SessaoInvalidaScreen extends StatelessWidget {
  const _SessaoInvalidaScreen();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.lock_outline_rounded,
                  size: 72,
                  color: cs.primary.withOpacity(0.5),
                ),
                const SizedBox(height: 24),
                Text(
                  'Sessão inválida',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: cs.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Não foi possível recuperar seus dados. '
                  'Faça login novamente para continuar.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: cs.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton.icon(
                  onPressed: () {
                    AuthService.instance.logout();
                  },
                  icon: const Icon(Icons.login_rounded),
                  label: const Text('Fazer login novamente'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: cs.primary,
                    foregroundColor: cs.onPrimary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 14,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
