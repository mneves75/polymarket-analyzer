# Guia de Onboarding - Polymarket Analyzer

> **"O primeiro dia é o mais importante. Um bom onboarding define o sucesso."**
> — Princípio de Gestão de Talentos

---

## 📋 Visão Geral

Este guia fornece um plano estruturado de 90 dias para novos desenvolvedores entrando na equipe do Polymarket Analyzer. O objetivo é transformar você de iniciante a contribuidor produtivo de forma progressiva e sustentável.

---

## 🎯 Objetivos do Onboarding

### 30 Dias (Primeiro Mês)
- ✅ Entender a arquitetura básica do projeto
- ✅ Configurar ambiente de desenvolvimento
- ✅ Executar o projeto localmente
- ✅ Compreender o fluxo de dados principal
- ✅ Fazer primeira contribuição (bug fix ou documentação)

### 60 Dias (Segundo Mês)
- ✅ Dominar as APIs Polymarket (Gamma, CLOB, Data)
- ✅ Entender WebSocket e tempo real
- ✅ Contribuir com features pequenas
- ✅ Escrever testes para código existente
- ✅ Participar de code reviews

### 90 Dias (Terceiro Mês)
- ✅ Desenvolver features completas de forma independente
- ✅ Otimizar performance
- ✅ Entender estratégias de rate limiting e caching
- ✅ Contribuir com arquitetura e design decisions
- ✅ Mentoring de novos membros

---

## 📅 Semana 1: Fundamentos e Setup

### Dia 1: Configuração do Ambiente

**Objetivos:**
- [ ] Instalar Bun 1.3.5+
- [ ] Instalar VS Code (ou IDE preferido)
- [ ] Clonar repositório
- [ ] Executar projeto pela primeira vez
- [ ] Entender estrutura de diretórios

**Tarefas:**

```bash
# 1. Instalar Bun
curl -fsSL https://bun.sh/install | bash

# 2. Verificar instalação
bun --version  # Deve ser 1.3.5+

# 3. Clonar repositório
git clone <repositorio-url>
cd polymarket-analyzer

# 4. Instalar dependências
bun install

# 5. Executar projeto
bun run dev  # Deve abrir a interface TUI
```

**Configuração do VS Code:**

Instalar extensões:
- TypeScript extension
- Error Lens (mostra erros inline)
- GitLens (histórico git)
- Markdown Preview Enhanced

**Leitura Obrigatória:**
- [ ] `docs/learn/00-introducao.md`
- [ ] `docs/learn/01-ecossistema-bun-typescript.md`

**Milestone:** ✅ Projeto executando localmente

---

### Dia 2: Arquitetura e Estrutura

**Objetivos:**
- [ ] Entender camadas da arquitetura
- [ ] Mapear arquivos principais
- [ ] Compreender fluxo de dados

**Tarefas:**

1. **Leitura:**
   - [ ] `docs/learn/02-arquitetura-estrutura.md` (completo)

2. **Exercício Prático:**
   ```typescript
   // Execute o seguinte para entender o fluxo:
   bun run markets  // Lista mercados
   bun run snapshot  // Exporta snapshot JSON
   bun run dev --market <id>  // Abre mercado específico
   ```

3. **Mapeamento de Código:**
   - [ ] Abra cada arquivo em `src/`
   - [ ] Entenda o que cada arquivo faz
   - [ ] Desenhe em papel o fluxo de dados

**Quiz de Validação:**
```markdown
1. Qual é a responsabilidade de `api.ts`?
2. Como `rateLimiter.ts` funciona?
3. Qual é a diferença entre WebSocket e REST?
```

**Milestone:** ✅ Arquitetura entendida

---

### Dia 3: APIs Polymarket

**Objetivos:**
- [ ] Entender Gamma API
- [ ] Entender CLOB API
- [ ] Entender Data API

**Tarefas:**

1. **Leitura:**
   - [ ] `docs/learn/03-apis-polymarket.md` (completo)

2. **Exploração Manual:**
   ```bash
   # Teste Gamma API
   curl "https://gamma-api.polymarket.com/events?limit=5"

   # Teste CLOB API (precisa de token ID primeiro)
   curl "https://clob.polymarket.com/book?token_id=<ID>"
   ```

3. **Exercício Prático:**
   ```typescript
   // Crie um arquivo test-apis.ts:
   import { fetchEvents, fetchMarkets } from "./src/api";

   const events = await fetchEvents(5);
   console.log("Eventos:", events);

   const markets = await fetchMarkets(10);
   console.log("Mercados:", markets);
   ```

**Milestone:** ✅ APIs compreendidas

---

### Dia 4-5: WebSocket e Tempo Real

**Objetivos:**
- [ ] Entender protocolo WebSocket
- [ ] Compreender estratégia de reconexão
- [ ] Ver heartbeat e stale detection

**Tarefas:**

1. **Leitura:**
   - [ ] `docs/learn/04-websockets-tempo-real.md` (completo)

