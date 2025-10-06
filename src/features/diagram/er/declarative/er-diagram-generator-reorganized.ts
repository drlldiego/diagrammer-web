// ===================================================================
// GERADOR DE DIAGRAMAS ER - RENDERIZAÇÃO VISUAL
// ===================================================================
// 
// Este ficheiro é responsável por converter a estrutura de dados 
// ErDiagram em elementos visuais no canvas usando BPMN.js
//
// RESPONSABILIDADES:
// 1. Criar elementos visuais (entidades, conexões)
// 2. Aplicar posicionamento no canvas
// 3. Configurar propriedades visuais
// 4. Gerir ancoragem de conexões
// ===================================================================

import BpmnModeler from "bpmn-js/lib/Modeler";
import { ErDiagram, ErEntity, ErRelationship } from './er-types';

export default class ErDiagramGenerator {
  private modeler: BpmnModeler;
  private elementRegistry: any;
  private modeling: any;
  private elementFactory: any;
  private erElementFactory: any;
  private canvas: any;

  constructor(modeler: BpmnModeler) {
    this.modeler = modeler;
    this.elementRegistry = modeler.get('elementRegistry');
    this.modeling = modeler.get('modeling');
    this.elementFactory = modeler.get('elementFactory');
    this.erElementFactory = modeler.get('erElementFactory');
    this.canvas = modeler.get('canvas');
  }
  
  /**
   * Limpar todos os elementos do canvas
   */
  private async clearCanvas(): Promise<void> {
    const rootElement = this.canvas.getRootElement();
    const allElements = this.elementRegistry.filter((element: any) => {
      return element.parent === rootElement && element.type !== 'label';
    });

    if (allElements.length > 0) {
      this.modeling.removeElements(allElements);
    }
  }

  // ===================================================================
  // SECÇÃO 1: MÉTODOS PRINCIPAIS DE GERAÇÃO
  // ===================================================================
  
  /**
   * MÉTODO PRINCIPAL DE GERAÇÃO VISUAL
   * Converte estrutura ErDiagram em elementos visuais no canvas
   * 
   * @param diagram - Diagrama ER estruturado com posições
   */
  async generateVisualDiagram(diagram: ErDiagram): Promise<void> {
    try {
      console.log('🎨 [Generator] Iniciando geração visual do diagrama');
      
      // 1. PREPARAR CANVAS: Limpar e configurar
      await this.prepararCanvas();
      
      // 2. CRIAR ENTIDADES: Elementos visuais das entidades
      const elementosEntidades = await this.criarEntidadesVisuais(diagram.entities);
      
      // 3. CRIAR CONEXÕES: Ligações entre entidades
      await this.criarConexoesVisuais(diagram.relationships, elementosEntidades);
      
      // 4. AJUSTAR VISUALIZAÇÃO: Zoom e posicionamento final
      this.ajustarVisualizacao();
      
      console.log('✅ [Generator] Geração visual concluída');
    } catch (error) {
      console.error('❌ [Generator] Erro na geração visual:', error);
      throw error;
    }
  }

  // ===================================================================
  // SECÇÃO 2: CRIAÇÃO DE ENTIDADES VISUAIS
  // ===================================================================

  /**
   * CRIAR ENTIDADES VISUAIS
   * Converte entidades ER em elementos visuais no canvas
   * 
   * @param entities - Array de entidades ER com posições
   * @returns Map<string, any> - Mapeamento nome→elemento visual
   */
  private async criarEntidadesVisuais(entities: ErEntity[]): Promise<Map<string, any>> {
    console.log('🏗️ [Generator] Criando entidades visuais');
    
    const elementosEntidades = new Map<string, any>();
    
    for (const entidade of entities) {
      try {
        // Criar elemento visual individual
        const elementoVisual = await this.criarEntidadeIndividual(entidade);
        
        // Armazenar mapeamento
        elementosEntidades.set(entidade.name, elementoVisual);
        
        console.log(`✅ [Generator] Entidade "${entidade.name}" criada visualmente`);
      } catch (error) {
        console.error(`❌ [Generator] Erro ao criar entidade "${entidade.name}":`, error);
      }
    }
    
    return elementosEntidades;
  }

