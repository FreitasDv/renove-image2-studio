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
const htmlUrl = pathToFileURL(path.join(root, "index.html")).href;
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
    await page.locator('[data-workflow-panel="before-after"]').waitFor({ state: "visible" });

    assert.equal(
      await page.getByRole("heading", { name: "Cole a ideia inteira primeiro" }).count(),
      1,
      "briefing precisa guiar pela ideia inteira, não por campos soltos",
    );
    assert.equal(
      await page.locator("#brief-headline").isVisible(),
      false,
      "campos separados devem ficar escondidos como ajuste opcional",
    );
    assert.equal(
      await page.getByRole("button", { name: /1\. Copiar prompt organizador/i }).count(),
      1,
      "ação primária do passo 1 precisa estar explícita",
    );
    assert.equal(
      await page.getByRole("button", { name: /2\. Copiar prompt final/i }).count(),
      1,
      "ação do prompt final precisa estar explícita",
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

    const finalPrompt = await page.locator("#copy-brief").evaluate((button) => button.dataset.briefText);
    assert.match(finalPrompt, /PROMPT FINAL DE BRIEFING RENOVE/i);
    assert.match(finalPrompt, /MAPA APROVADO PELO GPT/i);
    assert.match(finalPrompt, /O que sustenta o resultado/i);
    assert.match(finalPrompt, /Story e Feed são peças irmãs/i);
    assert.match(finalPrompt, /base real indicada/i);
    assert.match(finalPrompt, /EXACT TEXT ON IMAGE/i);
    assert.match(finalPrompt, /Não invente preço, prova, resultado/i);
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
    await page.locator('[data-workflow="before-after"]').click();
    await page.locator('[data-workflow-panel="before-after"]').waitFor({ state: "visible" });
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
