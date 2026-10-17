<picture>
  <source media="(prefers-color-scheme: light)" srcset="_assets/banners/banner-topo-claro.webp">
  <img src="_assets/banners/banner-topo.webp" alt="G.W.E.N.: Gestão de Wellness, Eficiência e Navegação" width="100%">
</picture>

<div align="center">

### Seu ambiente de trabalho em um clique. Sua pausa levada a sério.

![Tipo](https://img.shields.io/badge/tipo-aplicativo-FF22D6?style=for-the-badge)
![Status](https://img.shields.io/badge/status-beta-972FFF?style=for-the-badge)
![Escopo](https://img.shields.io/badge/escopo-pessoal-171717?style=for-the-badge)
![Plataforma](https://img.shields.io/badge/plataforma-windows-171717?style=for-the-badge)
![Versão](https://img.shields.io/badge/versão-0.1.0-171717?style=for-the-badge)

![Tauri](https://img.shields.io/badge/Tauri%202-171717?style=flat-square&logo=tauri&logoColor=FFC131)
![React](https://img.shields.io/badge/React%2019-171717?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-171717?style=flat-square&logo=vite&logoColor=A78BFA)
![Tailwind](https://img.shields.io/badge/Tailwind%204-171717?style=flat-square&logo=tailwindcss&logoColor=06B6D4)
![Supabase](https://img.shields.io/badge/Supabase-171717?style=flat-square&logo=supabase&logoColor=3ECF8E)
![Rust](https://img.shields.io/badge/Rust-171717?style=flat-square&logo=rust&logoColor=E8E4DE)

[Sobre](#-sobre-o-projeto) · [Funcionalidades](#-funcionalidades) · [Como rodar](#-como-rodar) · [Como usar](#-como-usar) · [Temas](#-temas) · [Estrutura](#-estrutura) · [Roadmap](#-roadmap)

</div>

---

### $ sobre o projeto

A **G.W.E.N.** (*Gestão de Wellness, Eficiência e Navegação*) é um assistente desktop para quem trabalha com muitos projetos ao mesmo tempo.

Todo dia o ritual é o mesmo: abrir o VS Code na pasta certa, o terminal no diretório certo, o Jira, o Confluence, o repositório. Depois de horas, não dá para saber quanto tempo foi para cada projeto, e a pausa vira culpa. A G.W.E.N. junta essas três coisas num lugar só: **abre o ambiente de cada projeto com um clique**, **conta o tempo dedicado a cada um** e **trata a pausa como parte do trabalho**.

A ideia nasceu de um post sobre hubs de desenvolvimento e foi adaptada para um fluxo com várias ferramentas, não vários editores. O cuidado com o descanso é o que diferencia: a barra de pausa enche em vez de contar para trás.

> Projeto pessoal em uso diário. Cada versão nasce de uma necessidade real de quem usa.

<div align="center">
  <img src="_assets/prints/dashboard-noir.png" alt="Dashboard da G.W.E.N. no tema Noir" width="100%">
</div>

### $ funcionalidades

| Recurso | O que faz |
|---|---|
| **Login** | Conta com e-mail e senha. Projetos, tempos e aparência ficam na nuvem. |
| **Categorias** | Agrupe por área (Mestrado, Freela, Pessoais...). Cada uma mostra o tempo da semana. |
| **Projetos** | Status, descrição, várias pastas e vários links por projeto. |
| **Codar agora** | Abre as pastas e links marcados como "abrir junto" e inicia a sessão de tempo. |
| **Pastas com ação** | Cada pasta abre no VS Code, no Explorer ou no Git Bash. |
| **Sessões de tempo** | Tempo por projeto, categoria, dia e semana. Projetos concluídos no ano. |
| **Modo pausa** | Café, refeição, leitura, respiro. A tela escurece e a barra de energia enche. |
| **Sessão esquecida** | Se o app fechar com uma sessão rodando, ele pergunta quanto tempo foi de verdade. |
| **Temas** | Noir (a identidade do sistema) ou Personalizado por HEX/JSON. Estilo Moderno ou Terminal. |

<table>
<tr>
<td width="50%"><img src="_assets/prints/modo-pausa.png" alt="Modo pausa"></td>
<td width="50%"><img src="_assets/prints/projeto-form.png" alt="Cadastro de projeto"></td>
</tr>
<tr>
<td align="center"><sub>Modo pausa: a barra enche, não conta para trás</sub></td>
<td align="center"><sub>Cada pasta com a sua ação</sub></td>
</tr>
</table>

### $ como rodar

#### 1. Pré-requisitos (Windows)

Confira no terminal:

```bash
node -v          # 20 ou mais
yarn -v
rustc --version
cargo --version
code --version   # necessário para o Codar agora abrir o VS Code
```

| Se faltar | Como resolver |
|---|---|
| Node.js | Instale a versão LTS em [nodejs.org](https://nodejs.org) |
| Yarn | `npm install -g yarn` |
| Rust | Instale pelo [rustup.rs](https://rustup.rs) com as opções padrão |
| Build Tools | No instalador do Visual Studio Build Tools, marque **Desenvolvimento para desktop com C++** |
| Comando `code` | No VS Code: `Ctrl+Shift+P` > *Shell Command: Install 'code' command in PATH* |
| WebView2 | Já vem no Windows 10 e 11 |

#### 2. Banco de dados (Supabase)

As tabelas ficam num schema próprio, o `gwen`. Então dá para usar **um projeto Supabase que você já tem** para outro app, sem criar um novo e sem conflito de nomes.

1. Abra o projeto no [supabase.com](https://supabase.com) (um existente ou um novo).
2. Em **SQL Editor > New query**, cole todo o [`supabase/migrations/001_gwen_init.sql`](supabase/migrations/001_gwen_init.sql) e clique em **Run**.
3. Em **Project Settings > Data API > Exposed schemas**, adicione `gwen` e salve. Sem isso a API responde que o schema não existe.
4. Copie `.env.example` para `.env` e preencha com os dados de **Project Settings > API**:

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   VITE_SUPABASE_SCHEMA=gwen
   ```

5. *Opcional:* em **Authentication > Sign In / Providers > Email**, desligue **Confirm email** para a conta entrar direto depois do cadastro. Se o projeto for compartilhado, isso vale para os outros apps dele também.

> O login (`auth.users`) é do projeto inteiro: a mesma conta funciona em todos os apps que usam aquele projeto. Os dados da G.W.E.N. ficam isolados no schema `gwen`, com RLS.

#### 3. Rodando

```bash
yarn          # instala as dependências
yarn app      # abre a G.W.E.N. como app desktop
```

A primeira execução compila o Rust e leva alguns minutos. As próximas são rápidas.

| Comando | O que faz |
|---|---|
| `yarn app` | Abre o app desktop em modo desenvolvimento |
| `yarn dev` | Só a interface, no navegador (`localhost:1420`). Pastas não abrem, só aparecem no console. |
| `yarn app:build` | Gera o instalador em `src-tauri/target/release/bundle/` (`.exe` e `.msi`) |

### $ como usar

1. **Crie categorias** no `+` da lateral. Com uma categoria selecionada, aparecem os botões de renomear e excluir. Excluir não apaga os projetos: eles vão para "Sem categoria".
2. **Cadastre um projeto** em *Novo projeto*. O ícone de pasta abre o seletor do Windows. Escolha a ação de cada pasta e marque **abrir junto** no que deve abrir com o *Codar agora*. A mesma pasta pode entrar duas vezes, uma no VS Code e outra no Git Bash.
3. **Codar agora** abre tudo e inicia a sessão. O timer aparece na barra superior. Começar outro projeto encerra o atual. Projetos em *ideia* ou *pausado* passam para *em andamento*.
4. **Pausa** fica na barra superior. A barra enche até o tempo de recarga de cada tipo (café 10 min, refeição 45, leitura 25, respiro 5), mas chegar a 100% não encerra nada.

**Como o tempo é contado:** a sessão vai do *Codar agora* ao *Encerrar*, menos as pausas. Hoje e semana (a partir de segunda) contam só a parte que caiu no período. Com o app aberto, ele registra um sinal por minuto. Se abrir e encontrar uma sessão sem sinal há mais de 15 minutos, pergunta se encerra no último sinal, se você informa os minutos ou se continua (e o tempo com o app fechado entra como pausa).

> A V1 mede o tempo que você marcou, não o tempo real dentro de cada programa. A detecção de janela ativa está no roadmap.

### $ temas

A identidade da G.W.E.N. é **Noir**: preto, branco e cinzas, do logo ao wallpaper. Qualquer outra identidade é de quem usa, criada no tema **Personalizado** em **Configurações > Aparência**. Cor e estilo são escolhas independentes.

| Cores | | Estilo | |
|---|---|---|---|
| **Noir** | identidade do sistema | **Moderno** | cantos arredondados, vidro na navegação e na pausa |
| **Personalizado** | 9 tokens por HEX, com nome | **Terminal** | tudo em mono, cantos retos, botões `[ assim ]` |

<table>
<tr>
<td width="50%"><img src="_assets/prints/dashboard-terminal.png" alt="Noir + Terminal"></td>
<td width="50%"><img src="_assets/prints/dashboard-personalizado.png" alt="Tema personalizado"></td>
</tr>
<tr>
<td align="center"><sub>Noir + Terminal</sub></td>
<td align="center"><sub>Personalizado com uma identidade de usuário</sub></td>
</tr>
</table>

**Compartilhando temas:** o Personalizado tem *copiar JSON* e *colar JSON*. O formato é este (as chaves `onPhosphor` e `onEmber` são opcionais e forçam a cor do texto sobre os acentos; sem elas, o app escolhe pelo maior contraste):

```json
{
  "gwenTheme": 1,
  "name": "Meu tema",
  "void": "#0B0B0B",
  "surface": "#141413",
  "surfaceAlt": "#1A1A18",
  "phosphor": "#972fff",
  "ember": "#ff22d6",
  "bone": "#E8E4DE",
  "muted": "#6B6B63",
  "rule": "#252523",
  "ruleLight": "#2E2E2A",
  "onPhosphor": "#FFFFFF",
  "onEmber": "#FFFFFF"
}
```

No Personalizado, o logo usa o acento principal no corpo e o secundário na carga. No Noir, é branco com a carga em cinza. O painel do login mantém o wallpaper e o logo Noir em qualquer tema, porque é a cara do sistema.

Os derivados dos tokens (`--c-phosphor-12`, `--c-void-veil`...) usam `color-mix`, então acompanham qualquer tema sem configuração extra.

### $ estrutura

```text
gwen/
├── src/
│   ├── components/      sidebar, topbar, cards, formulário, pausa, logo
│   ├── context/         auth, workspace (dados e sessões), toasts
│   ├── data/            repository.js: toda conversa com o Supabase
│   ├── lib/             temas, tempo, estatísticas, ponte com o Rust
│   ├── pages/           login, dashboard, configurações
│   └── styles/          tokens e estilos Moderno/Terminal
├── src-tauri/
│   ├── src/lib.rs       comandos nativos: abrir VS Code, Explorer, Git Bash
│   ├── app-icon.svg     fonte do ícone (yarn tauri icon src-tauri/app-icon.svg)
│   └── tauri.conf.json
├── supabase/            migração SQL com RLS
├── _assets/             banners, prints e gerador dos banners (com o wallpaper)
└── README.md
```

**Decisões que valem registro:**

- **Repository pattern:** trocar o backend ou adicionar cache local mexe só em `src/data/repository.js`.
- **Rust mínimo:** o lado nativo só faz o que o navegador não pode. Links usam o plugin `opener` do Tauri.
- **Vidro só na navegação e na pausa:** cards e listas são sólidos para não atrapalhar a leitura.
- **Context API:** suficiente para a V1. Se crescer, migra para Redux Toolkit sem mudar quem usa `useWorkspace` e `useAuth`.

### $ limitações

- Caminhos de pasta são por máquina. Em outro computador, a pasta pode não existir (o app avisa).
- Login só com e-mail e senha. Google OAuth em desktop precisa de deep link.
- Uma sessão por vez.
- Precisa de internet para salvar e carregar dados.

### $ roadmap

- [x] **V0.1** · launcher, categorias, sessões, modo pausa, temas
- [ ] **V0.2** · detecção automática da janela ativa (tempo real em cada programa)
- [ ] **V0.3** · widget flutuante "sempre no topo" com timer e energia
- [ ] **V0.4** · modo saúde opcional: água, alongamento, check-in de humor, alerta de excesso
- [ ] Histórico por mês e ano · dias sem uso como descanso · Google OAuth · modo offline

<div align="center">

*Uma sessão de cada vez. Uma pausa de cada vez.*

Feito por [Samara Silvia](https://github.com/SamaraSilvia81) · [@devs_sam](https://instagram.com/devs_sam)

</div>

<picture>
  <source media="(prefers-color-scheme: light)" srcset="_assets/banners/banner-rodape-claro.webp">
  <img src="_assets/banners/banner-rodape.webp" alt="G.W.E.N. · rodapé" width="100%">
</picture>
