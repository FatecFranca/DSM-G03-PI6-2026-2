import 'dart:ui';

import 'package:CDCP/models/theme_model.dart';
import 'package:CDCP/models/user_type.dart';
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

class BottomNavBarScreen extends StatefulWidget {
  final UserType? userType;

  const BottomNavBarScreen({super.key, this.userType});

  @override
  State<BottomNavBarScreen> createState() => _BottomNavBarScreenState();
}

class _BottomNavBarScreenState extends State<BottomNavBarScreen> {
  int _selectedIndex = 0;

@override
Widget build(BuildContext context) {
  final themeModel = Provider.of<ThemeModel>(context);
  final userType = widget.userType ?? themeModel.userType;
  final cs = Theme.of(context).colorScheme;
  final user = themeModel.currentUser;

  // Listas locais para garantir que o index sempre bata com o conteúdo
  final List<Widget> children;
  final List<_NavItemConfig> navItems;

  if (userType == UserType.technician) {
    // TÉCNICO: 3 ITENS (0, 1, 2)
    children = [
      THomeScreen(),
      TCallsScreen(),
      if (user != null) ProfileSettingsScreen(user: user) else const PlaceholderScreen(title: 'Perfil', icon: Icons.person),
    ];
    navItems = [
      _NavItemConfig(0, Icons.home_outlined, Icons.home_rounded, "Início"),
      _NavItemConfig(1, Icons.list_alt_outlined, Icons.list_alt_rounded, "Chamados"),
      _NavItemConfig(2, Icons.person_outline_rounded, Icons.person_rounded, "Perfil"),
    ];
  } else {
    // CIDADÃO: 4 ITENS (0, 1, 2, 3)
    children = [
      const HomeScreen(),
      const CallsScreen(),
      const ManualScreen(),
      if (user != null) ProfileSettingsScreen(user: user) else const PlaceholderScreen(title: 'Perfil', icon: Icons.person),
    ];
    navItems = [
      _NavItemConfig(0, Icons.grid_view_outlined, Icons.grid_view_rounded, "Início"),
      _NavItemConfig(1, Icons.confirmation_number_outlined, Icons.confirmation_number_rounded, "Chamados"),
      _NavItemConfig(2, Icons.help_center_outlined, Icons.help_center_rounded, "Manual"),
      _NavItemConfig(3, Icons.person_outline_rounded, Icons.person_rounded, "Perfil"),
    ];
  }

  // Segurança: se o índice selecionado for maior que a lista disponível (ex: trocou de user), reseta
  if (_selectedIndex >= children.length) {
    _selectedIndex = 0;
  }

  return Scaffold(
    extendBody: true,
    body: IndexedStack(
      index: _selectedIndex,
      children: children,
    ),
    bottomNavigationBar: _buildModernNavBar(cs, navItems, userType),
  );
}

Widget _buildModernNavBar(ColorScheme cs, List<_NavItemConfig> navItems, UserType userType) {
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
            border: Border.all(color: Colors.white.withOpacity(0.2), width: 1.5),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 30, offset: const Offset(0, 10)),
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
                    // Ícone 0 e 1 (Sempre existem)
                    _buildNavItemFromConfig(navItems[0], cs),
                    _buildNavItemFromConfig(navItems[1], cs),

                    // O espaço central só existe para o Cidadão
                    if (userType == UserType.citizen) ...[
                      const SizedBox(width: 48),
                      _buildNavItemFromConfig(navItems[2], cs),
                      _buildNavItemFromConfig(navItems[3], cs),
                    ] else ...[
                      // Se for técnico, só falta o ícone 2 (Perfil)
                      _buildNavItemFromConfig(navItems[2], cs),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
        // Botão flutuante só para cidadão
        if (userType == UserType.citizen)
          Positioned(bottom: 45, child: _buildAddButton(cs)),
      ],
    ),
  );
}

// Helper para não errar o index
Widget _buildNavItemFromConfig(_NavItemConfig config, ColorScheme cs) {
  return _buildNavItem(config.index, config.icon, config.activeIcon, config.label, cs);
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

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label, ColorScheme cs) {
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
                color: isSelected ? cs.primary.withOpacity(0.12) : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                isSelected ? activeIcon : icon,
                color: isSelected ? cs.primary : cs.onSurfaceVariant.withOpacity(0.6),
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

  _NavItemConfig(this.index, this.icon, this.activeIcon, this.label);
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