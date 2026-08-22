import 'user_type.dart';

class User {
  final String id;
  final String name;
  final String email;
  final UserType type;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.type,
  });
}