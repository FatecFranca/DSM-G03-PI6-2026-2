# DSM-P3-G09-2025-1
Repositório do GRUPO 03 do Projeto Interdisciplinar do 6º semestre DSM 2026/2. Alunos: Cláudio de Melo Júnior, João Vitor Nicolau e Luís Pedro Dutra Carrocini.

---
<br>

# PI 6° Semestre - Sistema de Chamados Públicos

Este projeto é o sexto PI (Projeto Interdisciplinar) do curso de DSM (Desenvolvimento de Software Multiplataforma) da Faculdade de Tecnologia Fatec Franca Dr. Thomaz Novelino. Seu objetivo é integrar os conhecimentos adquiridos nas principais disciplinas do sexto semestre: Computação em Nuvem II, Laborátorio de Desenvolvimento Multiplataforma e Mineração de Dados. O resultado é um aplicativo desenvolvido em Flutter, cuja o objetivo é que pessoas comuns (cidadãos) façam a criação de chamados/suportes de necessidades na cidade a suas respectivas prefeituras. Após a criação do mesmo, haverá um PLN (Processamento de Linguagem Natural) que obterá os dados necessário para classificação do chamado, que serão enviados para o modelo de IA (Inteligência Artificaila) que irá classificar a urgência do chamado, de acordo com descrição do problema passada pelo cidadão e processada pelo PLN. Aparecendo posteriormente os chamados em um painel administrativo (Web), onde os gestores de chamados irão atribui-los aos técnicos que poderão acompanhar e documentar as atividades no seu aplicativo móvel.

<br>

## 📄 Descrição

### Mobile

O aplicativo apresenta as seguintes telas e funcionalidades:

#### Usuário não logado:
* **Login**: Permite o acesso do usuário à sua área, desde que informe seu CPF (Cidadão) ou Usuário (Técnico) e senha corretamente.
* **Solicitação**: Permite que o usuário (cidadão) faça solicitação de cadastro de usuário am alguma unidade ou faça solicitações diversas. Permitindo também ao usuário (técnico) fazer também solicitações diversas a unidade.

#### Usuário logado (Cidadão):
* **Home**: Exibe os chamados abertos para o usuário, permitindo alterar determinadas informações de acordo com o status do chamado. 
* **Criar Chamado**: Permite a criação de chamados, informando a descrição detalhada do problema e necessidade, o tipo de chamado, os dias em que esse problema/necessidade existe, se ele causa algum risco a vidas humanas, ou de animais, ou se ele bloqueia allguma rua/via/avenida.
* **Dados do usuário**: Exibe os dados do usuário, cadastrados pelos gerenciadores da prefeitura, com opção de edição de alguns dados específicos.
* **Manual/Ajuda**: Tela do aplicativo que explica ao usuário as funcionalidades do APP, e fluxo dos chamados.

### Web

O gerenciamento Web apresenta as seguintes telas e funcionalidades:

#### Usuário não logado:
* **Login**: Permite o acesso do gestor à sua área, desde que informe seu usuário e senha corretamente.

#### Usuário logado (Gestor ADMUNIDADE):
* **Dashboard**: Exibe os chamados umlevantamento simples dos chamados abertos para unidade, bem como os técnicos, cidadãos e gestores cadastrados na unidade. 
* **Chamados**: Exibe todos os chamados da unidade, de acordo com o filtro selecionado, podendo editar/visualizar algumas informações de cada chamado.
* **Tipos de Chamdo**: Exibe todos os tipos de chamdo cadastrados, podendo gerencia-los.
* **Equipes**: Exibe todas as equipes de técnicos cadastradas, podendo gerencia-las.
* **Pessoas**: Exibe todas pessoas/cidadãos cadastradas, podendo gerencia-las.
* **Gestores**: Exibe todos os gestores cadastrados, podendo o Gestor ADMUNIDADE editar as suas informações ou inativa-los, somente o Gestor ADMUNIDADE tem acesso a essa tela.
* **Departamentos**: Exibe todos os departamentos cadastrados, podendo gerencia-los.

### Níveis de acesso do usuário:
* **Gestor da Unidade**: Nível mais alto. Pode gerenciar todos os outros níveis de usuários cadastrados no sistema, que sejam da mesma unidade que a sua. Também pode fazer o gerenciamento dos chamados abertos. Um Gestor da Unidade não pode criar outro de mesmo nível, essa criação de licença é feita pelos gerenciados da aplicação somente. Seu acesso é somente ao painel administrativo (Web), não podendo entrar com o mesmo cadastro no APP.
* **Gestor Comum**: Tem as mesmas permissões que o Gestor da Unidade, somente não pode gerenciar outros gestores de mesmo nível ou superior. Seu acesso é somente ao painel administrativo (Web), não podendo entrar com o mesmo cadastro no APP.
* **Técnico**: Pode incluir atividades nos chamados ao qual ele esteja envolvido pelas suas equipes, também podendo conclui-los. Seu acesso é somente ao aplicativo, em uma área exclusiva para técnicos, não podendo criar chamados com as mesmas credenciais.
* **Pessoa/Cidadão**: Pode fazer a criação de chamados, além de acompanhar o desenvolvimento deles. Seu acesso é somente ao aplicativo, em uma área exclusiva para os cidadãos.

