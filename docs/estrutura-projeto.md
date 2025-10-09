# Estrutura do Projeto Diagrammer

## Visão Geral

O **Diagrammer** é uma aplicação web React desenvolvida para a criação de diagramas de forma declarativa. O projeto suporta diferentes tipos de diagramas: BPMN, Entidade-Relacionamento (ER) e Fluxogramas (Flow).

## Estrutura de Diretórios

```
diagrammer-web/
├── build/                     # Build de produção
├── docs/                      # Documentação do projeto
│   ├── Arquitetura_e_Design.md
│   ├── Explicação_IoC-didi.md
│   └── readme.md
├── public/                    # Arquivos públicos
│   ├── favicon.ico
│   ├── index.html
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
├── src/                       # Código fonte da aplicação
│   ├── components/            # Componentes reutilizáveis
│   ├── features/              # Funcionalidades por domínio
│   ├── assets/                # Recursos estáticos
│   ├── styles/                # Estilos globais
│   ├── types/                 # Definições de tipos TypeScript
│   ├── utils/                 # Utilitários gerais
│   ├── App.tsx               # Componente principal
│   └── index.tsx             # Ponto de entrada da aplicação
├── Dockerfile                 # Configuração Docker
├── nginx.conf                # Configuração Nginx
├── package.json              # Dependências e scripts
└── tsconfig.json             # Configuração TypeScript
```

## Arquitetura por Features

### Componentes Comuns (`src/components/common/`)

Componentes reutilizáveis utilizados em todas as features:

- **EditorHeader** - Cabeçalho do editor de diagramas
- **ExitConfirmationModal** - Modal de confirmação de saída
- **ExportButton** - Botão para exportação de diagramas
- **FitButton** - Botão para ajustar visualização
- **ImportButton** - Botão para importação de diagramas
- **Minimap** - Minimapa para navegação no diagrama

### Features Principais (`src/features/`)

#### 1. Home (`features/home/`)
- **HomePage** - Página inicial da aplicação
- **HomeHeader** - Cabeçalho da página inicial
- **HomeFooter** - Rodapé da página inicial

