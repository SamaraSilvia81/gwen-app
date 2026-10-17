# Changelog

Todas as mudanças relevantes da G.W.E.N. ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Planejado
- Detecção automática da janela ativa (tempo por programa)
- Widget flutuante "sempre no topo"
- Modo saúde opcional

## [0.2.0] - 2026-10-17

### Adicionado
- Login com Google: no app, abre o navegador e volta pelo deep link `gwen://auth/callback`; no navegador, redirect normal ([`ADR-006`](docs/decisoes/ADR-006-login-google-por-deep-link.md))
- Modo claro, escuro ou seguindo o sistema, com Noir claro oficial ([`ADR-007`](docs/decisoes/ADR-007-modo-claro-como-terceiro-eixo.md))
- Paleta clara opcional no tema Personalizado, também no JSON (bloco `light`)
- Alternância rápida de claro e escuro na barra superior
- Seção Sobre nas Configurações, com autoria, versão e licença
- Migração `002_gwen_modo_claro.sql`

### Alterado
- Supabase em modo PKCE
- Botão do Google no padrão da marca (G colorido, sem o formato de comando do estilo Terminal)

## [0.1.0] - 2026-10-17

Primeira versão beta.

### Adicionado
- Login e cadastro com e-mail e senha (Supabase Auth), com perfil criado no primeiro login
- Categorias com tempo da semana na lateral
- Projetos com status, descrição, várias pastas e vários links
- Ações por pasta: VS Code, Explorer e Git Bash
- **Codar agora**: abre pastas e links marcados e inicia a sessão
- Sessões de tempo com estatísticas de hoje, semana, categoria e projetos concluídos no ano
- Modo pausa com cinco tipos (café, refeição, leitura, respiro, outra) e barra de energia
- Correção de sessão esquecida ao abrir o app
- Identidade Noir, tema Personalizado por HEX com importação e exportação em JSON
- Estilos Moderno e Terminal
- Tabelas no schema `gwen`, para dividir um projeto Supabase com outros apps
- Licença proprietária, todos os direitos reservados ([`LICENSE`](LICENSE), [`NOTICE.md`](NOTICE.md))
- Documentação de arquitetura, modelo de dados e decisões em [`docs/`](docs/)