### Fluxo dos chamados:
<img src="/PRINTS/fluxo-chamados.jpg">

### Diagrama Entidade Relacionamento:
<img src="/PRINTS/der-bd.png">

### Modelo Lógico - BD:
<img src="/PRINTS/modelo-logico.png">

### Diagrama Caso de Uso:
<img src="/PRINTS/diagrama-caso-uso.png">

### 📕 [Levantamento de Requisitos](https://github.com/FatecFranca/DSM-G06-PI4-2025-2/raw/main/CDCP-Levantamento-Requisitos.pdf?raw=1)

### 📕 [Documentação Treinamento Modelo IA (CART)](https://github.com/FatecFranca/DSM-G06-PI4-2025-2/raw/main/Documentacao-Processamento-Completo.pdf?raw=1)

### 📕 [Justificativa Mensageria e Mineração de Dados](https://github.com/FatecFranca/DSM-G06-PI4-2025-2/raw/main/Justificativa-Mensageria-MD.pdf?raw=1)

### 🎬 [Elevator Pitch](https://github.com/FatecFranca/DSM-G06-PI4-2025-2/raw/main/Documentacao-Processamento-Completo?raw=1)

<br>

## 📦 Aparência

### Mobile
#### Login
<img src="/PRINTS/mobile/mobile-login.png">

#### Abertura Solicitações
<img src="/PRINTS/mobile/mobile-cidadao-solicitacao.png">

#### Home (Cidadão)
<img src="/PRINTS/mobile/mobile-cidadao-dashboard.png">

#### Chamados (Cidadão)
<img src="/PRINTS/mobile/mobile-cidadao-chamado.png">

#### Ajuda (Cidadão)
<img src="/PRINTS/mobile/mobile-cidadao-ajuda.png">

#### Perfil (Cidadão)
<img src="/PRINTS/mobile/mobile-cidadao-perfil.png">

#### Home/Chamados (Técnico)
<img src="/PRINTS/mobile/mobile-tecnico1.png">

#### Chamados/Perfil (Técnico)
<img src="/PRINTS/mobile/mobile-tecnico2.png">

### Web (Painel Administrativo)
#### Login
<img src="/PRINTS/web/login-light.png">
<img src="/PRINTS/web/login-dark.png">

#### Dashboard
<img src="/PRINTS/web/dashboard-light1.png">
<img src="/PRINTS/web/dashboard-light2.png">

#### Chamados
<img src="/PRINTS/web/chamados-light1.png">
<img src="/PRINTS/web/chamados-light2.png">
<img src="/PRINTS/web/chamados-light3.png">
<img src="/PRINTS/web/chamados-light4.png">

#### Tipos de Chamado
<img src="/PRINTS/web/tipo-chamado-light.png">

#### Equipes
<img src="/PRINTS/web/equipe-light.png">

#### Técnicos
<img src="/PRINTS/web/tecnico-light.png">

#### Pessoas
<img src="/PRINTS/web/pessoa-light.png">

#### Gestores
<img src="/PRINTS/web/gestor-light.png">

#### Departamentos
<img src="/PRINTS/web/departamento-light.png">

<br><br>

## 🛠️ Construído com

**Ferramentas:**
* Visual Studio Code - Editor de código-fonte
* Miro - Diagramas
* Drawio - Diagramas
* Isomnia - Testes de API (Back-End)
* Figma - Protótipos da aplicação
* IA's (DeepSeek, Gemini, ChatGPT e Qwen) - Consultas para crição de códigos diversos, correção de bugs e melhoria em performance

**Linguagens e Tecnologias:**
* Flutter - Framework para o desenvolvimento do APP (dart)
* Next.js - Framework para o desenvolvimento Web (js)
* Node.js - Framework para o desenvolvimento da API (js)
* PostGreSQL - Banco de dados
* Prisma ORM - Interface com o banco de dados
* CART - Modelo de IA para classificação (python)
* DEFINIR - Processamento de Linguagem Natural (python)
* RabbitMQ - Serviço de mensageria

**Arquitetura:**

