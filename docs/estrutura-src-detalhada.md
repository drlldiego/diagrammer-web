# Estrutura Detalhada do Diretório SRC

## Visão Geral

O diretório `src/` contém todo o código fonte da aplicação Diagrammer, organizado seguindo padrões de arquitetura modular e separação por domínio. A estrutura principal divide-se em componentes reutilizáveis, features específicas e utilitários globais.

## Estrutura Completa

```
src/
├── App.tsx                    # Componente raiz da aplicação
├── App.scss                   # Estilos do componente principal
├── App.test.tsx              # Testes do componente principal
├── index.tsx                 # Ponto de entrada da aplicação
├── index.scss                # Estilos globais
├── logo.svg                  # Logo da aplicação
├── react-app-env.d.ts        # Definições de tipos do Create React App
├── reportWebVitals.ts        # Métricas de performance
├── setupTests.ts             # Configuração dos testes
├── assets/                   # Recursos estáticos
├── components/               # Componentes reutilizáveis
├── features/                 # Funcionalidades por domínio
├── styles/                   # Estilos globais organizados
├── types/                    # Definições de tipos TypeScript
└── utils/                    # Utilitários e helpers
```

## Arquivos Principais (Root Level)

### `App.tsx`
Componente raiz que define o roteamento da aplicação:
- **Rotas configuradas:**
  - `/` - Página inicial (HomePage)
  - `/editor/bpmn` - Editor BPMN
  - `/editor/erchen` - Editor ER notação Chen
  - `/editor/ercrow` - Editor ER notação Crow's Foot
  - `/editor/flowchart` - Editor de Fluxogramas
- **Features:** Lazy loading dos editores para otimização de performance
- **Suspense:** Loading states durante carregamento dos componentes

### `index.tsx`
Ponto de entrada que configura:
- React StrictMode para desenvolvimento
- BrowserRouter para roteamento
- Renderização do componente App no DOM

## Assets (`src/assets/`)

Recursos visuais organizados:
```
assets/
├── logo-isec-cor.png         # Logo ISEC colorido
├── logo-isec.png             # Logo ISEC padrão
└── logo.png                  # Logo principal da aplicação
```

## Components (`src/components/`)

### Common Components (`components/common/`)

Componentes reutilizáveis utilizados em múltiplas features:

#### `EditorHeader/`
- **EditorHeader.tsx** - Cabeçalho padrão dos editores
- **EditorHeader.scss** - Estilos específicos
- **Funcionalidade:** Barra superior com título, ações e navegação

#### `ExitConfirmationModal/`
- **ExitConfirmationModal.tsx** - Modal de confirmação de saída
- **ExitConfirmationModal.scss** - Estilos do modal
- **index.ts** - Barrel export
- **Funcionalidade:** Previne perda de dados não salvos

#### `ExportButton/`
- **ExportButton.tsx** - Botão de exportação genérico
- **ExportButton.scss** - Estilos do botão
- **Funcionalidade:** Interface para exportação em múltiplos formatos

#### `FitButton/`
- **FitButton.tsx** - Botão para ajustar visualização
- **FitButton.scss** - Estilos específicos
- **Funcionalidade:** Centraliza e ajusta zoom do diagrama

#### `ImportButton/`
- **ImportButton.tsx** - Botão de importação genérico
- **ImportButton.scss** - Estilos do botão
- **Funcionalidade:** Interface para importação de arquivos

#### `Minimap/`
- **Minimap.tsx** - Componente de minimap
- **Minimap.scss** - Estilos do minimap
- **Funcionalidade:** Visão geral e navegação rápida no diagrama

## Features (`src/features/`)

### Home Feature (`features/home/`)

Feature da página inicial:

