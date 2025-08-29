import React, { useState, useEffect } from 'react';
import './ErPropertiesPanel.css';
import { ConnectionProperties } from './properties/ConnectionProperties';
import { CompositeAttributeProperties } from './properties/CompositeAttributeProperties';
import { EntityProperties } from './properties/EntityProperties';
import { RelationshipProperties } from './properties/RelationshipProperties';
import { AttributeProperties } from './properties/AttributeProperties';
import { useElementProperties } from './hooks/useElementProperties';
import { usePropertyUpdater } from './hooks/usePropertyUpdater';

interface ErPropertiesPanelProps {
  element: any;
  elements?: any[];
  modeler: any;
}

interface ElementProperties {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

export const ErPropertiesPanel: React.FC<ErPropertiesPanelProps> = ({ element, elements = [], modeler }) => {
  // Additional state for property updates (needed by usePropertyUpdater)
  const [, setPropertiesState] = useState<ElementProperties | null>(null);
  
  // Use custom hooks for element properties and property updating
  const {
    properties,
    isER,
    selectedElements,
    localWidth,
    localHeight,
    setLocalWidth,
    setLocalHeight,
    loadElementProperties
  } = useElementProperties(element, modeler);

  const { updateProperty, updateElementSize } = usePropertyUpdater(element, modeler, setPropertiesState);

  // NOVA FUNÇÃO: Agrupar elementos selecionados em container composto
  const groupIntoCompositeContainer = () => {
    if (!modeler || selectedElements.length < 2) {
      console.warn('🚫 Não é possível agrupar: menos de 2 elementos selecionados');
      alert('⚠️ Selecione pelo menos 2 elementos para agrupar em container composto.\n\nUse Ctrl+clique para selecionar múltiplos elementos.');
      return;
    }

    // Filtrar apenas elementos ER (não conexões nem labels)
    const erElements = selectedElements.filter(el => 
      el.businessObject?.erType && el.type !== 'bpmn:SequenceFlow' && el.type !== 'label'
    );

    if (erElements.length < 2) {
      console.warn('🚫 Não é possível agrupar: menos de 2 elementos ER selecionados');
      alert('⚠️ Selecione pelo menos 2 elementos ER (entidades, atributos, relacionamentos) para agrupar.');
      return;
    }

    try {
      const erElementFactory = modeler.get('erElementFactory');
      const modeling = modeler.get('modeling');
      const elementRegistry = modeler.get('elementRegistry');
      
      // Capturar todas as conexões pai-filho ANTES do agrupamento
      const parentChildConnections = captureParentChildConnections(erElements, elementRegistry);
      
      // Calcular bounds exatos dos elementos nas suas posições atuais
      const bounds = calculateGroupBounds(erElements);
      
      // Usar dimensões ideais baseadas no conteúdo
      const idealSize = calculateIdealContainerSize(erElements);
      const containerWidth = idealSize.width;
      const containerHeight = idealSize.height;
      
      // Posição do container deve englobar os elementos nas suas posições atuais
      const containerPosition = {
        x: bounds.x - idealSize.padding.left,
        y: bounds.y - idealSize.padding.top
      };
      
      const containerShape = erElementFactory.createShape({
        type: 'bpmn:SubProcess',
        width: containerWidth,
        height: containerHeight,
        erType: 'CompositeAttribute',
        name: `Agrupamento (${erElements.length} elementos)`,
        isExpanded: true
      });
      
      const createdContainer = modeling.createShape(
        containerShape,
        containerPosition,
        modeler.get('canvas').getRootElement()
      );
      
      // Agrupar elementos no container SEM alterar suas posições
      setTimeout(() => {
        moveElementsToContainerPreservingConnections(erElements, createdContainer, modeling, parentChildConnections);
      }, 200);
      
    } catch (error) {
      console.error('❌ Erro ao agrupar elementos:', error);
      alert('Erro ao agrupar elementos. Verifique o console para detalhes.');
    }
  };

  // Função auxiliar: Calcular bounds de múltiplos elementos
  const calculateGroupBounds = (elements: any[]) => {
    if (elements.length === 0) return { x: 0, y: 0, width: 200, height: 150 };
    
    let minX = elements[0].x || 0;
    let minY = elements[0].y || 0;
    let maxX = minX + (elements[0].width || 80);
    let maxY = minY + (elements[0].height || 50);
    
    elements.forEach((element) => {
      const x = element.x || 0;
      const y = element.y || 0;
      const width = element.width || 80;
      const height = element.height || 50;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    
    const result = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
    
    return result;
  };

  // Nova função: Calcular dimensões ideais do container baseado no conteúdo
  const calculateIdealContainerSize = (elements: any[]) => {
    if (elements.length === 0) return { width: 150, height: 100, padding: { top: 25, right: 10, bottom: 10, left: 10 } };
    
    const bounds = calculateGroupBounds(elements);
    
    // Padding inteligente baseado no número e tipo de elementos
    const elementCount = elements.length;
    const titleHeight = 25; // Altura necessária para o título
    
    // Padding adaptativo - menos elementos = menos padding
    let paddingTop = titleHeight;
    let paddingRight = 8;
    let paddingBottom = 8;
    let paddingLeft = 8;
    
    // Ajustar padding baseado na quantidade de elementos
    if (elementCount <= 2) {
      // Poucos elementos = padding mínimo
      paddingRight = 6;
      paddingBottom = 6;
      paddingLeft = 6;
    } else if (elementCount <= 4) {
      // Elementos médios = padding normal
      paddingRight = 8;
      paddingBottom = 8;
      paddingLeft = 8;
    } else {
      // Muitos elementos = padding um pouco maior
      paddingRight = 10;
      paddingBottom = 10;
      paddingLeft = 10;
    }
    
    const idealWidth = bounds.width + paddingLeft + paddingRight;
    const idealHeight = bounds.height + paddingTop + paddingBottom;
    
    return {
      width: idealWidth,
      height: idealHeight,
      padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft }
    };
  };

  // Função melhorada para capturar TODAS as conexões pai-filho
  const captureParentChildConnections = (elements: any[], elementRegistry: any) => {
    const connections: any[] = [];
    const elementIds = new Set(elements.map(el => el.id));
    
    const allConnections = elementRegistry.getAll().filter((el: any) => 
      el.type === 'bpmn:SequenceFlow'
    );
    
    allConnections.forEach((conn: any) => {
      const sourceId = conn.source?.id;
      const targetId = conn.target?.id;
      const isParentChild = conn.businessObject?.isParentChild === true;
      const hasErElements = elementIds.has(sourceId) || elementIds.has(targetId);
      
      // Capturar TODAS as conexões que envolvem elementos selecionados
      // (não apenas pai-filho, mas todas para preservar)
      if (hasErElements && sourceId && targetId) {
        const connectionInfo = {
          id: conn.id,
          sourceId: sourceId,
          targetId: targetId,
          businessObject: { ...conn.businessObject },
          waypoints: conn.waypoints ? [...conn.waypoints] : [],
          isParentChild: isParentChild,
          originalConnection: conn
        };
        
        connections.push(connectionInfo);
      }
    });
    
    console.log('📋 Conexões capturadas:', connections.length);
    return connections;
  };

  // Função corrigida: Apenas definir parent-child sem alterar posições
  const moveElementsToContainerPreservingConnections = (
    elements: any[], 
    container: any, 
    modeling: any, 
    parentChildConnections: any[]
  ) => {
    try {
      console.log('🚀 Movendo elementos para container preservando conexões');
      
      // 1. ANTES: Log das posições atuais dos elementos
      elements.forEach((el, index) => {
        console.log(`📍 Elemento ${el.id} posição atual:`, { x: el.x, y: el.y });
      });
      
      // 2. Definir parent relationships usando modeling.moveElements com delta zero mas definindo parent
      setTimeout(() => {
        try {
          console.log('📦 Definindo relações de parent com modeling.moveElements');
          
          elements.forEach((element, index) => {
            console.log(`📦 Movendo ${element.id} para container com delta zero`);
            
            // CORRIGIDO: Usar moveElements com delta zero mas definindo parent
            modeling.moveElements([element], { x: 0, y: 0 }, container);
          });
          
          // 3. DEPOIS: Log das posições após agrupamento
          setTimeout(() => {
            elements.forEach((el, index) => {
              console.log(`📍 Elemento ${el.id} posição final:`, { x: el.x, y: el.y });
            });
            
            // 5. Recriar conexões pai-filho perdidas
            if (parentChildConnections.length > 0) {
              setTimeout(() => {
                recreateParentChildConnections(parentChildConnections, elements, container, modeling);
              }, 150);
            }
            
          }, 100);
          
        } catch (parentError) {
          console.error('❌ Erro ao definir relações de parent:', parentError);
        }
      }, 100);
      
      // Selecionar o container criado
      setTimeout(() => {
        try {
          const selection = modeler.get('selection');
          selection.select(container);
        } catch (selectionError) {
          console.warn('⚠️ Erro ao selecionar container:', selectionError);
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Erro ao agrupar elementos no container:', error);
    }
  };

  // Função melhorada para recriar conexões preservadas
  const recreateParentChildConnections = (
    capturedConnections: any[], 
    movedElements: any[], 
    container: any, 
    modeling: any
  ) => {
    try {
      console.log('🔄 Recriando conexões preservadas');
      
      const elementRegistry = modeler.get('elementRegistry');
      
      // Primeiro, verificar se as conexões originais ainda existem
      capturedConnections.forEach((connInfo, index) => {
        const originalExists = elementRegistry.get(connInfo.id);
        
        if (!originalExists) {
          console.log('🔍 Conexão perdida, tentando recriar:', connInfo.sourceId, '→', connInfo.targetId);
          
          const sourceElement = elementRegistry.get(connInfo.sourceId);
          const targetElement = elementRegistry.get(connInfo.targetId);
          
          if (sourceElement && targetElement) {
            try {
              console.log('✨ Recriando conexão entre elementos válidos');
              
              // Usar estratégia mais simples - apenas criar nova conexão
              const newConnectionAttrs: any = {
                type: 'bpmn:SequenceFlow',
                source: sourceElement,
                target: targetElement
              };
              
              // Preservar propriedades da conexão original
              if (connInfo.isParentChild) {
                newConnectionAttrs.isParentChild = true;
              }
              
              if (connInfo.businessObject?.cardinalitySource) {
                newConnectionAttrs.cardinalitySource = connInfo.businessObject.cardinalitySource;
              }
              
              if (connInfo.businessObject?.cardinalityTarget) {
                newConnectionAttrs.cardinalityTarget = connInfo.businessObject.cardinalityTarget;
              }
              
              const elementFactory = modeler.get('elementFactory');
              const newConnection = elementFactory.createConnection(newConnectionAttrs);
              const createdConnection = modeling.createConnection(sourceElement, targetElement, newConnection, container);
              
              // Aplicar propriedades adicionais
              if (createdConnection) {
                setTimeout(() => {
                  try {
                    const updateProps: any = {};
                    
                    if (connInfo.isParentChild) {
                      updateProps.isParentChild = true;
                    }
                    
                    if (connInfo.businessObject?.name) {
                      updateProps.name = connInfo.businessObject.name;
                    }
                    
                    if (Object.keys(updateProps).length > 0) {
                      modeling.updateProperties(createdConnection, updateProps);
                    }
                    
                    console.log('✅ Propriedades aplicadas à conexão recriada');
                    
                  } catch (propError) {
                    console.warn('⚠️ Erro ao aplicar propriedades:', propError);
                  }
                }, 50);
              }
              
            } catch (createError) {
              console.error('❌ Erro ao criar conexão:', createError);
            }
          } else {
            console.warn('⚠️ Elementos source/target não encontrados para:', connInfo.sourceId, connInfo.targetId);
          }
        } else {
          console.log('✅ Conexão original ainda existe:', connInfo.id);
        }
      });
      
      console.log('🏁 Processo de recriação de conexões concluído');
      
    } catch (error) {
      console.error('❌ Erro geral ao recriar conexões:', error);
    }
  };

  const addSubAttribute = () => {
    if (!element || !modeler) {
      console.warn('🚫 Não é possível adicionar sub-atributo: elemento ou modeler inválido');
      return;
    }
    
    // Verificar se é atributo composto (UserTask ou SubProcess)
    const isCompositeUserTask = properties?.erType === 'Attribute' && properties?.isComposite;
    const isCompositeSubProcess = properties?.erType === 'CompositeAttribute';
    
    if (!isCompositeUserTask && !isCompositeSubProcess) {
      console.warn('🚫 Não é possível adicionar sub-atributo: elemento não é composto');
      return;
    }

    try {
      console.log('🏗️ ✨ Criando sub-atributo para elemento composto:', element.id, 'tipo:', isCompositeSubProcess ? 'SubProcess' : 'UserTask');
      
      const erElementFactory = modeler.get('erElementFactory');
      const modeling = modeler.get('modeling');
      
      // Calcular posição para o sub-atributo COM DETECÇÃO DE COLISÃO
      const parentX = element.x || 0;
      const parentY = element.y || 0;
      const parentWidth = element.width || 80;
      const parentHeight = element.height || 50;
      
      let subAttrX: number;
      let subAttrY: number;
      let parentElement: any;
      
      // Função para verificar se uma posição colide com elementos existentes
      const checkCollision = (x: number, y: number, width: number = 80, height: number = 50): boolean => {
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        
        const newElementBounds = {
          x: x,
          y: y,
          width: width,
          height: height
        };
        
        for (const existingElement of allElements) {
          // Pular conexões, labels e o próprio elemento pai
          if (!existingElement.x || !existingElement.y || 
              existingElement.type === 'bpmn:SequenceFlow' || 
              existingElement.type === 'label' ||
              existingElement.id === element.id) {
            continue;
          }
          
          const existingBounds = {
            x: existingElement.x,
            y: existingElement.y,
            width: existingElement.width || 80,
            height: existingElement.height || 50
          };
          
          // Verificar sobreposição com margem de segurança de 10px
          const margin = 10;
          if (!(newElementBounds.x + newElementBounds.width + margin <= existingBounds.x || 
                existingBounds.x + existingBounds.width + margin <= newElementBounds.x || 
                newElementBounds.y + newElementBounds.height + margin <= existingBounds.y || 
                existingBounds.y + existingBounds.height + margin <= newElementBounds.y)) {
            return true; // Há colisão
          }
        }
        
        return false; // Sem colisão
      };
      
      // Função para encontrar posição livre
      const findFreePosition = (startX: number, startY: number, searchRadius: number = 200): {x: number, y: number} => {
        const subAttrWidth = 80;
        const subAttrHeight = 50;
        const step = 20; // Incremento de busca
        
        // Primeiro tentar a posição inicial
        if (!checkCollision(startX, startY, subAttrWidth, subAttrHeight)) {
          return { x: startX, y: startY };
        }
        
        // Busca em espiral partindo da posição inicial
        for (let radius = step; radius <= searchRadius; radius += step) {
          // Tentar várias posições ao redor da posição inicial
          const positions = [
            { x: startX + radius, y: startY }, // Direita
            { x: startX, y: startY + radius }, // Baixo
            { x: startX - radius, y: startY }, // Esquerda
            { x: startX, y: startY - radius }, // Cima
            { x: startX + radius, y: startY + radius }, // Diagonal inferior direita
            { x: startX - radius, y: startY + radius }, // Diagonal inferior esquerda
            { x: startX + radius, y: startY - radius }, // Diagonal superior direita
            { x: startX - radius, y: startY - radius }, // Diagonal superior esquerda
          ];
          
          for (const pos of positions) {
            if (!checkCollision(pos.x, pos.y, subAttrWidth, subAttrHeight)) {
              console.log('🎯 Posição livre encontrada:', pos, 'após busca de raio', radius);
              return pos;
            }
          }
        }
        
        // Se não encontrar posição livre, retornar posição original com offset extra
        console.log('⚠️ Nenhuma posição livre encontrada, usando posição com offset extra');
        return { x: startX + 100, y: startY + 100 };
      };
      
      if (isCompositeSubProcess) {
        // Para SubProcess: colocar sub-atributo DENTRO do container evitando colisões
        const initialX = 30; // Margem interna relativa ao container
        const initialY = 60; // Abaixo do título relativo ao container
        
        // Buscar posição livre dentro do container
        const freePosition = findFreePosition(initialX, initialY, 150);
        subAttrX = freePosition.x;
        subAttrY = freePosition.y;
        
        parentElement = element; // Usar o próprio SubProcess como pai
        console.log('📦 Sub-atributo será criado DENTRO do container SubProcess na posição livre:', { x: subAttrX, y: subAttrY });
      } else {
        // Para UserTask: colocar sub-atributo AO LADO evitando colisões
        const initialX = parentX + 20;
        const initialY = parentY + parentHeight + 30;
        
        // Buscar posição livre ao redor do atributo pai
        const freePosition = findFreePosition(initialX, initialY);
        subAttrX = freePosition.x;
        subAttrY = freePosition.y;
        
        parentElement = modeler.get('canvas').getRootElement(); // Canvas root
        console.log('🔗 Sub-atributo será colocado ao lado com conexão na posição livre:', { x: subAttrX, y: subAttrY });
      }
      
      // Gerar nome único para o sub-atributo
      const generateUniqueSubAttributeName = (): string => {
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        
        // Contar sub-atributos existentes para este elemento pai
        let subAttributeCount = 0;
        for (const existingElement of allElements) {
          if (existingElement.type === 'bpmn:UserTask' && 
              existingElement.businessObject?.erType === 'Attribute' &&
              existingElement.businessObject?.isSubAttribute === true &&
              (existingElement.parent?.id === element.id || 
               (existingElement.businessObject?.name && existingElement.businessObject.name.startsWith('Sub-atributo')))) {
            subAttributeCount++;
          }
        }
        
        // Gerar nome único
        if (subAttributeCount === 0) {
          return 'Sub-atributo';
        } else {
          return `Sub-atributo ${subAttributeCount + 1}`;
        }
      };
      
      const uniqueName = generateUniqueSubAttributeName();
      console.log('📝 Nome único gerado para novo sub-atributo:', uniqueName);
      
      // Criar sub-atributo usando ErElementFactory para garantir propriedades ER corretas
      const subAttributeShape = erElementFactory.createShape({
        type: 'bpmn:UserTask',
        width: 80,
        height: 50,
        erType: 'Attribute',
        name: uniqueName,
        isRequired: true,
        isPrimaryKey: false,
        isForeignKey: false,
        isMultivalued: false,
        isDerived: false,
        isComposite: false,
        isSubAttribute: true,
        dataType: 'VARCHAR'
      });
      
      console.log('🏗️ Sub-atributo criado via ErElementFactory:', subAttributeShape.id);
      console.log('🔍 Sub-atributo businessObject.erType:', subAttributeShape.businessObject?.erType);
      console.log('🔍 Sub-atributo $attrs:', subAttributeShape.businessObject?.$attrs);
      
      // Adicionar o sub-atributo ao diagrama na posição calculada
      const createdElement = modeling.createShape(
        subAttributeShape,
        { x: subAttrX, y: subAttrY },
        parentElement
      );
      
      console.log('✅ Sub-atributo adicionado ao diagrama:', createdElement.id, 'posição:', { x: subAttrX, y: subAttrY });
      console.log('🔍 CreatedElement businessObject.erType:', createdElement.businessObject?.erType);
      console.log('🔍 CreatedElement $attrs:', createdElement.businessObject?.$attrs);
      console.log('🔍 Parent element:', parentElement === element ? 'Dentro do SubProcess' : 'Canvas root');
      
      // ✨ GARANTIR VISIBILIDADE: Auto-scroll e seleção do novo sub-atributo
      setTimeout(() => {
        try {
          const canvas = modeler.get('canvas');
          const selection = modeler.get('selection');
          
          // 1. Centralizar visualização no novo elemento
          const elementCenter = {
            x: createdElement.x + (createdElement.width || 80) / 2,
            y: createdElement.y + (createdElement.height || 50) / 2
          };
          
          // Fazer scroll suave para o elemento
          canvas.scroll(elementCenter);
          console.log('📍 Canvas centralizado no novo sub-atributo:', elementCenter);
          
          // 2. Selecionar o novo elemento para destacá-lo
          selection.select(createdElement);
          console.log('🎯 Novo sub-atributo selecionado automaticamente');
          
        } catch (visibilityError) {
          console.warn('⚠️ Erro ao garantir visibilidade do sub-atributo:', visibilityError);
        }
      }, 400); // Aguardar renderização completa
      
      // Diagnóstico detalhado do elemento criado
      setTimeout(() => {
        console.log('🔍 DIAGNÓSTICO COMPLETO DO SUB-ATRIBUTO:');
        console.log('  - Element ID:', createdElement.id);
        console.log('  - Element type:', createdElement.type);
        console.log('  - Element width/height:', createdElement.width, 'x', createdElement.height);
        console.log('  - Element x/y:', createdElement.x, createdElement.y);
        console.log('  - Element parent:', createdElement.parent?.id);
        console.log('  - Element parent type:', createdElement.parent?.type);
        console.log('  - Element businessObject:', createdElement.businessObject);
        console.log('  - Element hidden?:', createdElement.hidden);
        
        // Verificar se está no elementRegistry
        const elementRegistry = modeler.get('elementRegistry');
        const registeredElement = elementRegistry.get(createdElement.id);
        console.log('🔍 Elemento no registry?:', registeredElement ? 'SIM' : 'NÃO');
        if (registeredElement) {
          console.log('  - Registry element:', registeredElement);
        }
        
        // Verificar se tem graphics/SVG
        const canvas = modeler.get('canvas');
        try {
          const gfx = canvas.getGraphics(createdElement);
          console.log('🔍 Elemento tem graphics?:', gfx ? 'SIM' : 'NÃO');
          if (gfx) {
            console.log('  - Graphics element:', gfx);
            console.log('  - Graphics innerHTML:', gfx.innerHTML);
            console.log('  - Graphics style display:', gfx.style.display);
            console.log('  - Graphics style visibility:', gfx.style.visibility);
            console.log('  - Graphics style pointerEvents:', gfx.style.pointerEvents);
            console.log('  - Graphics clientWidth/Height:', gfx.clientWidth, 'x', gfx.clientHeight);
            console.log('  - Graphics getBoundingClientRect:', gfx.getBoundingClientRect());
          }
        } catch (gfxError) {
          console.warn('  - Erro ao obter graphics:', gfxError);
        }

        // Teste de interatividade
        try {
          const eventBus = modeler.get('eventBus');
          
          // Listener temporário para detectar cliques no elemento
          const testClickHandler = (event: any) => {
            if (event.element && event.element.id === createdElement.id) {
              console.log('🎯 SUCESSO: Sub-atributo', createdElement.id, 'recebeu evento de clique!');
              eventBus.off('element.click', testClickHandler);
            }
          };
          
          eventBus.on('element.click', testClickHandler);
          
          // Remove o handler depois de 10 segundos
          setTimeout(() => {
            eventBus.off('element.click', testClickHandler);
          }, 10000);
          
          console.log('🎯 Listener de teste adicionado - clique no sub-atributo para testar interatividade');
        } catch (interactivityError) {
          console.warn('  - Erro ao configurar teste de interatividade:', interactivityError);
        }

        // CORREÇÕES FOCADAS NA HIT AREA PARA SELEÇÃO
        try {
          const canvas = modeler.get('canvas');
          const gfx = canvas.getGraphics(createdElement);
          
          if (gfx) {
            console.log('🔧 Aplicando correções focadas na hit area...');
            
            // 1. Encontrar ou criar a hit area correta
            let hitArea = gfx.querySelector('.djs-hit');
            
            if (!hitArea) {
              console.log('🔧 Hit area não encontrada, criando nova...');
              
              // Criar hit area manualmente
              hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              hitArea.setAttribute('class', 'djs-hit djs-hit-all');
              hitArea.setAttribute('x', '0');
              hitArea.setAttribute('y', '0');
              hitArea.setAttribute('width', '80');
              hitArea.setAttribute('height', '50');
              hitArea.setAttribute('fill', 'none');
              hitArea.setAttribute('stroke', 'none');
              hitArea.style.pointerEvents = 'all';
              
              // Inserir no início do gfx para que seja a primeira camada de hit detection
              gfx.insertBefore(hitArea, gfx.firstChild);
              console.log('✅ Hit area criada e inserida');
            } else {
              console.log('🔧 Hit area encontrada, corrigindo dimensões...');
              
              // Corrigir hit area existente
              hitArea.setAttribute('width', '80');
              hitArea.setAttribute('height', '50');
              hitArea.style.pointerEvents = 'all';
            }
            
            // 2. Garantir que toda a árvore de elementos tem pointer-events corretos
            gfx.style.pointerEvents = 'all';
            const allChildren = gfx.querySelectorAll('*');
            allChildren.forEach((child: any) => {
              if (child.classList.contains('djs-hit')) {
                child.style.pointerEvents = 'all';
              }
            });
            
            // 3. Forçar o elemento a ser "clickável" via CSS específico para SVG
            gfx.style.cursor = 'pointer';
            gfx.setAttribute('data-selectable', 'true');
            
            // 4. Garantir que está na camada de interação correta
            const parent = gfx.parentElement;
            if (parent) {
              parent.style.pointerEvents = 'all';
              
              // Mover para o final para estar "por cima" de outros elementos
              parent.appendChild(gfx);
            }
            
            // 5. Forçar refresh dos listeners de evento
            const eventBus = modeler.get('eventBus');
            const graphicsFactory = modeler.get('graphicsFactory');
            
            try {
              // Simular um refresh do sistema de eventos
              eventBus.fire('elements.changed', { elements: [createdElement] });
              console.log('🔄 Eventos de elemento atualizados');
            } catch (eventError) {
              console.warn('⚠️ Erro ao atualizar eventos:', eventError);
            }
            
            console.log('✅ Correções de hit area aplicadas');
            
            // Verificação imediata e tardia
            const verifyHitArea = () => {
              console.log('🔍 Verificação da hit area:');
              console.log('  - Hit area encontrada:', !!gfx.querySelector('.djs-hit'));
              console.log('  - Graphics tem cursor pointer:', gfx.style.cursor === 'pointer');
              console.log('  - Graphics data-selectable:', gfx.getAttribute('data-selectable'));
              console.log('  - Graphics getBoundingClientRect:', gfx.getBoundingClientRect());
              
              const hitRect = gfx.querySelector('.djs-hit');
              if (hitRect) {
                console.log('  - Hit rect width/height:', hitRect.getAttribute('width'), 'x', hitRect.getAttribute('height'));
                console.log('  - Hit rect pointerEvents:', hitRect.style.pointerEvents);
                console.log('  - Hit rect getBoundingClientRect:', hitRect.getBoundingClientRect());
              }
            };
            
            verifyHitArea();
            setTimeout(verifyHitArea, 100);
          }
        } catch (correctionError) {
          console.warn('⚠️ Erro ao aplicar correções de hit area:', correctionError);
        }
      }, 100); // Pequeno delay para garantir que renderização terminou
      
      // Criar conexão visual APENAS para UserTask (não para SubProcess, pois sub-atributos já estão dentro)
      if (!isCompositeSubProcess) {
        console.log('🔗 Criando conexão visual entre container', element.id, 'e sub-atributo', createdElement.id);
        
        try {
          // Use elementFactory padrão para conexões (não precisa do ErElementFactory)
          const elementFactory = modeler.get('elementFactory');
          const connectionShape = elementFactory.createConnection({
            type: 'bpmn:SequenceFlow',
            source: element,
            target: createdElement,
            waypoints: [
              { x: parentX + parentWidth / 2, y: parentY + parentHeight },
              { x: subAttrX + 40, y: subAttrY }
            ]
          });
          
          const connection = modeling.createConnection(
            element,
            createdElement,
            connectionShape,
            modeler.get('canvas').getRootElement()
          );
          
          console.log('✅ Conexão criada entre container e sub-atributo:', connection.id);
        
        // Marcar a conexão como uma conexão pai-filho para estilização especial
        if (connection.businessObject) {
          connection.businessObject.isParentChild = true;
          // Adicionar tipo específico para containers compostos
          if (isCompositeSubProcess) {
            connection.businessObject.isCompositeContainment = true;
          }
          
          // Use modeling.updateProperties em vez de manipulação direta de $attrs
          try {
            const updateProps: any = { isParentChild: true };
            if (isCompositeSubProcess) {
              updateProps.isCompositeContainment = true;
            }
            
            modeling.updateProperties(connection, updateProps);
            console.log('🔗 Conexão marcada como', isCompositeSubProcess ? 'containment composto' : 'pai-filho tradicional');
          } catch (attrError) {
            console.warn('⚠️ Erro ao definir propriedades da conexão:', attrError);
          }
        }
        
        } catch (connectionError) {
          console.warn('⚠️ Erro ao criar conexão visual:', connectionError);
          console.warn('⚠️ Sub-atributo foi criado mas sem conexão visual');
        }
      } else {
        console.log('📦 Sub-atributo criado dentro do SubProcess - não criando conexão visual (containment físico)');
      }

      // ✨ REORGANIZAR sub-atributos após criação
      setTimeout(() => {
         console.log('🎯 ErPropertiesPanel: Tentando obter erMoveRules do modeler...');
         
         try {
           const erMoveRules = modeler.get('erMoveRules');
           console.log('🎯 ErPropertiesPanel: erMoveRules obtido:', erMoveRules);
           console.log('🎯 ErPropertiesPanel: reorganizeSubAttributes disponível?', typeof erMoveRules?.reorganizeSubAttributes);
           
           if (erMoveRules && typeof erMoveRules.reorganizeSubAttributes === 'function') {
             console.log('🎯 ✨ ErPropertiesPanel: Chamando reorganização de sub-atributos após criação');
             erMoveRules.reorganizeSubAttributes(element);
           } else {
             console.warn('⚠️ ErPropertiesPanel: ErMoveRules não disponível para reorganização');
             console.log('🔍 ErPropertiesPanel: Serviços disponíveis no modeler:', Object.keys(modeler._container || {}));
           }
         } catch (serviceError) {
           console.error('❌ ErPropertiesPanel: Erro ao obter erMoveRules:', serviceError);
         }
       }, 300);
      
    } catch (error) {
      console.error('❌ Erro ao criar sub-atributo:', error);
      alert('Erro ao criar sub-atributo. Verifique o console para detalhes.');
    }
  };


  // Handlers para dimensões com debounce/throttling
  const handleWidthChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setLocalWidth(numValue);
    
    if (numValue >= 50) {
      updateElementSize('width', numValue, element, modeler);
    }
  };

  const handleHeightChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setLocalHeight(numValue);
    
    if (numValue >= 30) {
      updateElementSize('height', numValue, element, modeler);
    }
  };

  // Verificar se é elemento dentro de container composto
  const isElementInsideContainer = (element: any): boolean => {
    if (!element || !element.parent) return false;
    
    const parentIsSubProcess = element.parent.type === 'bpmn:SubProcess';
    const parentIsComposite = element.parent.businessObject?.erType === 'CompositeAttribute';
    
    return parentIsSubProcess && parentIsComposite;
  };

  // INTERFACE DE SELEÇÃO MÚTIPLA MELHORADA
  if (selectedElements.length > 1) {
    const erElementsCount = selectedElements.filter(el => 
      el.businessObject?.erType && el.type !== 'bpmn:SequenceFlow' && el.type !== 'label'
    ).length;

    const connectionsCount = selectedElements.filter(el => 
      el.type === 'bpmn:SequenceFlow'
    ).length;

    // CATEGORIZAR elementos selecionados por tipo
    const elementsByType = {
      entities: selectedElements.filter(el => 
        el.businessObject?.erType === 'Entity' && el.type !== 'label'
      ),
      relationships: selectedElements.filter(el => 
        el.businessObject?.erType === 'Relationship' && el.type !== 'label'
      ),
      attributes: selectedElements.filter(el => 
        el.businessObject?.erType === 'Attribute' && el.type !== 'label'
      ),
      containers: selectedElements.filter(el => 
        el.businessObject?.erType === 'CompositeAttribute' && el.type !== 'label'
      ),
      connections: selectedElements.filter(el => el.type === 'bpmn:SequenceFlow')
    };


    return (
      <div className="er-properties-panel">
        <div className="er-properties-header" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '8px 8px 0 0',
          marginBottom: '0'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
            Seleção Múltipla ({erElementsCount + connectionsCount} elementos)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
            Shift+Click para modificar seleção
          </p>
        </div>

        <div className="er-properties-content" style={{ padding: '20px' }}>
          {/* RESUMO DA SELEÇÃO COM VISUAL MELHORADO */}
          <div className="property-group" style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '14px' }}>
              Resumo da Seleção
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '12px'
            }}>
              {elementsByType.entities.length > 0 && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  padding: '8px',
                  textAlign: 'center'
                }}>                  
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400e' }}>
                    {elementsByType.entities.length} Entidades
                  </div>
                </div>
              )}
              
              {elementsByType.relationships.length > 0 && (
                <div style={{
                  background: '#fce7f3',
                  border: '1px solid #f472b6',
                  borderRadius: '6px',
                  padding: '8px',
                  textAlign: 'center'
                }}>                  
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#9d174d' }}>
                    {elementsByType.relationships.length} Relacionamentos
                  </div>
                </div>
              )}
              
              {elementsByType.attributes.length > 0 && (
                <div style={{
                  background: '#dcfce7',
                  border: '1px solid #22c55e',
                  borderRadius: '6px',
                  padding: '8px',
                  textAlign: 'center'
                }}>                  
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#15803d' }}>
                    {elementsByType.attributes.length} Atributos
                  </div>
                </div>
              )}
              
              {elementsByType.containers.length > 0 && (
                <div style={{
                  background: '#e0e7ff',
                  border: '1px solid #6366f1',
                  borderRadius: '6px',
                  padding: '8px',
                  textAlign: 'center'
                }}>                  
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#4338ca' }}>
                    {elementsByType.containers.length} Containers
                  </div>
                </div>
              )}
              
              {elementsByType.connections.length > 0 && (
                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #64748b',
                  borderRadius: '6px',
                  padding: '8px',
                  textAlign: 'center'
                }}>                  
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                    {elementsByType.connections.length} Conexões
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AÇÕES PRINCIPAIS - BOTÃO AGRUPAR DESTACADO */}
          {erElementsCount >= 2 && (
            <div className="property-group" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'white' }}>
                Agrupar em Container Composto
              </h4>
              
              <p style={{ 
                margin: '0 0 16px 0', 
                fontSize: '13px', 
                opacity: 0.9,
                lineHeight: 1.4
              }}>
                {elementsByType.attributes.length >= 2 
                  ? `${elementsByType.attributes.length} atributos prontos para agrupamento hierárquico`
                  : `Agrupe ${erElementsCount} elementos ER em uma estrutura composta`
                }
              </p>
              
              <button 
                type="button"
                onClick={groupIntoCompositeContainer}
                style={{
                  padding: '14px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#059669',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '700',
                  width: '100%',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                {elementsByType.attributes.length >= 2 
                  ? `Agrupar ${elementsByType.attributes.length} Atributos`
                  : `Criar Container (${erElementsCount} elementos)`
                }
              </button>
            </div>
          )}


          {/* LISTA DETALHADA DOS ELEMENTOS SELECIONADOS */}
          <div className="property-group">
            <h4 style={{ margin: '0 0 16px 0', color: '#334155', fontSize: '14px' }}>
              Elementos na Seleção
            </h4>
            
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              background: '#f8fafc',
              borderRadius: '6px',
              padding: '12px'
            }}>
              {selectedElements
                .filter(el => el.type !== 'label')
                .filter((el, index, arr) => 
                  arr.findIndex(other => 
                    el.id && other.id && (other.id === el.id || other.id === el.id.replace('_label', '') || el.id === other.id.replace('_label', ''))
                  ) === index
                )
                .map((el, index) => {
                const isER = el.businessObject?.erType;
                const name = el.businessObject?.name || el.id;
                const type = el.businessObject?.erType || (el.type === 'bpmn:SequenceFlow' ? 'Conexão' : 'Elemento');
                
                let icon = '*';
                let bgColor = '#e2e8f0';
                let textColor = '#64748b';
                
                if (type === 'Entity') { bgColor = '#fef3c7'; textColor = '#92400e'; }
                else if (type === 'Relationship') { bgColor = '#fce7f3'; textColor = '#9d174d'; }
                else if (type === 'Attribute') { bgColor = '#dcfce7'; textColor = '#15803d'; }
                else if (type === 'CompositeAttribute') { bgColor = '#e0e7ff'; textColor = '#4338ca'; }
                else if (type === 'Conexão') { bgColor = '#f1f5f9'; textColor = '#475569'; }
                
                return (
                  <div 
                    key={el.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      marginBottom: index < selectedElements.length - 1 ? '4px' : 0,
                      background: bgColor,
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: textColor
                    }}
                  >
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>{icon}</span>
                    <span style={{ fontWeight: '600', flex: 1 }}>{name}</span>
                    <span style={{ fontSize: '10px', opacity: 0.7 }}>{type}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DICAS E INFORMAÇÕES */}
          <div className="property-group" style={{
            background: '#eff6ff',
            border: '1px solid #93c5fd',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#1e40af' }}>
              💡 Dicas de Uso
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '16px',
              fontSize: '11px',
              color: '#1e40af',
              lineHeight: 1.5
            }}>
              <li>Use <strong>Shift+Click</strong> para adicionar/remover elementos da seleção</li>
              <li>Selecione apenas um elemento para ver propriedades detalhadas</li>
              <li>O agrupamento preserva posições e conexões originais</li>
              {elementsByType.attributes.length >= 2 && (
                <li><strong>Agrupamento recomendado:</strong> Atributos relacionados detectados</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!isER || !properties) {
    return (
      <div className="er-properties-panel">
        <div className="er-properties-header">
          <h3>Propriedades</h3>
        </div>
        <div className="er-properties-content">
          <p className="no-selection">
            {!element ? 'Nenhum elemento selecionado' : 'Selecione um elemento ER para editar propriedades'}
          </p>
          {selectedElements.length > 1 && (
            <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '10px' }}>
              {selectedElements.length} elementos selecionados - use Ctrl+clique para seleção múltipla
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="er-properties-panel">
      <div className="er-properties-header">
        <h3>Propriedades - {properties.isConnection ? 'Conexão' : getElementTypeLabel(properties.erType)}</h3>
      </div>

      <div className="er-properties-content">
        {/* Propriedades Gerais */}
        <div className="property-group">
          <h4>Geral</h4>
          
          <div className="property-field">
            <label>ID:</label>
            <input 
              type="text" 
              value={properties.id} 
              disabled 
              className="readonly"
            />
          </div>

          <div className="property-field">
            <label>Nome:</label>
            <input 
              type="text" 
              value={properties.name || ''} 
              onChange={(e) => updateProperty('name', e.target.value)}
              placeholder="Digite o nome..."
            />
          </div>
        </div>

        {/* Propriedades Específicas por Tipo */}
        {properties.erType === 'Entity' && (
          <EntityProperties properties={properties} updateProperty={updateProperty} />
        )}

        {properties.erType === 'Relationship' && (
          <RelationshipProperties properties={properties} updateProperty={updateProperty} />
        )}

        {properties.erType === 'Attribute' && (
          <AttributeProperties 
            properties={properties} 
            updateProperty={updateProperty} 
            element={element}
            modeler={modeler}
            addSubAttribute={addSubAttribute}
          />
        )}

        {properties.erType === 'CompositeAttribute' && (
          <CompositeAttributeProperties 
            properties={properties} 
            updateProperty={updateProperty} 
            element={element}
            modeler={modeler}
          />
        )}

        {properties.isConnection && (
          <ConnectionProperties properties={properties} updateProperty={updateProperty} />
        )}

        {/* Propriedades de Posição - só mostrar quando há elemento válido e NÃO está dentro de container */}
        {element && !isElementInsideContainer(element) && (
          <div className="property-group">
            <h4>Posição e Tamanho</h4>
            
            <div className="property-row">
              <div className="property-field">
                <label>Largura:</label>
                <input 
                  type="number" 
                  value={localWidth} 
                  onChange={(e) => handleWidthChange(e.target.value)}
                  min="50"
                />
              </div>
              
              <div className="property-field">
                <label>Altura:</label>
                <input 
                  type="number" 
                  value={localHeight} 
                  onChange={(e) => handleHeightChange(e.target.value)}
                  min="30"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to update element size



/**
 * Verificar se um elemento é um sub-atributo
 * Sub-atributos são identificados por:
 * 1. Propriedade isSubAttribute no businessObject
 * 2. Conexões pai-filho com atributos compostos
 */
const isSubAttribute = (element: any, modeler: any): boolean => {
  if (!element || !modeler) {
    return false;
  }
  
  try {
    // Verificar primeiro se tem a propriedade isSubAttribute diretamente
    if (element.businessObject?.isSubAttribute === true) {
      console.log('🔍 Sub-atributo detectado via propriedade isSubAttribute:', element.id);
      return true;
    }
    
    // Fallback: verificar por conexões pai-filho (método antigo)
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Procurar por conexões que terminam neste elemento
    const incomingConnections = allElements.filter((conn: any) => {
      return conn.type === 'bpmn:SequenceFlow' &&
             conn.target?.id === element.id &&
             conn.businessObject?.isParentChild === true;
    });
    
    if (incomingConnections.length > 0) {
      console.log('🔍 Sub-atributo detectado via conexão pai-filho:', element.id);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Erro ao detectar sub-atributo:', error);
    return false;
  }
};






// Função helper para labels dos tipos
function getElementTypeLabel(erType: string): string {
  switch (erType) {
    case 'Entity': return 'Entidade';
    case 'Relationship': return 'Relacionamento';
    case 'Attribute': return 'Atributo';
    default: return erType || 'Elemento';
  }
}

export default ErPropertiesPanel;

// Fazer este arquivo ser reconhecido como módulo
export {};