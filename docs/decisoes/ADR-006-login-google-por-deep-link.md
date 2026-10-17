<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/adr-006-claro.webp">
  <img src="../../_assets/banners/docs/adr-006.webp" alt="ADR-006 · Login com Google por deep link" width="100%">
</picture>

# ADR-006 · Login com Google por deep link

![status](https://img.shields.io/badge/status-aceita-0A0A0B) ![tipo](https://img.shields.io/badge/tipo-registro%20de%20decisão-3A3A3F) ![código](https://img.shields.io/badge/código-ADR--006-5E5E66)

| Campo | Valor |
|---|---|
| Código | `ADR-006` |
| Data | sábado, 17/10/2026 |
| Tipo | Registro de decisão |
| Status | Aceita |
| Decisão de | Samara Silvia |
| Redigido por | Samara Silvia |
| Histórico | [ver alterações](https://github.com/SamaraSilvia81/gwen/commits/main/docs/decisoes/ADR-006-login-google-por-deep-link.md) |

**Sumário**

1. [Contexto](#-contexto)
2. [Decisão](#-decisão)
3. [Alternativas consideradas](#-alternativas-consideradas)
4. [Consequências](#-consequências)
5. [Revisitar quando](#-revisitar-quando)

---

### $ contexto

Login com Google num app desktop é diferente da web. Na web, o Google redireciona de volta para a mesma página. Num app Tauri, o Google precisa abrir no **navegador do sistema** (fazer login dentro de uma webview embutida é bloqueado pelo Google e ensina o usuário a digitar senha em janela que não é do navegador), e depois algo precisa **trazer o resultado de volta para o app**.

O projeto Supabase compartilhado (`apps-tools`, ver [`ADR-002`](ADR-002-schema-proprio-em-projeto-compartilhado.md)) já tem o provedor Google configurado por causa do Sparky Notes.

### $ decisão

- Fluxo **OAuth com PKCE** do Supabase.
- No app: o login abre no navegador padrão e volta por **deep link** para `gwen://auth/callback?code=...`. O app troca o código pela sessão com `exchangeCodeForSession`.
- No navegador (`yarn dev`): redirect normal para `http://localhost:1420/`, e o próprio Supabase lê o código da URL.
- Plugins do Tauri: `deep-link` (registra o esquema `gwen://`) e `single-instance` com a feature `deep-link` (entrega o link para a janela que já está aberta, em vez de abrir uma segunda cópia do app).

```mermaid
sequenceDiagram
  actor S as Você
  participant App as G.W.E.N.
  participant Nav as Navegador
  participant SB as Supabase Auth
  participant G as Google

  S->>App: Entrar com Google
  App->>SB: signInWithOAuth (PKCE, skipBrowserRedirect)
  SB-->>App: URL de autorização
  App->>Nav: abre a URL
  Nav->>G: escolhe a conta
  G->>SB: retorno do Google
  SB->>Nav: redireciona para gwen://auth/callback?code=...
  Nav->>App: Windows entrega o link (single-instance)
  App->>SB: exchangeCodeForSession(code)
  SB-->>App: sessão
```

### $ alternativas consideradas

| Opção | Por que não |
|---|---|
| Login dentro de uma janela do próprio app | O Google bloqueia login em webviews embutidas. Também é pior para segurança |
| Servidor local em `localhost:porta` para receber o retorno | Funciona, mas exige liberar uma porta (ou um padrão de portas) nas Redirect URLs e lidar com porta ocupada. O deep link é o caminho que o Tauri recomenda para desktop |
| Fluxo implícito (token na URL) | PKCE é o padrão atual e não expõe o token na URL |

### $ consequências

- Duas URLs precisam estar em **Authentication > URL Configuration > Redirect URLs** no Supabase: `gwen://auth/callback` e `http://localhost:1420/`.
- No Windows e no Linux o esquema `gwen://` é registrado também em tempo de execução, então o login funciona no `yarn app`, não só no app instalado. Na primeira vez, o navegador pergunta se pode abrir a G.W.E.N.
- O login do Google é compartilhado com o Sparky (mesmo projeto Supabase): a mesma conta entra nos dois.
- O código Rust ganhou o plugin `single-instance`, que precisa ser o **primeiro** a ser registrado.

### $ revisitar quando

- Outros provedores (GitHub, por exemplo) forem pedidos: o fluxo é o mesmo, só muda o `provider`.

---

<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/rodape-claro.webp">
  <img src="../../_assets/banners/docs/rodape.webp" alt="G.W.E.N. · rodapé da documentação" width="100%">
</picture>