2. **Teste WebSocket:**
   ```bash
   # Instale wscat para testar WS manualmente
   bun install -g wscat

   # Conecte ao WebSocket Polymarket
   wscat -c wss://ws-subscriptions-clob.polymarket.com/ws/

   # Envie mensagem de subscrição
   {"type":"MARKET","assets_ids":["<token_id>"],"custom_feature_enabled":true}
   ```

3. **Exercício de Debug:**
   - [ ] Adicione `console.log` em `src/ws.ts`
   - [ ] Execute `bun run dev`
   - [ ] Observe mensagens WebSocket no terminal

**Milestone:** ✅ Tempo real entendido

---

## 📅 Semana 2-4: Profundização Técnica

### Semana 2: Camada de Dados

**Objetivos:**
- [ ] Dominar `api.ts` (todos endpoints)
- [ ] Entender `parsers.ts` (normalização)
- [ ] Aprender `http.ts` (rate limiting)

**Tarefas Diárias:**

**Dia 6-7: Normalização de Dados**
```typescript
// Exercício: Adicione novo parser
// 1. Leia src/parsers.ts
// 2. Entenda normalizeOrderbook()
// 3. Crie normalizeMarketStats()
```

**Dia 8-9: Rate Limiting**
```typescript
// Exercício: Teste rate limiting
// 1. Crie script que faz 1000 requisições
// 2. Observe como token bucket funciona
// 3. Ajuste limites em src/config.ts
```

**Dia 10: Testes**
- [ ] `bun test` (todos devem passar)
- [ ] Entenda testes existentes
- [ ] Adicione um teste novo

**Milestone:** ✅ Camada de dados dominada

---

### Semana 3: Camada de Domínio

**Objetivos:**
- [ ] Dominar `market.ts` (resolução)
- [ ] Entender `utils.ts` (formatação)
- [ ] Aprender `parsers.ts` (normalização)

**Tarefas Diárias:**

**Dia 11-12: Resolução de Mercados**
```typescript
// Exercício: Estratégias de resolução
// 1. Leia src/market.ts
// 2. Teste resolveMarket() com diferentes inputs
// 3. Adicione nova estratégia de fallback
```

**Dia 13-14: Formatação e Sparklines**
```typescript
// Exercício: Crie nova função de formatação
// 1. Leia src/utils.ts
// 2. Entenda sparkline()
// 3. Crie função para formatar volume
```

**Dia 15: Integração**
- [ ] Execute fluxo completo (CLI → API → TUI)
- [ ] Debug passo a passo
- [ ] Documente aprendizados

**Milestone:** ✅ Camada de domínio dominada

---

### Semana 4: Camada de Apresentação

**Objetivos:**
- [ ] Entender `tui.ts` (interface)
- [ ] Aprender Blessed (biblioteca TUI)
- [ ] Criar componente visual novo

**Tarefas Diárias:**

**Dia 16-17: Explorando TUI**
```typescript
// Exercício: Entenda interface
// 1. Leia src/tui.ts (682 linhas!)
// 2. Mapeie todos os componentes
// 3. Entenda ciclo de renderização
```

**Dia 18-19: Criando Componente**
```typescript
// Exercício: Adicione novo painel
// 1. Crie "Painel de Estatísticas"
// 2. Mostre volume 24h, variação, etc.
// 3. Integre com loop de refresh
```

**Dia 20: Testes de UI**
- [ ] Teste interatividade (teclas n, p, o, s, q)
- [ ] Verifique responsividade
- [ ] Teste com diferentes tamanhos de terminal

**Milestone:** ✅ Camada de apresentação dominada

---

## 📅 Mês 2: Contribuição Ativa

### Semana 5-6: Features Pequenas

**Objetivos:**
- [ ] Primeira contribuição aceita
- [ ] Entender processo de pull request
- [ ] Participar de code review

**Tarefas Semanais:**

**Semana 5:**
1. **Escolha uma issue:**
   - Bug: "TUI não atualiza quando WebSocket reconecta"
   - Feature: "Adicionar flag --json para markets"
   - Docs: "Melhorar README"

2. **Implementação:**
   ```bash
   git checkout -b fix/tui-reconnect
   # Faça alterações
   git commit -m "Fix: TUI update on WS reconnect"
   git push origin fix/tui-reconnect
   ```

3. **Pull Request:**
   - [ ] Descreva mudança
   - [ ] Referencie issue
   - [ ] Solicite review

**Semana 6:**
1. **Code Review de Others:**
   - [ ] Revise 1 PR de outro desenvolvedor
   - [ ] Aprenda com código alheio
   - [ ] Dê feedback construtivo

2. **Segunda Contribuição:**
   - [ ] Escolha issue mais complexa
   - [ ] Implemente com testes
   - [ ] Documente mudanças

**Milestone:** ✅ 2 contribuições aceitas

---

### Semana 7-8: Testes e Qualidade

**Objetivos:**
- [ ] Escrever testes unitários
- [ ] Escrever testes de integração
- [ ] Alcançar 80% de cobertura

**Tarefas Semanais:**

**Semana 7: Testes Unitários**
```typescript
// Exercício: Testes para api.ts
describe("fetchEvents", () => {
  it("deve retornar eventos ativos", async () => {
    const events = await fetchEvents(5);
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeLessThanOrEqual(5);
  });
});
```

