import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
function requirePlaywright() {
  try {
    return require("playwright");
  } catch {}

  const fallbackRoots = [
    process.env.RENOVE_NODE_MODULES,
    path.join(
      process.env.USERPROFILE || process.env.HOME || "",
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules",
    ),
    path.join(
      process.env.USERPROFILE || process.env.HOME || "",
      ".codex",
      "skills",
      "joao-browser-authenticated-operator",
      "node_modules",
    ),
  ].filter(Boolean);

  for (const nodeModules of fallbackRoots) {
    try {
      return createRequire(path.join(nodeModules, "resolver.js"))("playwright");
    } catch {}
  }

  throw new Error("Playwright não encontrado. Instale ou aponte RENOVE_NODE_MODULES para um node_modules com playwright.");
}

const { chromium } = requirePlaywright();

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const htmlUrl = process.env.RENOVE_HTML_URL || pathToFileURL(path.join(root, "index.html")).href;
const cdpEndpoint = process.env.RENOVE_CDP_ENDPOINT || "http://127.0.0.1:9222";

async function cdpIsReady(endpoint) {
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/json/version`, {
      signal: AbortSignal.timeout(900),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function openBrowser() {
  if (process.env.RENOVE_USE_CDP !== "0" && await cdpIsReady(cdpEndpoint)) {
    const browser = await chromium.connectOverCDP(cdpEndpoint);
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    return { browser, page, mode: "cdp" };
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 920 } });
  return { browser, page, mode: "headless" };
}

async function login(page) {
  await page.goto(htmlUrl);
  await page.waitForLoadState("domcontentloaded");
  const accessVisible = await page.locator("#access-screen:not([hidden])").count();
  if (!accessVisible) return;
  await page.getByLabel("Usuário").fill("admrenove");
  await page.getByLabel("Senha").fill("Renove!2026");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await page.locator('[data-testid="studio"]').waitFor();
}

function assertPromptIntegrity(text) {
  assert.match(text, /MAPA APROVADO PARA COLAR NO PAINEL/i);
  assert.match(text, /Camada de força e risco/i);
  assert.match(text, /Story e Feed/i);
  assert.match(text, /não gere imagem/i);
  assert.match(text, /texto da peça continua em português exato/i);
}

async function run() {
  const { browser, page, mode } = await openBrowser();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await login(page);

    assert.equal(
      await page.getByRole("heading", { name: /Cole tudo em um bloco/i }).count(),
      1,
      "briefing precisa guiar pela ideia inteira, não por campos soltos",
    );
    assert.equal(
      await page.locator("#brief-headline").isVisible(),
      false,
      "campos separados devem ficar escondidos como ajuste opcional",
    );
    assert.equal(
      await page.getByRole("button", { name: /Copiar organizador para IA/i }).count(),
      1,
      "ação primária do passo 1 precisa estar explícita",
    );
    assert.equal(
      await page.locator("#copy-brief").count(),
      1,
      "contexto do Image 2 deve existir como contrato interno do fluxo",
    );
    assert.equal(
      await page.locator('.recipe-brief[data-brief-stage="idea"]').count(),
      1,
      "briefing deve iniciar em um estado único e reconhecível",
    );
    assert.equal(
      await page.locator("#brief-map-panel").isVisible(),
      false,
      "campo de retorno da IA não deve competir com a ideia antes da primeira ação",
    );
    assert.equal(
      await page.locator("[data-copy-first-prompt]").isDisabled(),
      true,
      "atalho de geração no cabeçalho deve ficar bloqueado antes do mapa aprovado",
    );
    assert.equal(
      await page.locator("#copy-brief").isDisabled(),
      true,
      "botão de contexto não pode funcionar antes do mapa aprovado",
    );
    assert.equal(
      await page.locator("details.setup").count(),
      1,
      "configurações devem ficar em painel recolhível, sem sequestrar a tela Produzir",
    );
    assert.equal(
      await page.locator(".recipe:not([data-brief-stage='ready']) [data-tour='workflow']").isVisible(),
      false,
      "rotas avançadas não devem aparecer antes do mapa aprovado",
    );
    assert.equal(
      await page.locator("details.setup").evaluate((node) => node.open),
      false,
      "painel de direção deve iniciar fechado para a ideia aparecer primeiro",
    );
    await page.locator("#tour-start").click();
    await page.locator("#tour:not([hidden])").waitFor();
    assert.match(
      await page.locator("#tour-title").innerText(),
      /Cole a ideia/i,
      "tutorial precisa começar pelo campo de ideia, não por configuração",
    );
    await page.locator("[data-tour-close]").click();
    assert.equal(
      await page.locator("#direction-summary").count(),
      1,
      "resumo da direção precisa ficar visível mesmo com ajustes fechados",
    );
    assert.equal(
      await page.getByLabel("Linha de produção da receita").count(),
      1,
      "receita precisa mostrar a sequência principal sem depender de memória",
    );
    assert.equal(
      await page.getByText("Baixe e anexe uma vez no Image 2").count(),
      1,
      "seção de anexos precisa declarar que a lista da receita é a fonte de verdade",
    );
    assert.equal(
      await page.getByText(/Quando anexar/i).count() >= 1,
      true,
      "receita precisa declarar quando os anexos entram na produção",
    );

    const rawIdea = [
      "Ideia do WhatsApp: mulher 40+, mudanças hormonais, já tentou emagrecer antes.",
      "Quero peça com força média, sem apelar para exagero.",
      "Pode usar estética de antes/depois com roupa controlada, sem corpo muito exposto.",
      "Copy base: o que muda o resultado não é só medicação, é acompanhamento.",
    ].join("\n");
    await page.locator("#brief-copy").fill(rawIdea);

    const organizerPrompt = await page.locator("#copy-diagnostic").evaluate((button) => button.dataset.diagnosticText);
    assertPromptIntegrity(organizerPrompt);
    assert.match(organizerPrompt, /mulher 40\+/i);
    assert.match(organizerPrompt, /antes\/depois protegido/i);
    assert.match(organizerPrompt, /ROTA RECOMENDADA/i);
    assert.match(organizerPrompt, /FORMATO PRINCIPAL/i);
    assert.match(organizerPrompt, /FAMÍLIA VISUAL/i);

    await page.locator("#copy-diagnostic").click();
    await page.locator('.recipe-brief[data-brief-stage="map"]').waitFor();
    assert.equal(
      await page.locator("#brief-map-panel").isVisible(),
      true,
      "depois de copiar o organizador, a tela deve revelar somente o mapa aprovado",
    );
    assert.match(
      await page.locator("#brief-stage-status").innerText(),
      /Cole o mapa aprovado abaixo/i,
      "a interface precisa dizer claramente o que fazer depois da troca de tela",
    );

    const approvedMap = [
      "MAPA APROVADO PARA COLAR NO PAINEL",
      "ROTA RECOMENDADA: antes/depois",
      "FORMATO PRINCIPAL: Story 9:16",
      "CANAL: pago",
      "FAIXA: principal forte",
      "FAMÍLIA VISUAL: céu claro",
      "LOGO: automática por contraste",
      "1. Ângulo principal: acompanhamento médico e nutricional maior que medicação isolada.",
      "2. Camada de força e risco: médio/principal forte; comparação protegida, sem kg e sem prazo.",
      "3. Texto exato para a arte:",
      "HEADLINE: O que sustenta o resultado",
      "SUBHEADLINE: avaliação, plano e acompanhamento de perto",
      "CTA/OFERTA: Agende sua avaliação",
      "RODAPÉ/DISCLAIMER: condutas dependem de avaliação médica",
      "BLOCOS AUXILIARES: avaliação | plano | acompanhamento",
      "4. Arquitetura visual: foto/base real digna, respiro, grafismos Renove, logo oficial e leitura mobile.",
      "5. Anexos e materiais: usar somente a base real indicada pela receita e guia de formato.",
      "6. Invariantes e flexíveis: travar texto e logo; variar cor, foto e intensidade.",
    ].join("\n");
    await page.locator("#brief-map").fill(approvedMap);

    await page.locator("#brief-result").waitFor({ state: "visible" });
    assert.equal(
      await page.locator('.recipe-brief[data-brief-stage="ready"]').count(),
      1,
      "mapa válido deve levar o briefing ao estado pronto para gerar",
    );
    assert.equal(
      await page.locator('[data-workflow="before-after"]').getAttribute("aria-pressed"),
      "true",
      "rota recomendada pela IA deve atualizar a receita automaticamente",
    );
    assert.equal(
      await page.locator('[data-choice-group="beforeFormat"] [data-value="story"]').getAttribute("aria-pressed"),
      "true",
      "formato recomendado pela IA deve atualizar a receita automaticamente",
    );
    assert.match(
      await page.locator("#brief-result").innerText(),
      /Direção reconhecida/i,
      "ao colar o mapa aprovado, a tela precisa confirmar que entendeu a direção",
    );
    assert.match(
      await page.locator("#brief-result").innerText(),
      /Pronto para começar no Image 2/i,
      "depois do mapa, a próxima ação precisa ficar explícita na própria tela",
    );
    assert(
      await page.getByRole("button", { name: /Copiar contexto inicial/i }).count() >= 1,
      "o estado de mapa recebido precisa oferecer o botão certo sem obrigar a procurar na tela",
    );
    assert.equal(
      await page.getByText("Receita pronta").count() >= 1,
      true,
      "depois do mapa aprovado, o selo do briefing deve mostrar progresso real",
    );
    assert.equal(
      await page.getByRole("button", { name: /Copiar organizador para IA/i }).count(),
      0,
      "depois do mapa aprovado, o primeiro passo deve sair do caminho visual",
    );
    assert.equal(
      await page.locator("#copy-brief").isDisabled(),
      false,
      "mapa aprovado precisa liberar o contexto do Image 2",
    );
    assert.equal(
      await page.locator("[data-copy-first-prompt]").isDisabled(),
      false,
      "atalho de geração no cabeçalho deve liberar junto com o mapa aprovado",
    );
    assert.equal(
      await page.locator("#brief-headline").inputValue(),
      "O que sustenta o resultado",
      "mapa aprovado deve preencher a headline travada automaticamente",
    );
    assert.equal(
      await page.locator("#brief-subheadline").inputValue(),
      "avaliação, plano e acompanhamento de perto",
      "mapa aprovado deve preencher a subheadline travada automaticamente",
    );
    assert.equal(
      await page.locator("#brief-cta").inputValue(),
      "Agende sua avaliação",
      "mapa aprovado deve preencher o CTA travado automaticamente",
    );

    const finalPrompt = await page.locator("#copy-brief").evaluate((button) => button.dataset.briefText);
    assert.match(finalPrompt, /CONTEXTO DA PEÇA RENOVE/i);
    assert.match(finalPrompt, /COLE NO IMAGE 2 ANTES DOS PROMPTS DA RECEITA/i);
    assert.match(finalPrompt, /MAPA APROVADO PELA IA/i);
    assert.match(finalPrompt, /ORDEM DE USO NO IMAGE 2/i);
    assert.match(finalPrompt, /Se abrir outro chat, repita anexos \+ contexto inicial/i);
    assert.match(finalPrompt, /O que sustenta o resultado/i);
    assert.match(finalPrompt, /Story e Feed são peças irmãs/i);
    assert.match(finalPrompt, /base real indicada/i);
    assert.match(finalPrompt, /EXACT TEXT ON IMAGE/i);
    assert.match(finalPrompt, /Não invente preço, prova, resultado/i);
    assert.match(await page.locator("#recipe-status").innerText(), /materiais/i);
    assert(
      await page.getByText(/Base privada/i).count() >= 1,
      "base de antes/depois precisa aparecer como item privado, sem expor arquivo no link online",
    );
    assert.equal(
      await page.getByRole("link", { name: /Baixar base/i }).count(),
      0,
      "link online não deve expor download direto de base real",
    );
    assert.equal(
      await page.locator(".recipe-prompt details[open]").count(),
      0,
      "prompts devem iniciar fechados; a ação principal copia sem abrir bloco gigante",
    );
    assert(
      await page.getByText(/Baixar e anexar/i).count() >= 1,
      "materiais baixáveis precisam ter uma ação clara de baixar e anexar",
    );
    assert(
      await page.getByText(/uma peça = um chat do Image 2/i).count() >= 1,
      "a tela precisa explicar que contexto, anexos e prompts ficam no mesmo chat",
    );
    assert(
      await page.getByText(/Antes do contexto inicial/i).count() >= 1,
      "guia de anexos precisa dizer quando anexar",
    );
    assert(
      await page.getByText(/Todos os prompts usam os anexos e o contexto/i).count() >= 1,
      "guia de anexos precisa explicar como prompts posteriores usam os arquivos",
    );
    assert.doesNotMatch(await page.locator("body").innerText(), /diagnóstico da copy/i);

    await page.evaluate(() => {
      location.hash = "#arquivos";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(200);
    const arquivoViews = await page.evaluate(() => [...document.querySelectorAll("[data-view]")]
      .filter((view) => !view.hidden)
      .map((view) => view.id));
    assert.deepEqual(
      arquivoViews,
      ["arquivos"],
      "Arquivos deve ser uma unica view ativa; aviso de base privada nao pode virar outra tela",
    );
    await page.locator('[data-tab="assets"]').click();
    await page.locator("#library-search").fill("antes e depois");
    const beforeAfterAssets = await page.evaluate(() => [...document.querySelectorAll("#panel-assets [data-library-item]")]
      .filter((item) => !item.hidden && item.offsetParent !== null)
      .length);
    assert(
      beforeAfterAssets >= 4,
      `busca por antes e depois deve encontrar bases privadas: ${beforeAfterAssets}`,
    );
    await page.locator('[data-tab="prompts"]').click();
    await page.locator("#library-search").fill("feed, correcao");
    const feedCorrectionPrompts = await page.evaluate(() => [...document.querySelectorAll("#panel-prompts [data-library-item]")]
      .filter((item) => !item.hidden && item.offsetParent !== null)
      .length);
    assert(
      feedCorrectionPrompts >= 2,
      `busca com virgula/termos deve funcionar como lista flexivel: ${feedCorrectionPrompts}`,
    );
    await page.evaluate(() => {
      location.hash = "#produzir";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(200);

    const protocolBeforeAfterMap = [
      "MAPA APROVADO PARA COLAR NO PAINEL",
      "ROTA RECOMENDADA: antes/depois",
      "FORMATO PRINCIPAL: Feed 4:5",
      "CANAL: pago",
      "FAIXA: Agressivo consciente",
      "FAMILIA VISUAL: Oceano profundo",
      "LOGO: Automatica por contraste",
      "FRENTE DE ANTES/DEPOIS: Protocolo e acompanhamento",
      "1. Angulo principal: alternativa mais segura que comparacao corporal forte.",
      "3. Texto exato para a arte:",
      "HEADLINE: Emagrecer sem direcao custa caro",
      "SUBHEADLINE: plano medico, nutricao e acompanhamento",
      "CTA/OFERTA: Avaliacao a partir de R$997",
    ].join("\n");
    await page.evaluate((nextMap) => {
      const copy = document.querySelector("#brief-copy");
      const map = document.querySelector("#brief-map");
      copy.value = "Peca forte de protocolo sem corpo exposto.";
      map.value = nextMap;
      copy.dispatchEvent(new Event("input", { bubbles: true }));
      map.dispatchEvent(new Event("input", { bubbles: true }));
    }, protocolBeforeAfterMap);
    await page.waitForTimeout(200);
    assert.match(
      await page.locator("#recipe-title").innerText(),
      /Protocolo.*Feed 4:5/i,
      "frente explicita de protocolo deve vencer mencao secundaria a comparacao corporal",
    );
    assert.match(
      await page.locator("#direction-summary").innerText(),
      /Agressivo consciente/i,
      "antes/depois deve preservar a forca comercial sem inventar base mega agressiva",
    );
    const protocolBrief = await page.locator("#copy-brief").evaluate((button) => button.dataset.briefText);
    assert.match(protocolBrief, /For.a: Agressivo consciente/i);
    assert.match(protocolBrief, /Dire..o visual: Protocolo e acompanhamento/i);

    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    assert(widths.document <= widths.viewport + 1, `desktop com overflow: ${JSON.stringify(widths)}`);
    assert.deepEqual(consoleErrors, [], "console não deve conter erros");
    assert.deepEqual(pageErrors, [], "página não deve lançar erros");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await login(page);
    const mobileInitialScreen = await page.evaluate(() => ({
      copyTop: Math.round(document.querySelector("#brief-copy")?.getBoundingClientRect().top || 9999),
      workflowTop: Math.round(document.querySelector("[data-tour='workflow']")?.getBoundingClientRect().top || 9999),
      viewport: window.innerHeight,
    }));
    assert(
      mobileInitialScreen.copyTop > 0 && mobileInitialScreen.copyTop < mobileInitialScreen.viewport,
      `campo de ideia precisa aparecer na primeira dobra mobile inicial: ${JSON.stringify(mobileInitialScreen)}`,
    );
    assert(
      mobileInitialScreen.copyTop < mobileInitialScreen.workflowTop,
      `briefing precisa vir antes da escolha de rota no mobile: ${JSON.stringify(mobileInitialScreen)}`,
    );
    const mobileFirstScreen = await page.evaluate(() => ({
      copyTop: Math.round(document.querySelector("#brief-copy")?.getBoundingClientRect().top || 9999),
      viewport: window.innerHeight,
    }));
    assert(
      mobileFirstScreen.copyTop < mobileFirstScreen.viewport,
      `campo de ideia precisa aparecer na primeira dobra mobile: ${JSON.stringify(mobileFirstScreen)}`,
    );
    await page.locator("#brief-copy").fill(rawIdea);
    await page.locator("#show-brief-map").click();
    await page.locator("#brief-map").fill(approvedMap);

    const mobileWidths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      briefFlowColumns: getComputedStyle(document.querySelector(".brief-progress")).gridTemplateColumns,
    }));
    assert(
      mobileWidths.document <= mobileWidths.viewport + 1,
      `mobile com overflow: ${JSON.stringify(mobileWidths)}`,
    );
    assert(
      !mobileWidths.briefFlowColumns.includes(" 0px"),
      `mobile com coluna quebrada no fluxo: ${JSON.stringify(mobileWidths)}`,
    );

    process.stdout.write(`PASS briefing_flow_cdp (${mode})\n`);
  } finally {
    await page.close().catch(() => {});
    if (mode !== "cdp") {
      await browser.close();
    }
  }
}

await run();
