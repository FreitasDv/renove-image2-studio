# Renove Creative OS

## Leitura de produto

Aplicativo interno de produção assistida para usuário não técnico. A aparência deve transmitir método clínico, critério editorial e domínio operacional, sem parecer landing page, template de IA ou painel administrativo genérico.

## Direção

- Modo: redesign com preservação de marca, conteúdo e processo.
- Variância: 5/10. Editorial contido, com assimetria funcional.
- Movimento: 3/10. Apenas feedback, transição de estado e orientação.
- Densidade: 5/10. Compacto o bastante para trabalhar, respirado o bastante para ensinar.

## Sistema visual

- Tipografia: Literata em títulos de marca e Ubuntu no produto.
- Paleta: tokens oficiais Renove. Clay é acento; petróleo é ação; estados usam cores semânticas próprias.
- Raios: 4, 8, 12 e 16 px conforme hierarquia. Não arredondar tudo do mesmo modo.
- Elevação: uma escala curta; borda ou sombra, nunca ambas sem função.
- Cards: somente para item repetido, resultado ou ferramenta enquadrada. Seções usam espaço, linha e fundo.
- Movimento: 160-240 ms, transform e opacity, com `prefers-reduced-motion`.

## Fluxo Produzir

1. Ideia: campo principal e ação "Copiar organizador para IA".
2. Direção: mapa aprovado vindo do Claude ou ChatGPT, confirmação do que foi entendido e ajustes opcionais.
3. Geração: anexar materiais uma vez no Image 2, colar contexto inicial e depois usar prompts na ordem.
4. Revisão: aprovar, corrigir ou reconstruir sem reiniciar o processo.

Regra de sequência: quando a receita for Story 9:16, o painel deve oferecer Feed 4:5 logo depois da geração Story, no mesmo chat e antes da correção. Esse é o fluxo operacional usado nas peças de ads e social: Story e Feed são peças irmãs, não cortes.

## Regras de UX

- Uma ação primária por estado.
- O sistema carrega informações adiante; nunca pede o mesmo dado duas vezes.
- Uma peça usa um chat do Image 2: anexos primeiro, contexto inicial depois, prompts seguintes no mesmo chat.
- Story 9:16 sempre mostra a continuação para Feed 4:5 na própria esteira de produção.
- O usuário não precisa conhecer "briefing final", "diagnóstico" ou nomes de implementação.
- Ajuda aparece no ponto da dúvida e some quando deixa de ser útil.
- O texto completo nunca depende de hover.
- Todo botão comunica verbo, destino e consequência.
- Atalhos bloqueados explicam o que falta.
- Mobile mantém a mesma ordem mental do desktop.

## Critério de pronto

- O fluxo completo pode ser explicado em uma frase: cole a ideia, organize no Claude ou ChatGPT, anexe os materiais no Image 2, cole o contexto inicial e siga os prompts no mesmo chat.
- Um usuário novo encontra o próximo clique sem abrir Método ou Arquivos.
- Um usuário experiente consegue revisar rota, risco, cor, logo e copy sem perder profundidade.
- Não há overflow, sobreposição, texto truncado sem expansão, foco invisível ou ação ambígua.