  /**
   * CRIAR ENTIDADE INDIVIDUAL
   * Cria um elemento visual BPMN para uma entidade ER
   * 
   * @param entity - Entidade ER com propriedades
   * @returns any - Elemento visual criado
   */
  private async criarEntidadeIndividual(entity: ErEntity): Promise<any> {
    // 1. DEFINIR PROPRIEDADES VISUAIS
    const propriedadesElemento = {
      type: 'bpmn:Task',
      width: 120,
      height: 80,
      name: entity.name,
      erType: 'Entity',
      isWeak: entity.isWeak || false
    };

    // 2. CRIAR ELEMENTO USANDO FACTORY
    const elementoBase = this.erElementFactory.createShape(propriedadesElemento);

    // 3. DEFINIR POSIÇÃO
    const posicao = {
      x: entity.x !== undefined ? entity.x : 100,
      y: entity.y !== undefined ? entity.y : 100
    };

    // 4. OBTER ELEMENTO PAI (PROCESSO BPMN)
    const elementoPai = this.obterElementoPai();

    // 5. VALIDAR ESTRUTURA SEMÂNTICA
    this.validarEstruturaSemántica(elementoBase, elementoPai);

    // 6. ADICIONAR AO CANVAS
    const elementoAdicionado = this.modeling.createShape(
      elementoBase,
      posicao,
      elementoPai
    );

    console.log(`📍 [Generator] Entidade "${entity.name}" posicionada em (${posicao.x}, ${posicao.y})`);
    
    return elementoAdicionado;
  }

  // ===================================================================
  // SECÇÃO 3: CRIAÇÃO DE CONEXÕES VISUAIS
  // ===================================================================

  /**
   * CRIAR CONEXÕES VISUAIS
   * Cria ligações visuais entre entidades
   * 
   * @param relationships - Array de relacionamentos
   * @param elementosEntidades - Mapeamento entidades→elementos visuais
   */
  private async criarConexoesVisuais(
    relationships: ErRelationship[], 
    elementosEntidades: Map<string, any>
  ): Promise<void> {
    console.log('🔗 [Generator] Criando conexões visuais');
    
    for (const relacionamento of relationships) {
      try {
        await this.criarConexaoIndividual(relacionamento, elementosEntidades);
        console.log(`✅ [Generator] Conexão "${relacionamento.from}" → "${relacionamento.to}" criada`);
      } catch (error) {
        console.error(`❌ [Generator] Erro ao criar conexão:`, error);
      }
    }
  }

  /**
   * CRIAR CONEXÃO INDIVIDUAL
   * Cria uma ligação visual entre duas entidades
   * 
   * @param relationship - Relacionamento ER
   * @param elementosEntidades - Mapeamento entidades→elementos
   */
  private async criarConexaoIndividual(
    relationship: ErRelationship, 
    elementosEntidades: Map<string, any>
  ): Promise<void> {
    // 1. OBTER ELEMENTOS ORIGEM E DESTINO
    const elementoOrigem = elementosEntidades.get(relationship.from);
    const elementoDestino = elementosEntidades.get(relationship.to);
    
    if (!elementoOrigem || !elementoDestino) {
      throw new Error(`Elementos não encontrados para conexão ${relationship.from} → ${relationship.to}`);
    }

    // 2. DEFINIR PROPRIEDADES DA CONEXÃO
    const propriedadesConexao = {
      type: 'bpmn:SequenceFlow',
      erType: 'Relationship',
      cardinality: relationship.cardinality,
      isIdentifying: relationship.isIdentifying || false
    };

    // 3. OBTER ELEMENTO PAI
    const elementoPai = this.obterElementoPai();

    // 4. VALIDAR ESTRUTURA
    this.validarEstruturaSemántica(propriedadesConexao, elementoPai);

    // 5. CRIAR CONEXÃO NO CANVAS
    const conexao = this.modeling.createConnection(
      elementoOrigem,
      elementoDestino,
      propriedadesConexao,
      elementoPai
    );

    // 6. APLICAR PROPRIEDADES CUSTOMIZADAS
    if (conexao && conexao.businessObject) {
      Object.assign(conexao.businessObject, {
        cardinality: relationship.cardinality,
        isIdentifying: relationship.isIdentifying
      });
    }
  }

  // ===================================================================
  // SECÇÃO 4: MÉTODOS DE APOIO
  // ===================================================================