| Frontend (Mobile) <br>Visão Cidadão e Técnico | Frontend (Web) <br>Visão Gestores e Administrador Sistema |
| :---: | :---: |
| Flutter/Dart  | Next.js  |
| Validação de credenciais  | Validação de credenciais  |
| Telas especificas para cidadãos e técnicos  | Páginas separadas para gestores e administrador  |
| (Cidadão) <br>Abertura e acompanhamento de chamados  | (Gestores) <br>Gerenciamento de todos os recursos relacionados as tratativas com chamados da unidade e gerenciamento dos chamados  |
| (Técnico) <br>Registro de atividades e conclusão do chamado  | (Administrador Sistema) <br>Gerenciamento dos gestores administradores, unidades e tipos de chamados  |

<br>

| Backend | Banco de Dados |
| :---: | :---: |
| API REST | Banco de Dados Relacional |
| Node.js | PostgreSQL |
| Estrutura de Controller e Routes | Armazena todos os dados da aplicação |
| Regras de negócio | Armazena históricos e logs da aplicação |
| Comunicação com o Banco de Dados | Realiza comunicação tanto com a API como com os modelos de IA para registros e alterações |
| Integração com mensageria | --- |

<br>

| Mensageria | Inteligência <br>(IA / PLN / Mineração de Dados) |
| :---: | :---: |
| Utilizada para chamadas da API a execuções dos modelos de PLN, IA e Mineração de Dados | (DEFINIR - PLN) <br>Para mapeamento de informações base do chamado conforme descrição usadas na classificação de urgência |
| RabbitMQ | (IA - CART) <br>Para classificação de urgência |
| Hospedado na mesma VM onde se hospedará a API, WEB e modelos de classificação e mineração | (Mineração de dados) <br>Agrupamento/Clustering |

<br>

**Estrutura (API):**

```
DSM-G03-PI6-2026-2/
├── API/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │── src/
│   │   ├── controllers/
│   |   │   ├── adminController.js
│   |   │   ├── atividadeChamadoController.js
│   |   │   ├── chamadoController.js
│   |   │   ├── departamentoController.js
│   |   │   ├── equipeController.js
│   |   │   ├── gestorController.js
│   |   │   ├── pessoaController.js
│   |   │   ├── solicitacaoController.js
│   |   │   ├── tecnicoController.js
│   |   │   ├── tipoSuporteController.js
│   |   │   └── unidadeController.js
│   |   ├── ia/
│   |   │   └── modelo_cart.pkl
│   |   ├── middlewares/
│   |   │   └── authMiddleware.js
│   |   ├── routes/
│   |   │   ├── adminRouter.js
│   |   │   ├── atividadeChamadoRouter.js
│   |   │   ├── chamadoRouter.js
│   |   │   ├── departamentoRouter.js
│   |   │   ├── equipeRouter.js
│   |   │   ├── gestorRouter.js
│   |   │   ├── pessoaRouter.js
│   |   │   ├── solicitacaoRouter.js
│   |   │   ├── tecnicoRouter.js
│   |   │   ├── tipoSuporteRouter.js
│   |   │   └── unidadeRouter.js
│   |   ├── services/
│   |   │   ├── classificador.js
│   |   │   └── classificadorPool.js
│   |   ├── utils/
│   |   │   ├── dataBrasilObter.js.js
│   |   │   └── logGrava.js.js
│   |   ├── app.js
│   |   ├── prisma.jsc
│   |   ├── server.js
│   |   └── swaggerConfig.js
│   └── .env
```

**Estrutura (WEB):**

```
DSM-G03-PI6-2026-2/
├── WEB/
│   ├── app/
│   │   ├── admin/
│   |   │   ├── autenticado/
│   |   │   │   ├── dashboard/
│   |   │   │   │   └── page.tsx
│   |   │   │   ├── gestores/
│   |   │   │   ├── perfil/
│   |   │   │   ├── tiposChamados/
│   |   │   │   ├── unidades/
│   |   │   │   └── layout.tsx
│   |   │   ├── login/
│   |   │   └── page.tsx
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── gestor/
│   |   │   ├── autenticado/
│   |   │   │   ├── chamados/
│   |   │   │   ├── dashboard/
│   |   │   │   │   └── page.tsx
│   |   │   │   ├── departamentos/
│   |   │   │   ├── equipes/
│   |   │   │   ├── gestores/
│   |   │   │   ├── perfil/
│   |   │   │   ├── pessoas/
│   |   │   │   ├── solicitacoes/
│   |   │   │   ├── tecnicos/
│   |   │   │   ├── tiposChamados/
│   |   │   │   └── layout.tsx
│   |   │   ├── login/
│   |   │   │   └── page.tsx
│   |   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │── lib/
│   |   ├── api.ts
│   |   ├── chamado-service.ts
│   |   ├── dashboard-service.ts
│   |   ├── departamento-service.ts
│   |   ├── equipe-service.ts
│   |   ├── gestor-service.ts
│   |   ├── gestor-unidade-service.ts
│   |   ├── pessoa-service.ts
│   |   ├── solicitacao-service.ts
│   |   ├── tecnico-service.ts
│   |   ├── tipoSuporte-service.ts
│   |   └── unidade-service.ts
│   │── middleware.ts
│   └── .env.local
```