#### `HomePage.tsx`
- **Componente principal** da página inicial
- **Estado:** Gerencia hover dos cards de diagrama
- **Dados:** Array com tipos de diagrama disponíveis (BPMN, ER Chen, ER Crow's Foot, Flowchart)
- **Navegação:** Redirecionamento para editores específicos
- **UI:** Grid responsivo com cards interativos

#### `HomeHeader/`
- **HomeHeader.tsx** - Cabeçalho da página inicial
- **HomeHeader.scss** - Estilos específicos
- **Props:** title, subtitle
- **Funcionalidade:** Apresentação da marca e descrição

#### `HomeFooter/`
- **HomeFooter.tsx** - Rodapé da página inicial
- **HomeFooter.scss** - Estilos do rodapé
- **Funcionalidade:** Informações institucionais e créditos

### Diagram Features (`features/diagram/`)

#### BPMN (`diagram/bpmn/`)

Feature completa para diagramas BPMN:

##### `BpmnModeler.tsx`
Componente principal do editor BPMN com integração bpmn-js.

##### `components/BreadcrumbNavigation/`
- **BreadcrumbNavigation.tsx** - Navegação hierárquica para subprocessos
- **BreadcrumbNavigation.scss** - Estilos da navegação
- **index.ts** - Barrel export
- **Funcionalidade:** Drill-down em processos aninhados

##### `hooks/`
Hooks customizados para funcionalidades BPMN:
- **useDrilldownNavigation.ts** - Lógica de navegação em subprocessos
- **useExportFunctions.ts** - Funções de exportação (XML, SVG, PDF)
- **useModelerSetup.ts** - Configuração e inicialização do modelador
- **useUnsavedChanges.ts** - Detecção e controle de alterações não salvas

##### `i18n/`
Sistema de internacionalização:
- **custom-translate.ts** - Traduções customizadas
- **index.ts** - Configuração principal
- **translation-module.ts** - Módulo de tradução para bpmn-js

##### `propertiesPanel/`
- **DiagramProperties.tsx** - Painel de propriedades dos elementos
- **DiagramProperties.scss** - Estilos do painel

#### ER (`diagram/er/`)

Feature mais complexa com arquitetura em camadas:

##### `ErModeler.tsx`
Componente principal que orquestra todas as funcionalidades ER.

##### `core/`
Camada fundamental com serviços e tipos base:

###### `services/`
- **er-event.service.ts** - Gerenciamento centralizado de eventos
- **notation.service.ts** - Lógica específica das notações (Chen/Crow's Foot)
- **property-management.service.ts** - Gerenciamento de propriedades dos elementos
- **rendering-strategy.service.ts** - Estratégias de renderização baseadas na notação
- **index.ts** - Barrel exports

###### `types/`
- **er-diagram.types.ts** - Tipos fundamentais do diagrama ER
- **er-element.types.ts** - Tipos dos elementos (entidade, relacionamento, atributo)
- **er-service.types.ts** - Interfaces dos serviços
- **index.ts** - Barrel exports

##### `declarative/`
Interface declarativa para criação de diagramas:

- **ErSyntaxPanel.tsx** - Painel para sintaxe declarativa
- **er-diagram-generator.ts** - Gerador de diagramas a partir de sintaxe
- **er-diagram-serializer.ts** - Serialização de diagramas para diferentes formatos
- **er-parser.ts** - Parser da sintaxe declarativa
- **er-types.ts** - Tipos específicos da interface declarativa
- **styles/ErSyntaxPanel.scss** - Estilos do painel de sintaxe

##### `shared/`
Funcionalidades compartilhadas entre notações:

###### `config/`
- **ErStyleConfig.ts** - Configurações de estilo e aparência
- **NotationConfig.ts** - Configurações específicas por notação
- **index.ts** - Barrel exports

###### `context/`
- **ErDiagramContext.tsx** - Context API para estado do diagrama
- **ErStatisticsContext.tsx** - Context para estatísticas e métricas
- **index.ts** - Barrel exports

###### `hooks/`
Sistema organizado de hooks customizados:

**composite/**
- **useErCompositeHook.ts** - Hook composto que agrega múltiplas funcionalidades

**core/**
- **useConnectionData.ts** - Gerenciamento de dados de conexões
- **useElementProperties.ts** - Propriedades dos elementos
- **useErElementSelection.ts** - Seleção de elementos
- **useErElementState.ts** - Estado dos elementos

**features/**
- **useErExportFunctions.ts** - Funcionalidades de exportação
- **useErUnsavedChanges.ts** - Controle de alterações não salvas
- **useSubAttributeCreation.ts** - Criação de sub-atributos

**management/**
- **useErEventManager.ts** - Gerenciamento de eventos
- **useErPropertyManager.ts** - Gerenciamento de propriedades
- **useErRenderManager.ts** - Gerenciamento de renderização

###### `properties/`
Sistema completo de propriedades:

**components/**
- **ErPropertiesPanel.tsx** - Painel principal de propriedades
- **ErPropertiesPanelContainer.tsx** - Container com lógica
- **ErPropertiesPanelView.tsx** - View de apresentação

**connections/**
- **ConnectionPropertiesContainer.tsx** - Container para propriedades de conexões
- **ConnectionPropertiesView.tsx** - View para conexões
- **index.ts** - Barrel exports

**elements/**
- **AttributeProperties.tsx** - Propriedades de atributos
- **EntityProperties.tsx** - Propriedades de entidades
- **RelationshipProperties.tsx** - Propriedades de relacionamentos
- **index.ts** - Barrel exports

**views/**
- **DiagramPropertiesView.tsx** - View para propriedades do diagrama
- **MultiSelectionView.tsx** - View para seleção múltipla
- **index.ts** - Barrel exports

**hooks/**
- **useCardinalityOptions.ts** - Opções de cardinalidade
- **useConnectionUpdate.ts** - Atualização de conexões
- **index.ts** - Barrel exports

**styles/**
- **AttributeProperties.scss** - Estilos para propriedades de atributos
- **PropertiesBase.scss** - Estilos base
- **ErPropertiesPanel.scss** - Estilos do painel principal
- **index.scss** - Agregador de estilos

**utils/**
- **cardinalityFormatters.ts** - Formatadores de cardinalidade
- **index.ts** - Barrel exports

###### `providers/`
Providers customizados para extensão do bpmn-js:

- **ErBpmnRenderer.tsx** - Renderizador customizado para elementos ER
- **ErContextPadProvider.tsx** - Context pad customizado
- **ErElementFactory.tsx** - Factory para criação de elementos ER
- **ErModuleFactory.ts** - Factory para módulos ER
- **ErMoveRules.tsx** - Regras de movimentação
- **ErOutlineProvider.tsx** - Provider de outline
- **ErPalette.tsx** - Paleta de ferramentas customizada
- **ErPropertiesProvider.tsx** - Provider de propriedades
- **ErRendererModule.tsx** - Módulo de renderização

**rules/**
- **ChenRules.ts** - Regras específicas da notação Chen
- **CrowsFootRules.ts** - Regras específicas da notação Crow's Foot
- **ErConnectionRules.ts** - Regras de conexão entre elementos
- **README.md** - Documentação das regras
- **index.ts** - Barrel exports

###### `services/`
- **er-sub-attribute.service.ts** - Serviço para sub-atributos
- **index.ts** - Barrel exports

###### `styles/`
- **ErModeler.scss** - Estilos principais do modelador
- **ErModelerErrors.scss** - Estilos para estados de erro
- **ErPalette.scss** - Estilos da paleta
- **_ErVariables.scss** - Variáveis SASS

###### `utils/`
- **ErElementUtils.ts** - Utilitários para elementos ER
- **er-element-utilities.ts** - Utilitários específicos
- **export-utils.ts** - Utilitários de exportação
- **index.ts** - Barrel exports

#### Flow (`diagram/flow/`)

Feature para diagramas de fluxo:

##### `FlowModeler.tsx`
Componente principal do editor de fluxogramas.

##### `components/`
- **FlowPropertiesPanel.tsx** - Painel de propriedades específico

##### `custom/`
Customizações do bpmn-js para fluxogramas:
- **FlowBpmnRenderer.tsx** - Renderizador customizado
- **FlowElementFactory.tsx** - Factory de elementos
- **FlowRendererModule.tsx** - Módulo de renderização
- **index.tsx** - Agregador de exports

##### `declarative/`
Interface declarativa para fluxogramas:
- **FlowSyntaxPanel.tsx** - Painel de sintaxe
- **diagram-generator.ts** - Gerador de diagramas
- **flow-parser.ts** - Parser da sintaxe
- **hierarchical-positioning.ts** - Algoritmos de posicionamento
- **types.ts** - Tipos específicos

##### `styles/`
- **DeclarativeElements.scss** - Estilos para elementos declarativos
- **FlowPropertiesPanel.scss** - Estilos do painel de propriedades
- **FlowSyntaxPanel.scss** - Estilos do painel de sintaxe
- **Flowchart.scss** - Estilos gerais do fluxograma

#### Schemas (`diagram/schemas/`)

Definições de schema JSON para diferentes tipos:
- **er-cf-moddle.json** - Schema para ER Crow's Foot
- **er-chen-moddle.json** - Schema para ER Chen
- **flow-moddle.json** - Schema para fluxogramas

#### Shared (`diagram/shared/`)

Componentes compartilhados entre diagramas:
- **ResizeAllRules.tsx** - Regras de redimensionamento
- **index.ts** - Barrel exports

## Styles (`src/styles/`)

Estilos globais organizados:
```
styles/
├── DiagramEditor.scss        # Estilos base dos editores
├── ModelerComponents.scss    # Estilos dos componentes do modelador
├── _mixins.scss             # Mixins SASS reutilizáveis
└── _variables.scss          # Variáveis globais SASS
```

## Types (`src/types/`)

Definições de tipos TypeScript:
```
types/
├── bpmnJsColorPicker.d.ts   # Tipos para color picker do bpmn-js
├── bpmnJsPropertiesPanel.d.ts # Tipos para painel de propriedades
├── diagramJsMinimap.d.ts    # Tipos para componente minimap
└── erTypes.d.ts             # Tipos globais para funcionalidades ER
```

## Utils (`src/utils/`)

Utilitários globais:
```
utils/
├── errorHandler.ts          # Tratamento centralizado de erros
├── logger.ts                # Sistema de logging
└── notifications.ts         # Sistema de notificações
```

## Padrões Arquiteturais

### 1. **Feature-Based Organization**
Cada funcionalidade (BPMN, ER, Flow) é auto-contida com seus próprios componentes, hooks, estilos e utilitários.

### 2. **Layered Architecture (ER)**
- **Core:** Fundamentos e tipos base
- **Shared:** Funcionalidades reutilizáveis
- **Declarative:** Interface de alto nível

### 3. **Barrel Exports**
Uso extensivo de `index.ts` para simplificar imports e manter APIs claras.

### 4. **Custom Hooks Pattern**
Encapsulamento de lógica complexa em hooks reutilizáveis, organizados por categoria.

### 5. **Provider Pattern**
Extensão do bpmn-js através de providers customizados para cada tipo de diagrama.

### 6. **Context API**
Gerenciamento de estado global através de React Context para funcionalidades específicas.

### 7. **Separation of Concerns**
Clara separação entre:
- **Componentes:** UI e apresentação
- **Hooks:** Lógica de negócio
- **Services:** Operações complexas
- **Utils:** Funções auxiliares
- **Types:** Definições de tipos

## Convenções de Nomenclatura

### Arquivos
- **Componentes:** PascalCase (ex: `ErModeler.tsx`)
- **Hooks:** camelCase com prefixo `use` (ex: `useErElementState.ts`)
- **Services:** camelCase com sufixo `.service` (ex: `er-event.service.ts`)
- **Utils:** camelCase (ex: `cardinalityFormatters.ts`)
- **Types:** camelCase com sufixo `.types` (ex: `er-diagram.types.ts`)

### Diretórios
- **Features:** camelCase (ex: `features/diagram/er/`)
- **Componentes:** PascalCase (ex: `components/EditorHeader/`)
- **Categorias:** camelCase (ex: `hooks/composite/`)

### Imports/Exports
- **Barrel exports:** Uso de `index.ts` em cada diretório significativo
- **Named exports:** Preferência por exports nomeados
- **Default exports:** Apenas para componentes principais