  /**
   * PREPARAR CANVAS
   * Limpa canvas e configura estrutura semântica
   */
  private async prepararCanvas(): Promise<void> {
    console.log('🧹 [Generator] Preparando canvas');
    
    // Limpar canvas atual
    await this.clearCanvas();
    
    // Configurar estrutura semântica do processo
    this.configurarEstruturaSemántica();
  }

  /**
   * OBTER ELEMENTO PAI
   * Retorna o elemento pai (processo BPMN) para adicionar novos elementos
   * 
   * @returns any - Elemento pai ou root element
   */
  private obterElementoPai(): any {
    const elementoProcesso = this.elementRegistry.filter((element: any) => {
      return element.type === 'bpmn:Process';
    })[0];
    
    return elementoProcesso || this.canvas.getRootElement();
  }

  /**
   * VALIDAR ESTRUTURA SEMÂNTICA
   * Garante que elementos têm propriedades obrigatórias para BPMN.js
   * 
   * @param element - Elemento a validar
   * @param parentElement - Elemento pai
   */
  private validarEstruturaSemántica(element: any, parentElement: any): void {
    if (!element || !element.businessObject) {
      console.error('🚨 [Generator] Elemento ou businessObject é nulo');
      return;
    }

    const bo = element.businessObject;
    
    // Garantir propriedades obrigatórias
    if (!bo.$parent && parentElement && parentElement.businessObject) {
      bo.$parent = parentElement.businessObject;
    }
    
    if (!bo.id) {
      bo.id = element.id;
    }
    
    if (!bo.$attrs) {
      bo.$attrs = {};
    }
    
    // Garantir que elemento pai tem flowElements
    if (parentElement && parentElement.businessObject) {
      if (!parentElement.businessObject.flowElements) {
        parentElement.businessObject.flowElements = [];
      }
    }
    
    console.log(`✅ [Generator] Estrutura semântica validada para ${element.id}`);
  }

  /**
   * CONFIGURAR ESTRUTURA SEMÂNTICA
   * Configura propriedades semânticas do processo BPMN
   */
  private configurarEstruturaSemántica(): void {
    const elementoProcesso = this.elementRegistry.filter((element: any) => {
      return element.type === 'bpmn:Process';
    })[0];

    if (elementoProcesso && elementoProcesso.businessObject) {
      // Garantir flowElements
      if (!elementoProcesso.businessObject.flowElements) {
        elementoProcesso.businessObject.flowElements = [];
      }
      
      // Garantir $parent
      if (!elementoProcesso.businessObject.$parent) {
        elementoProcesso.businessObject.$parent = null;
      }
    }
    
    console.log('✅ [Generator] Estrutura semântica configurada');
  }

  /**
   * AJUSTAR VISUALIZAÇÃO
   * Aplica zoom e centralização final
   */
  private ajustarVisualizacao(): void {
    console.log('🔍 [Generator] Ajustando visualização');
    this.canvas.zoom('fit-viewport');
  }

  // ===================================================================
  // SECÇÃO 5: MÉTODOS LEGADOS (COMENTADOS)
  // ===================================================================
  
  /**
   * NOTA: Os seguintes métodos foram temporariamente desabilitados:
   * 
   * - applyDirectConnectionAnchoring() - Ancoragem inteligente
   * - calculateOptimizedWaypoints() - Cálculo de waypoints  
   * - shouldUseIntermediateWaypoints() - Decisão de waypoints
   * 
   * Razão: Simplificação para focar no essencial
   * Status: Podem ser reativados quando layout básico estiver estável
   */
}

// ===================================================================
// COMENTÁRIOS SOBRE ESTADO ATUAL
// ===================================================================
//
// FUNCIONALIDADES ACTIVAS:
// ✅ Criação de entidades visuais
// ✅ Posicionamento básico
// ✅ Estrutura semântica BPMN.js
// ✅ Conexões simples entre entidades
//
// FUNCIONALIDADES DESABILITADAS (TEMPORARIAMENTE):
// 🔴 Ancoragem inteligente de conexões
// 🔴 Waypoints otimizados
// 🔴 Roteamento avançado de ligações
//
// FOCO ACTUAL:
// 🎯 Layout básico funcional
// 🎯 Estrutura de código limpa e compreensível
// 🎯 Base sólida para melhorias incrementais
//
// ===================================================================