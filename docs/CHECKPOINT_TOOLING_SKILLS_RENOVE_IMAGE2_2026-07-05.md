# Checkpoint tooling - Renove Image 2 Studio

## Objetivo

Registrar recursos externos adotados no lote de refinamento do fluxo Produzir, sem tocar RenoveOS, site, WordPress, Ads, CRM, Supabase ou dados de cliente.

## Skill externa

- Nome: `frontend-ui-engineering`
- Fonte verificada: `addyosmani/agent-skills`
- Licença: MIT
- Instalação Codex: `C:\Users\creat\.codex\skills\frontend-ui-engineering`
- Espelho Claude: `C:\Users\creat\.claude\skills\frontend-ui-engineering`
- Uso: critérios de UI production-grade, acessibilidade, estado visível e redução de aparência genérica.
- Rollback: remover as duas pastas acima. O painel publicado não depende da skill em runtime.

## Biblioteca vendorizada

- Nome: Driver.js
- Arquivos: `vendor/driverjs/driver.css`, `vendor/driverjs/driver.js.iife.js`, `vendor/driverjs/LICENSE`
- Licença: MIT, preservada no repositório.
- Uso: tutorial contextual dentro do painel, sem backend e sem coleta de dados.
- Rollback: remover `vendor/driverjs`, remover os links de CSS/JS no HTML e desativar o botão de guia.

## Biblioteca avaliada e não adotada

- Nome: Lucide
- Motivo: ícones poderiam melhorar reconhecimento, mas o pacote completo seria peso desnecessário para este lote. Não foi adicionado ao projeto.

## Gates executados

- `node tests\briefing_flow_cdp.mjs`
- `git diff --check`
- QA visual manual no navegador interno local em `http://127.0.0.1:8765/Comece%20Aqui.html`

## Decisão

Manter HTML/CSS/JS nativo neste lote. O foco foi corrigir a lógica de produto do fluxo Produzir: ideia -> direção no GPT -> receita pronta com materiais e prompts, preservando o processo comprovado de Image 2.
