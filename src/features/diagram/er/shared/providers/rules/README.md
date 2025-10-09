# ER Connection Rules

## Status: 🚧 **NÃO INTEGRADO - PREPARATÓRIO PARA FUTURO**

Este diretório contém um sistema de regras de conexão para diferentes notações ER que foi implementado mas **não está integrado** ao sistema principal.

## Arquivos

- **ErConnectionRules.ts** - Base abstrata e factory para regras de conexão
- **ChenRules.ts** - Regras específicas para notação Chen (ER Clássico) 
- **CrowsFootRules.ts** - Regras específicas para notação Crow's Foot
- **index.ts** - Exports e função de inicialização

## Funcionalidades Implementadas

✅ **Sistema de Factory Pattern** para diferentes notações
✅ **Validação de conexões** baseada na notação ativa
✅ **Regras específicas** Chen vs Crow's Foot
✅ **Interface padronizada** para validações

## Status de Integração

❌ **Não integrado ao sistema principal**
❌ **Função `initializeErRules()` não é chamada**
❌ **Nenhum provider usa estas regras**

## Decisão Tomada (2024)

**MANTER** - O código está bem implementado e pode ser útil quando:
1. Houver necessidade de validações de conexão mais rigorosas
2. For implementado modo de validação stricta por notação
3. For necessário feedback visual de conexões inválidas

## Para Integração Futura

1. Chamar `initializeErRules()` no `ErModeler.tsx`
2. Integrar validações no `ErContextPadProvider` ou `ErPalette`
3. Adicionar feedback visual para conexões inválidas
4. Implementar modo "strict" vs "lenient" de validação

## Última Revisão

- **Data**: Outubro 2025
- **Status**: Preparatório/Não utilizado
- **Ação**: Mantido para uso futuro