**Estrutura (MOBILE):**

```
DSM-G03-PI6-2026-2/
├── MOBILE/
│   └── lib/
│       ├── models/
│       │   ├── call_model.dart
│       │   ├── theme_model.dart
│       │   ├── user_model.dart
│       │   ├── user_provider.dart
│       │   ├── user_type.dart
│       │   └── user.dart
│       ├── screens/
│       │       ├── citizen/
│       │       │   ├── c_calls_screen.dart
│       │       │   ├── c_home_screen.dart
│       │       │   ├── manual_screen.dart
│       │       │   └── new_call_screen.tsx
│       │       ├── shered/
│       │       │   ├── components/
│       │       │   │   └── bottom_nav_bar.dart
│       │       │   ├── create_request_screen.dart
│       │       │   ├── login_screen.dart
│       │       │   └── profile_settings_screen.tsx
│       │       └── technician/
│       │           ├── call_activities_screen.dart
│       │           ├── new_call_description_screen.dart
│       │           ├── t_calls_screen.dart
│       │           └── t_home_screen.tsx
│       ├── config.dart
│       └── main.dart
```

## 📋 Pré-requisitos

Para o funcionamento pleno do site é necessário:

* Um navegador com suporte a JavaScript e acesso à internet.
* Ter o banco de dados PostGreSQL instalado localmente ou acessível na nuvem (ajustes no SGBD podem ser necessários conforme o ambiente).

<br>

## 🔧 Instalação

1. Baixe os arquivos e pastas deste repositório e coloque-os em uma pasta local.
2. Certifique-se de estar conectado à internet.
3. Ative o JavaScript em seu navegador.
4. Na pasta API execute: (npm install)
5. Depois, ainda na pasta, crie o arquivo (.env) se baseando no (.exemple-env)
6. Configure nele o acesso ao banco de dados
7. Execute na pasta API os seguintes comandos para criar o BD, na sequencia: npx prisma generate -> npx prisma db push
8. Execute na pasta API/scripts-mostrar após configurar o PEPPER no arquivo (criptografarSenha.js): node scripts-mostrar/criptografarSenha.js
9. Copie o hash retornado
10. Acesse o seu BD pelo terminal ou PgAdm para inserir um usuário Administrado do sistema
11. Execute a Query no BD:  insert into "Administrador" ("AdministradorUsuario", "AdministradorSenha") values ('USUARIO', 'hashdasenhagerado');
12. Execute a API: npm start
13. Na pasta de WEB/web-next execute: (npm install)
14. Depois, ainda na pasta, crie o arquivo (.env) se baseando no (.exemple-env)
15. Depois execute para testes locais: npm run dev
16. Caso queira gerar a versão ja compilada, execute: npm run build -> npm start
17. Acesse na URL: http://seuipoulocalhost:porta/admin
18. Entre com as credenciais de ADM
19. Crie uma unidade e gestor e depois acesse com as credencias do mesmo: http://seuipoulocalhost:porta/gestor
20. Para o mobile, acesse a pasta Mobile
21. É preciso ter o SDK da versão correta configurado na máquina
22. Execute: flutter pub get
23. Depois, com algum emulador conectado, execute: flutter run

<br>

## ✒️ Autores

* **[Cláudio de Melo Júnior](https://github.com/Claudio-Fatec)** — Documentação, Treinamento Modelo IA;
* **[João Vitor Nicolau](https://github.com/Joao-Vitor-Nicolau-dos-Santos)** — Desenvolvimento Mobile;
* **[Luís Pedro Dutra Carrocini](https://github.com/luis-pedro-dutra-carrocini)** — Desenvolvimento API/BD, Desenvolvimento Web;

<br>

## 🎁 Agradecimentos

Agradecemos aos professores que nos acompanharam no curso, e durante esse semestre inteiro, transmitindo seus conhecimentos para nós. Somos gratos especialmente aos das disciplinas fundamentais para este projeto:

* **Prof. Fábio Medeiros Faria** — Computação em Nuvem II;
* **[Prof. Alexandre Gomes da Silva](https://github.com/XandyGomes)** — Laborátorio de Desenvolvimento Multiplataforma;
* **Prof. Jaqueline Brigladori Pugliesi** — Mineração de Dados;

---

Este projeto foi desenvolvido no início de nossa jornada acadêmica. Temos orgulho deste projeto por ser um dos nossos primeiros e o último do curso — e o primeiro com Mineração de Dados e Mensageria! Releve nosso "código de iniciante" 😊.  
Esperamos que seja útil para você em algum projeto! ❤️
