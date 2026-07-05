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
    await page.locator('[data-workflow="before-after"]').click();
    await page.locator('[data-workflow="before-after"][aria-pressed="true"]').waitFor();

    assert.equal(
      await page.getByRole("heading", { name: /Cole a ideia inteira/i }).count(),
      1,
      "briefing precisa guiar pela ideia inteira, não por campos soltos",
    );
    assert.equal(
      await page.locator("#brief-headline").isVisible(),
      false,
      "campos separados devem ficar escondidos como ajuste opcional",
    );
    assert.equal(
      await page.getByRole("button", { name: /1\. Copiar organizador/i }).count(),
      1,
      "ação primária do passo 1 precisa estar explícita",
    );
    assert.equal(
      await page.getByRole("button", { name: /2\. Copiar briefing final/i }).count(),
      1,
      "ação do prompt final precisa estar explícita",
    );
    assert.equal(
      await page.locator("details.setup").count(),
      1,
      "configurações devem ficar em painel recolhível, sem sequestrar a tela Produzir",
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
      await page.getByText("Baixe e anexe somente estes arquivos").count(),
      1,
      "seção de anexos precisa declarar que a lista da receita é a fonte de verdade",
    );
    assert.equal(
      await page.getByText(/Fonte de verdade/i).count() >= 1,
      true,
      "receita precisa declarar que anexos fora da lista não entram na produção",
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

    const approvedMap = [
      "MAPA APROVADO PARA COLAR NO PAINEL",
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
    assert.match(
      await page.locator("#brief-result").innerText(),
      /Mapa recebido/i,
      "ao colar o mapa aprovado, a tela precisa confirmar que entendeu a volta do GPT",
    );
    assert.match(
      await page.locator("#brief-result").innerText(),
      /Copie o briefing final/i,
      "depois do mapa, a próxima ação precisa ficar explícita na própria tela",
    );
    assert.equal(
      await page.getByRole("button", { name: /Copiar briefing final agora/i }).count(),
      1,
      "o estado de mapa recebido precisa oferecer o botão certo sem obrigar a procurar na tela",
    );
    assert.equal(
      await page.getByText("Mapa recebido").count() >= 1,
      true,
      "depois da volta do GPT, o selo do briefing deve mostrar progresso real",
    );
    assert.equal(
      await page.getByRole("button", { name: /Refazer organizador/i }).count(),
      1,
      "depois da volta do GPT, o organizador deve virar ação de refazer, não primeiro passo",
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
    assert.match(finalPrompt, /BRIEFING FINAL RENOVE/i);
    assert.match(finalPrompt, /MAPA APROVADO PELO GPT/i);
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
    assert.doesNotMatch(await page.locator("body").innerText(), /diagnóstico da copy/i);

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
    await page.locator('[data-workflow="before-after"]').click();
    await page.locator('[data-workflow="before-after"][aria-pressed="true"]').waitFor();
    const mobileFirstScreen = await page.evaluate(() => ({
      copyTop: Math.round(document.querySelector("#brief-copy")?.getBoundingClientRect().top || 9999),
      viewport: window.innerHeight,
    }));
    assert(
      mobileFirstScreen.copyTop < mobileFirstScreen.viewport,
      `campo de ideia precisa aparecer na primeira dobra mobile: ${JSON.stringify(mobileFirstScreen)}`,
    );
    await page.locator("#brief-copy").fill(rawIdea);
    await page.locator("#brief-map").fill(approvedMap);

    const mobileWidths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      briefFlowColumns: getComputedStyle(document.querySelector(".brief-flow")).gridTemplateColumns,
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