**Semana 8: Testes de Integração**
```typescript
// Exercício: Testes de fluxo completo
describe("loadRadar", () => {
  it("deve carregar e normalizar mercados", async () => {
    const radar = await loadRadar(10);
    expect(radar).toHaveLength(10);
    expect(radar[0].conditionId).toBeDefined();
  });
});
```

**Milestone:** ✅ Testes dominados

---

## 📅 Mês 3: Autonomia e Liderança

### Semana 9-10: Features Complexas

**Objetivos:**
- [ ] Desenvolver feature completa
- [ ] Arquitetar solução
- [ ] Documentar decisões

**Exemplo de Feature:**
```markdown
## Feature: Sistema de Alertas

### Descrição
Notificar usuário quando:
- Preço muda > X%
- Volume aumenta anormalmente
- WebSocket desconecta

### Arquitetura
- Novo arquivo: src/alerts.ts
- Integrar com: ws.ts (receber updates)
- Renderizar em: tui.ts (painel de alerts)

### Decisões de Design
- Alertas visuais vs sonoros? → Visuais
- Limite de alertas simultâneos? → 5
- Histórico de alertas? → Sim, últimos 50
```

**Milestone:** ✅ Feature complexa entregue

---

### Semana 11-12: Otimização e Performance

**Objetivos:**
- [ ] Identificar gargalos
- [ ] Implementar cache
- [ ] Otimizar queries

**Tarefas:**

1. **Profiling:**
   ```bash
   # Use Bun's built-in profiler
   bun --prof run src/index.ts
   ```

2. **Otimizações:**
   - [ ] Cache de mercados (1 minuto TTL)
   - [ ] Debounce de atualizações TUI
   - [ ] Lazy loading de dados

3. **Métricas:**
   - [ ] Tempo de inicialização: < 3s
   - [ ] Tamanho do bundle: < 500KB
   - [ ] Uso de memória: < 100MB

**Milestone:** ✅ Performance otimizada

---

## 🎓 Plano de Aprendizagem Contínuo

### Recursos Obrigatórios

**Ferramentas:**
- [ ] Bun: https://bun.sh/docs
- [ ] TypeScript: https://www.typescriptlang.org/docs/
- [ ] Blessed: https://github.com/chjj/blessed

**Conceitos:**
- [ ] Rate Limiting: Token Bucket Algorithm
- [ ] WebSocket: RFC 6455
- [ ] TUI: ncurses, terminal escape codes

**Boas Práticas:**
- [ ] Clean Code: Robert C. Martin
- [ ] Refactoring: Martin Fowler
- [ ] Design Patterns: Gang of Four

---

## 📊 Sistema de Progresso

### Checkpoints Mensais

**Mês 1 - Fundamentos:**
- [ ] 4 checkpoints dos capítulos
- [ ] 5 exercícios práticos
- [ ] 1 contribuição

**Mês 2 - Profundização:**
- [ ] 3 features pequenas
- [ ] 10 testes escritos
- [ ] 2 code reviews

**Mês 3 - Autonomia:**
- [ ] 1 feature complexa
- [ ] 3 otimizações
- [ ] 1 design document

### Badges de Conquista

```
🏅 NOVICE       - Completou Mês 1
🏅 APPRENTICE   - Primeira contribuição
🏅 CONTRIBUTOR  - 5 contribuições
🏅 EXPERT       - Completou Mês 2
🏅 MASTER       - Completou Mês 3
🏅 ARCHITECT    - Design document aprovado
🏅 MENTOR       - Mentorou novo membro
```

---

## 🤝 Suporte e Mentoria

### Canais de Ajuda

1. **Dúvidas Técnicas:**
   - Slack #engineering-support
   - Issue tracker no GitHub

2. **Pair Programming:**
   - 2h/semana com mentor
   - Screenshare de problemas complexos

3. **Code Review:**
   - Toda PR revisada por senior
   - Feedback detalhado

### Sinais de Alerta

**Se você sentir:**
- 😰 "Estou muito atrasado" → Fale com manager
- 😵 "Não entendo NADA" → Agende pair programming
- 🤔 "Isso não faz sentido" → Questione arquitetura

**NÃO sofra em silêncio!**

---

## ✅ Checklist Final

### Dia 90: Você deve ser capaz de:

- [ ] Explicar a arquitetura completa para alguém novo
- [ ] Desenvolver feature sem ajuda significativa
- [ ] Revisar código de outros construtivamente
- [ ] Sugerir melhorias arquiteturais
- [ ] Mentorar novo desenvolvedor
- [ ] Contribuir com decisões técnicas
- [ ] Escrever código production-ready
- [ ] Debugar problemas complexos

**Parabéns! Você é oficialmente um contribuidor pleno do Polymarket Analyzer! 🎉**

---

## 📚 Recursos Adicionais

- **Playground:** `docs/learn/08-exercicios-completos.md`
- **Referência Rápida:** `docs/learn/README.md`
- **FAQ:** (a ser criado)

---

**Última Atualização:** Janeiro 2026
**Versão:** 1.0
