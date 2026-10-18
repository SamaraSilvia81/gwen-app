<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/adr-012-claro.webp">
  <img src="../../_assets/banners/docs/adr-012.webp" alt="ADR-012 · Código proprietário" width="100%">
</picture>

# ADR-012 · Código proprietário

![status](https://img.shields.io/badge/status-aceita-0A0A0B) ![tipo](https://img.shields.io/badge/tipo-registro%20de%20decisão-3A3A3F) ![código](https://img.shields.io/badge/código-ADR--012-5E5E66)

| Campo | Valor |
|---|---|
| Código | `ADR-012` |
| Data | domingo, 18/10/2026 |
| Tipo | Registro de decisão |
| Status | Aceita |
| Decisão de | Samara Silvia |
| Redigido por | Samara Silvia |
| Referências | [`ADR-009`](ADR-009-atualizacoes-sem-perder-dados.md), [`ADR-010`](ADR-010-dados-locais-primeiro.md) |
| Histórico | [ver alterações](https://github.com/SamaraSilvia81/gwen-app/commits/main/docs/decisoes/ADR-012-codigo-proprietario.md) |

**Sumário**

1. [Contexto](#-contexto)
2. [Decisão](#-decisão)
3. [Alternativas consideradas](#-alternativas-consideradas)
4. [Consequências](#-consequências)

---

### $ contexto

A G.W.E.N. junta launcher de projetos, tempo por projeto, modo saúde e, nas próximas versões, tarefas, caderno e assistente local. A autora quer ganhar dinheiro com ela e não quer que outras pessoas usem a base para lançar produtos próprios. Uma licença livre permitiria justamente isso: qualquer pessoa poderia modificar, redistribuir e vender, desde que publicasse o código.

Ao mesmo tempo, o código aberto para leitura tem valor de portfólio, e a atualização automática depende de Releases públicas.

### $ decisão

- **Licença proprietária, todos os direitos reservados** ([`LICENSE`](../../LICENSE)). Copiar, modificar, redistribuir, vender ou usar o nome e a identidade visual exige autorização prévia e por escrito da autora.
- **Uso pessoal permitido** para quem recebe o instalador oficial da autora, sem redistribuir.
- **Código público para leitura** no `gwen-app`. Ver o código não dá direito de usar.
- **Releases no próprio `gwen-app`.** Os instaladores e o `latest.json` da atualização automática continuam saindo nas Releases deste repositório ([`ADR-009`](ADR-009-atualizacoes-sem-perder-dados.md)).
- **Landing page em repositório próprio**, só com o site. O botão de download aponta para as Releases do `gwen-app`.

### $ alternativas consideradas

| Opção | Por que não |
|---|---|
| Licença livre (GPL, MIT) | Permite que terceiros modifiquem, redistribuam e vendam a base; não atende o objetivo |
| Licença "source-available" pronta (ex.: PolyForm Strict) | Permite uso não comercial por terceiros; a autora quer que qualquer uso passe por ela |
| Código privado com as Releases num repositório público separado | Esconde o código, mas perde o valor de portfólio e acrescenta um repositório e um token para manter |
| Código privado com as Releases nele | O updater não consegue baixar de repositório privado sem autenticação |

### $ consequências

- **Proteção é jurídica, não técnica:** quem lê o código pode copiar escondido. A licença é o que permite cobrar ou pedir a remoção.
- **A marca vale mais que o código:** registrar o nome G.W.E.N. no INPI protege a identidade de forma independente da licença.
- **Bibliotecas de terceiros** continuam sob as próprias licenças; o [`NOTICE.md`](../../NOTICE.md) deixa isso claro.
- **Nada muda na atualização automática** nem no workflow [`release.yml`](../../.github/workflows/release.yml).

---

<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/rodape-claro.webp">
  <img src="../../_assets/banners/docs/rodape.webp" alt="G.W.E.N. · rodapé da documentação" width="100%">
</picture>