#### 2. Diagramas BPMN (`features/diagram/bpmn/`)
- **BpmnModeler** - Editor principal para diagramas BPMN
- **components/** - Componentes específicos do BPMN
  - **BreadcrumbNavigation** - Navegação hierárquica
- **hooks/** - Hooks customizados para funcionalidades BPMN
  - `useDrilldownNavigation.ts` - Navegação em subprocessos
  - `useExportFunctions.ts` - Funções de exportação
  - `useModelerSetup.ts` - Configuração do modelador
  - `useUnsavedChanges.ts` - Controle de alterações não salvas
- **i18n/** - Internacionalização
- **propertiesPanel/** - Painel de propriedades dos elementos

#### 3. Diagramas ER (`features/diagram/er/`)

Estrutura mais complexa organizada em camadas:

##### Core (`er/core/`)
- **services/** - Serviços centrais
  - `er-event.service.ts` - Gerenciamento de eventos
  - `notation.service.ts` - Serviços de notação
  - `property-management.service.ts` - Gerenciamento de propriedades
  - `rendering-strategy.service.ts` - Estratégias de renderização
- **types/** - Tipos fundamentais do ER
  - `er-diagram.types.ts` - Tipos do diagrama
  - `er-element.types.ts` - Tipos dos elementos
  - `er-service.types.ts` - Tipos dos serviços

##### Declarative (`er/declarative/`)
- **ErSyntaxPanel** - Painel para definição declarativa
- `er-diagram-generator.ts` - Gerador de diagramas
- `er-diagram-serializer.ts` - Serialização de diagramas
- `er-parser.ts` - Parser da sintaxe declarativa

##### Shared (`er/shared/`)

###### Configuração (`shared/config/`)
- `ErStyleConfig.ts` - Configurações de estilo
- `NotationConfig.ts` - Configurações de notação

###### Context (`shared/context/`)
- `ErDiagramContext.tsx` - Context do diagrama ER
- `ErStatisticsContext.tsx` - Context de estatísticas

###### Hooks (`shared/hooks/`)
- **composite/** - Hooks compostos
- **core/** - Hooks fundamentais
- **features/** - Hooks de funcionalidades
- **management/** - Hooks de gerenciamento

###### Properties (`shared/properties/`)
- **components/** - Componentes do painel de propriedades
  - **connections/** - Propriedades de conexões
  - **elements/** - Propriedades de elementos
  - **views/** - Visualizações diferentes
- **hooks/** - Hooks específicos de propriedades
- **utils/** - Utilitários para propriedades

###### Providers (`shared/providers/`)
Providers do bpmn-js customizados para ER:
- `ErBpmnRenderer.tsx` - Renderizador customizado
- `ErContextPadProvider.tsx` - Context pad customizado
- `ErElementFactory.tsx` - Factory de elementos
- `ErPalette.tsx` - Paleta de ferramentas
- **rules/** - Regras de negócio
  - `ChenRules.ts` - Regras para notação Chen
  - `CrowsFootRules.ts` - Regras para notação Crow's Foot
  - `ErConnectionRules.ts` - Regras de conexão

###### Services (`shared/services/`)
- `er-sub-attribute.service.ts` - Serviço para sub-atributos

###### Utils (`shared/utils/`)
- `ErElementUtils.ts` - Utilitários para elementos ER
- `export-utils.ts` - Utilitários de exportação

#### 4. Diagramas Flow (`features/diagram/flow/`)
- **FlowModeler** - Editor para fluxogramas
- **components/** - Componentes específicos do Flow
- **custom/** - Customizações do bpmn-js para Flow
- **declarative/** - Funcionalidades declarativas

### Schemas (`features/diagram/schemas/`)
Definições de schema para diferentes tipos de diagrama:
- `er-cf-moddle.json` - Schema para ER Crow's Foot
- `er-chen-moddle.json` - Schema para ER Chen
- `flow-moddle.json` - Schema para fluxogramas

### Shared Components (`features/diagram/shared/`)
Componentes compartilhados entre diferentes tipos de diagrama.

## Tecnologias e Dependências Principais

### Core
- **React 19.0.0** - Framework principal
- **TypeScript 4.9.5** - Tipagem estática
- **React Router DOM 7.6.0** - Roteamento

### Diagramas
- **bpmn-js 18.6.2** - Engine para diagramas BPMN
- **diagram-js 15.3.0** - Base para diagramas
- **diagram-js-minimap 5.2.0** - Componente minimap

### UI/UX
- **Lucide React 0.509.0** - Ícones
- **SASS 1.93.2** - Pré-processador CSS

### Exportação
- **jsPDF 3.0.1** - Geração de PDFs
- **svg2pdf.js 2.5.0** - Conversão SVG para PDF

### Outros
- **js-yaml 4.1.0** - Parser YAML
- **elkjs 0.11.0** - Algoritmos de layout

## Padrões de Organização

### 1. Separação por Feature
Cada tipo de diagrama (BPMN, ER, Flow) tem sua própria estrutura organizacional.

### 2. Arquitetura em Camadas (ER)
- **Core**: Lógica fundamental e tipos
- **Shared**: Componentes e funcionalidades compartilhadas
- **Declarative**: Interface declarativa

### 3. Hooks Customizados
Cada feature utiliza hooks customizados para encapsular lógica complexa.

### 4. Providers Pattern
Utilização do padrão Provider para extensão do bpmn-js.

### 5. Injeção de Dependência
Uso do padrão IoC (Inversion of Control) conforme documentado em `docs/Explicação_IoC-didi.md`.

## Scripts Disponíveis

- `npm start` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm test` - Executa testes
- `npm run eject` - Ejeta configuração do Create React App

## Deployment

O projeto inclui configuração para deployment via Docker com Nginx como servidor web.