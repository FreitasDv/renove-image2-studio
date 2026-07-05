## Problem Statement

O painel preserva um processo criativo valioso, mas expõe conceitos internos demais ao mesmo tempo. O usuário precisa entender "organizador", "mapa", "contexto", "receita", anexos e prompts antes de concluir a primeira peça. A lógica funciona tecnicamente, porém a sequência visual, os nomes e os atalhos antecipados aumentam carga de memória e deixam incerto o próximo clique.

## Solution

Transformar Produzir em um fluxo progressivo de três estados visíveis:

1. Ideia: o usuário cola qualquer material bruto e copia um organizador inteligente.
2. Direção: o usuário cola a resposta estruturada do GPT; o painel interpreta rota, formato, canal, faixa, família visual, logo e copy.
3. Geração: o painel exibe somente os materiais da receita e uma fila ordenada de contexto e prompts para o Image 2.

O painel deve manter a biblioteca, o método e os ajustes avançados como apoio, sem exigir navegação para produzir.

## User Stories

1. Como usuário leigo, quero colar uma ideia inteira sem separar campos, para começar sem conhecer a estrutura de copy.
2. Como usuário leigo, quero ver uma única ação principal por vez, para não precisar adivinhar o próximo clique.
3. Como usuário com TDAH, quero que o painel lembre o estado atual, para não carregar o processo na memória.
4. Como produtor, quero que o GPT recomende rota, formato, canal, faixa, família visual e logo, para aproveitar inteligência contextual.
5. Como produtor experiente, quero revisar e sobrescrever recomendações, para manter controle criativo.
6. Como usuário, quero voltar com a resposta do GPT e colá-la em um campo claramente identificado, para concluir o handoff sem ambiguidade.
7. Como usuário, quero uma confirmação legível do que o painel entendeu, para detectar erros antes de gerar.
8. Como usuário, quero baixar apenas os anexos necessários para a receita atual, para não misturar referências.
9. Como usuário, quero saber quais bases privadas preciso buscar fora do painel, para não confundir descrição com anexo.
10. Como usuário, quero copiar contexto e prompts em ordem, para manter o processo comprovado do Image 2.
11. Como usuário, quero que Story e Feed sejam tratados como composições irmãs, para evitar corte automático.
12. Como usuário, quero rotas específicas para peça nova, referência, versão e antes/depois, para cobrir os usos reais.
13. Como gestor, quero preservar as faixas protegida, principal forte e agressiva consciente, para testar performance sem autocensura cega.
14. Como gestor, quero manter compliance por superfície, para não aplicar trava de anúncio a conteúdo orgânico ou material interno.
15. Como usuário de teclado, quero foco visível e ordem lógica, para operar o painel sem mouse.
16. Como usuário mobile, quero controles de pelo menos 44 px e nenhuma rolagem horizontal, para evitar toques errados.
17. Como cliente, quero copy profissional sem bastidores técnicos, para perceber o valor do método.
18. Como usuário recorrente, quero que o painel preserve rascunho e progresso localmente, para continuar de onde parei.
19. Como usuário, quero ajuda contextual na própria etapa, para não abandonar Produzir e caçar documentação.
20. Como responsável pelo produto, quero testes de estado, copy, responsividade e acessibilidade, para impedir regressões.

## Implementation Decisions

- Preservar HTML, CSS e JavaScript nativos; não migrar framework.
- Modelar o briefing com estados `idea`, `map` e `ready`.
- Exibir uma ação primária por estado e manter alternativas como ações secundárias.
- Expandir o contrato do mapa para recomendações estruturadas de produção.
- Interpretar recomendações de forma tolerante a acentos, caixa e sinônimos.
- Manter ajustes manuais em divulgação progressiva.
- Desabilitar atalhos de geração enquanto não houver mapa válido.
- Usar tokens semânticos Renove e reduzir bordas, sombras e cards repetidos.
- Usar Driver.js já vendorizado apenas para tutorial contextual.
- Usar ícones oficiais somente onde melhoram reconhecimento de ação.
- Preservar IDs relevantes e contratos existentes usados pelos testes.
- Espelhar a versão final em `index.html` somente após o lote passar nos testes.

## Testing Decisions

- Testar comportamento externo no navegador, não funções internas.
- Cobrir transições `idea -> map -> ready`.
- Cobrir inferência de rota e formato a partir do mapa.
- Cobrir bloqueio e desbloqueio dos atalhos de geração.
- Cobrir integridade do prompt organizador e do contexto do Image 2.
- Cobrir ausência de overflow em desktop e mobile.
- Cobrir console e erros de página.
- Cobrir foco visível, alvos de toque e redução de movimento no gate final.

## Out of Scope

- Integração direta com API do ChatGPT ou Image 2.
- Alterações em RenoveOS, site, WordPress, Ads, CRM ou Supabase.
- Exposição pública de bases reais de pacientes.
- Migração para React, Next.js ou outra stack.

## Further Notes

O processo comprovado continua sendo a fonte de verdade: direção contextual antes da geração, anexos selecionados por receita, prompts sequenciais, Story e Feed recompostos, revisão cirúrgica e variação controlada.
