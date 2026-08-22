# DSM-P3-G09-2025-1
Repositório do GRUPO 03 do Projeto Interdisciplinar do 6º semestre DSM 2026/2. Alunos: Cláudio de Melo Júnior, João Vitor Nicolau e Luís Pedro Dutra Carrocini.

---
<br>

# PI 5° Semestre - Sistema de Chamados Públicos

Este projeto é o sexto PI (Projeto Interdisciplinar) do curso de DSM (Desenvolvimento de Software Multiplataforma) da Faculdade de Tecnologia Fatec Franca Dr. Thomaz Novelino. Seu objetivo é integrar os conhecimentos adquiridos nas principais disciplinas do sexto semestre: Computação em Nuvem II, Laborátorio de Desenvolvimento Multiplataforma e Mineração de Dados. O resultado é um aplicativo desenvolvido em Flutter, cuja o objetivo é que pessoas comuns (cidadãos) façam a criação de chamados/suportes de necessidades na cidade a suas respectivas prefeituras. Após a criação do mesmo, haverá um PLN (Processamento de Linguagem Natural) que obterá os dados necessário para classificação do chamado, que serão enviados para o modelo de IA (Inteligência Artificaila) que irá classificar a urgência do chamado, de acordo com descrição do problema passada pelo cidadão e processada pelo PLN. Aparecendo posteriormente os chamados em um painel administrativo (Web), onde os gestores de chamados irão atribui-los aos técnicos que poderão acompanhar e documentar as atividades no seu aplicativo móvel.

<br>

## 📄 Descrição

O aplicativo apresenta as seguintes telas e funcionalidades:

### Usuário não logado:
* **Login**: Permite o acesso do usuário à sua área, desde que informe seu CPF (Cidadão) ou Usuário (Técnico) e senha corretamente.

### Usuário logado (Pessoas/Cidadão):
* **Home**: Exibe os chamados abertos para o usuário, permitindo alterar determinadas informações de acordo com o status do chamado. 
* **Criar Chamado**: Permite a criação de chamados, informando a descrição detalhada do problema e necessidade, o tipo de chamado, os dias em que esse problema/necessidade existe, se ele causa algum risco a vidas humanas, ou de animais, ou se ele bloqueia allguma rua/via/avenida.
* **Dados do usuário**: Exibe os dados do usuário, cadastrados pelos gerenciadores da prefeitura, com opção de edição de alguns dados específicos.
* **Manual/Ajuda**: Tela do aplicativo que explica ao usuário as funcionalidades do APP, e fluxo dos chamados.

O gerenciamento Web apresenta as seguintes telas e funcionalidades:

### Usuário não logado:
* **Login**: Permite o acesso do gestor à sua área, desde que informe seu usuário e senha corretamente.

### Usuário logado (Gestor ADMUNIDADE):
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
<img src="/PRINTS/fluxo-chamados.png">


## 🎬 [Vídeo de Apresentação](https://youtu.be/JnMI5b-C7w4)

## 📦 Aparência

### Mobile
#### Cidadão
<img src="/PRINTS/mobile/cidadao1.png">
<img src="/PRINTS/mobile/cidadao2.png">

#### Técnico
<img src="/PRINTS/mobile/tecnico.png">

### Web (Painel Administrativo)
#### Login
<img src="/PRINTS/web/login-dark.png">

<img src="/PRINTS/web/login-light.png">

#### Dashboard
<img src="/PRINTS/web/dashboard-dark1.png">
<img src="/PRINTS/web/dashboard-dark2.png">

<img src="/PRINTS/web/dashboard-light1.png">
<img src="/PRINTS/web/dashboard-light2.png">

#### Chamados
<img src="/PRINTS/web/chamados-dark1.png">
<img src="/PRINTS/web/chamados-dark2.png">
<img src="/PRINTS/web/chamados-dark3.png">
<img src="/PRINTS/web/chamados-dark4.png">

<img src="/PRINTS/web/chamados-light1.png">
<img src="/PRINTS/web/chamados-light2.png">
<img src="/PRINTS/web/chamados-light3.png">
<img src="/PRINTS/web/chamados-light4.png">

#### Tipos de Chamado
<img src="/PRINTS/web/tipo-chamado-dark.png">

<img src="/PRINTS/web/tipo-chamado-light.png">

#### Equipes
<img src="/PRINTS/web/equipe-dark.png">

<img src="/PRINTS/web/equipe-light.png">

#### Técnicos
<img src="/PRINTS/web/tecnico-dark.png">

<img src="/PRINTS/web/tecnico-light.png">

#### Pessoas
<img src="/PRINTS/web/pessoa-dark.png">

<img src="/PRINTS/web/pessoa-light.png">

#### Gestores
<img src="/PRINTS/web/gestor-dark.png">

<img src="/PRINTS/web/gestor-light.png">

#### Departamentos
<img src="/PRINTS/web/departamento-ddark.png">

<img src="/PRINTS/web/departamento-light.png">

<br><br>

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

## 🛠️ Construído com

**Ferramentas:**
* Visual Studio Code - Editor de código-fonte
* Miro - Diagramas
* Isomnia - Testes de API (Back-End)
* Figma - Protótipos da aplicação
* IA's (DeepSeek, Gemini, ChatGPT e Qwen) - Consultas para crição de códigos diversos, correção de bugs e melhoria em performance

**Linguagens e Tecnologias:**
* Flutter - Framework para o desenvolvimento do APP (dart)
* Next.js - Framework para o desenvolvimento Web (js)
* Node.js - Framework para o desenvolvimento da API (js)
* PostGreSQL - Banco de dados
* Prisma ORM - Interface com o banco de dados

<br>

## ✒️ Autores

* **[Cláudio de Melo Júnior](https://github.com/Claudio-Fatec)** — Documentação, Desenvolvimento IA;
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
