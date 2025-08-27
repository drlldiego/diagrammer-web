import React, { useState, useEffect } from 'react';
import './ErPropertiesPanel.css';

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
  const [properties, setProperties] = useState<ElementProperties | null>(null);
  const [isER, setIsER] = useState(false);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  
  // Estados locais para dimensões editáveis
  const [localWidth, setLocalWidth] = useState<number>(0);
  const [localHeight, setLocalHeight] = useState<number>(0);

  // ✨ Função para carregar propriedades do elemento
  const loadElementProperties = () => {
    if (!element) {
      setProperties(null);
      setIsER(false);
      setLocalWidth(0);
      setLocalHeight(0);
      setSelectedElements([]);
      return;
    }

    // ✨ NOVO: Detectar seleção múltipla
    if (modeler) {
      try {
        const selection = modeler.get('selection');
        const allSelected = selection.get();
        setSelectedElements(allSelected);
      } catch (error) {
        console.warn('⚠️ Erro ao obter seleção:', error);
        setSelectedElements([element]);
      }
    } else {
      setSelectedElements([element]);
    }

    // Verificar se é conexão
    const isConnection = element.type && (element.type === 'bpmn:SequenceFlow' || element.waypoints);
    
    // Verificar se é elemento ER pelos nossos tipos customizados  
    const isErElement = element.businessObject && element.businessObject.erType;
    
    setIsER(isErElement || isConnection);

    if (isErElement) {
      const loadedProperties = {
        id: element.businessObject.id || element.id,
        name: element.businessObject.name || '',
        type: element.type,
        ...element.businessObject
      };
      
      setProperties(loadedProperties);
      
      // Sincronizar dimensões locais
      setLocalWidth(element.width || 120);
      setLocalHeight(element.height || 80);
    } else if (isConnection) {
      // Propriedades para conexões
      const connectionProperties = {
        id: element.id,
        name: 'Conexão ER',
        type: element.type,
        cardinalitySource: element.businessObject?.cardinalitySource || '1',
        cardinalityTarget: element.businessObject?.cardinalityTarget || 'N',
        isConnection: true,
        source: element.source?.businessObject?.name || element.source?.id || 'Origem',
        target: element.target?.businessObject?.name || element.target?.id || 'Destino'
      };
      
      setProperties(connectionProperties);
      setLocalWidth(0);
      setLocalHeight(0);
    } else {
      setProperties(null);
      setLocalWidth(0);
      setLocalHeight(0);
    }
  };

  useEffect(() => {
    loadElementProperties();
  }, [element]);

  // ✨ useEffect para configurar listeners de eventos do modeler
  useEffect(() => {
    if (!modeler) return;

    const eventBus = modeler.get('eventBus');
    
    const handleCompositeChanged = (event: any) => {
      if (event.element && element && event.element.id === element.id) {
        loadElementProperties();
      }
    };
    
    const handleElementChanged = (event: any) => {
      if (event.element && element && event.element.id === element.id) {
        loadElementProperties();
      }
    };
    
    const handleElementsChanged = (event: any) => {
      if (event.elements && element && event.elements.some((el: any) => el.id === element.id)) {
        loadElementProperties();
      }
    };

    // NOVO: Listener para mudanças na seleção - atualiza lista de elementos selecionados
    const handleSelectionChanged = (event: any) => {
      try {
        const selection = modeler.get('selection');
        const newSelectedElements = selection.get();
        
        setSelectedElements(newSelectedElements);
        
        // Se ainda há um elemento principal selecionado, recarregar suas propriedades
        if (element && newSelectedElements.some((el: any) => el.id === element.id)) {
          loadElementProperties();
        }
      } catch (error) {
        console.warn('⚠️ ErPropertiesPanel: Erro ao processar mudança de seleção:', error);
      }
    };
    
    eventBus.on('element.compositeChanged', handleCompositeChanged);
    eventBus.on('element.changed', handleElementChanged);
    eventBus.on('elements.changed', handleElementsChanged);
    eventBus.on('selection.changed', handleSelectionChanged);
    
    // Cleanup listeners
    return () => {
      eventBus.off('element.compositeChanged', handleCompositeChanged);
      eventBus.off('element.changed', handleElementChanged);
      eventBus.off('elements.changed', handleElementsChanged);
      eventBus.off('selection.changed', handleSelectionChanged);
    };
  }, [element, modeler]);

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
      
      // Calcular posição para o sub-atributo
      const parentX = element.x || 0;
      const parentY = element.y || 0;
      const parentWidth = element.width || 80;
      const parentHeight = element.height || 50;
      
      let subAttrX: number;
      let subAttrY: number;
      let parentElement: any;
      
      if (isCompositeSubProcess) {
        // Para SubProcess: colocar sub-atributo DENTRO do container para permitir seleção
        subAttrX = 30; // Margem interna relativa ao container
        subAttrY = 60; // Abaixo do título relativo ao container
        parentElement = element; // Usar o próprio SubProcess como pai
        console.log('📦 Sub-atributo será criado DENTRO do container SubProcess para permitir seleção');
      } else {
        // Para UserTask: colocar sub-atributo AO LADO (método antigo)
        subAttrX = parentX + 20;
        subAttrY = parentY + parentHeight + 30;
        parentElement = modeler.get('canvas').getRootElement(); // Canvas root
        console.log('🔗 Sub-atributo será colocado ao lado com conexão');
      }
      
      // Criar sub-atributo usando ErElementFactory para garantir propriedades ER corretas
      const subAttributeShape = erElementFactory.createShape({
        type: 'bpmn:UserTask',
        width: 80,
        height: 50,
        erType: 'Attribute',
        name: 'Sub-atributo',
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

  const updateProperty = (propertyName: string, value: any) => {
    if (!element || !modeler) return;

    try {
      const modeling = modeler.get('modeling');
      const businessObject = element.businessObject;

      // Primeiro tentar o método oficial do bpmn-js
      try {
        modeling.updateProperties(element, {
          [propertyName]: value
        });
      } catch (modelingError) {
        console.warn('⚠️ modeling.updateProperties falhou:', modelingError);
      }
      
      // Garantir que a propriedade foi realmente definida diretamente no businessObject
      businessObject[propertyName] = value;
      
      // Debug: verificar se a propriedade foi atualizada
      console.log(`🔧 Propriedade ${propertyName} atualizada para:`, value);
      console.log('💾 BusinessObject após update:', element.businessObject);
      console.log('🔍 Verificação direta da propriedade:', element.businessObject[propertyName]);

      // Atualizar estado local
      setProperties(prev => prev ? { ...prev, [propertyName]: value } : null);

      // Forçar re-renderização do elemento se necessário
      if (propertyName === 'name' || propertyName === 'isWeak' || propertyName === 'isPrimaryKey' || propertyName === 'isForeignKey' || propertyName === 'isRequired' || propertyName === 'isMultivalued' || propertyName === 'isDerived' || propertyName === 'isComposite' || propertyName === 'cardinalitySource' || propertyName === 'cardinalityTarget' || propertyName === 'isIdentifying') {
        try {
          const elementRegistry = modeler.get('elementRegistry');
          const renderer = modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer');
          
          console.log('🔄 Forçando re-renderização para propriedade:', propertyName);
          
          // Para mudanças de cardinalidade, focar apenas na conexão
          if (propertyName === 'cardinalitySource' || propertyName === 'cardinalityTarget') {
            const isConnection = element.type && (element.type === 'bpmn:SequenceFlow' || element.waypoints);
            
            if (isConnection && renderer && renderer.drawConnection) {
              // Re-renderizar apenas a conexão específica
              const connectionGfx = elementRegistry.getGraphics(element);
              if (connectionGfx) {
                connectionGfx.innerHTML = '';
                renderer.drawConnection(connectionGfx, element);
                console.log('🔗 Re-renderizada conexão específica:', element.id);
              }
            }
          } else {
            // Para outras propriedades, re-renderizar o elemento
            if (renderer && renderer.drawShape) {
              const gfx = elementRegistry.getGraphics(element);
              if (gfx) {
                gfx.innerHTML = '';
                renderer.drawShape(gfx, element);
                console.log('🎨 Re-renderizado elemento:', element.id);
              }
            }
          }
        } catch (renderError) {
          console.error('Erro na re-renderização:', renderError);
        }
      }

    } catch (error) {
      console.error('Erro ao atualizar propriedade:', error);
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
function updateElementSize(dimension: 'width' | 'height', value: number, element: any, modeler: any) {
  if (!element || !modeler || value < 30) return;

  try {
    const modeling = modeler.get('modeling');
    
    // Obter dimensões atuais, com fallback para valores padrão
    const currentWidth = element.width || 120;
    const currentHeight = element.height || 80;
    const currentX = element.x || 0;
    const currentY = element.y || 0;
    
    const newBounds = {
      x: currentX,
      y: currentY,
      width: dimension === 'width' ? value : currentWidth,
      height: dimension === 'height' ? value : currentHeight
    };
    
    modeling.resizeShape(element, newBounds);
    
    // Forçar re-renderização para elementos ER customizados
    if (element.businessObject && element.businessObject.erType) {
      try {
        const elementRegistry = modeler.get('elementRegistry');
        const renderer = modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer');
        
        if (renderer && renderer.drawShape) {
          const gfx = elementRegistry.getGraphics(element);
          if (gfx) {
            gfx.innerHTML = '';
            renderer.drawShape(gfx, element);
          }
        }
      } catch (renderError) {
        console.error('Erro na re-renderização após redimensionamento:', renderError);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao redimensionar elemento:', error);
  }
}

// Componente para propriedades de Entidade
const EntityProperties: React.FC<{properties: any, updateProperty: Function}> = ({ properties, updateProperty }) => {
  
  const handleWeakEntityToggle = (isWeak: boolean) => {
    // Atualizar propriedade isWeak
    updateProperty('isWeak', isWeak);
    
    // Se o nome ainda é o padrão, atualizá-lo também
    if (!properties.name || properties.name === 'Entidade' || properties.name === 'Entidade Fraca') {
      const newName = isWeak ? 'Entidade Fraca' : 'Entidade';
      updateProperty('name', newName);
    }
  };
  
  return (
    <div className="property-group">
      <h4>Propriedades da Entidade</h4>
      
      <div className="property-field">
        <label>
          <input 
            type="checkbox" 
            checked={properties.isWeak || false} 
            onChange={(e) => handleWeakEntityToggle(e.target.checked)}
          />
          Entidade Fraca
        </label>
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea 
          value={properties.description || ''} 
          onChange={(e) => updateProperty('description', e.target.value)}
          placeholder="Descrição da entidade..."
          rows={3}
        />
      </div>
    </div>
  );
};

// Componente para propriedades de Relacionamento
const RelationshipProperties: React.FC<{properties: any, updateProperty: Function}> = ({ properties, updateProperty }) => {
  return (
    <div className="property-group">
      <h4>Propriedades do Relacionamento</h4>
      
      <div className="property-field">
        <label>
          <input 
            type="checkbox" 
            checked={properties.isIdentifying || false} 
            onChange={(e) => updateProperty('isIdentifying', e.target.checked)}
          />
          Relacionamento Identificador
        </label>
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea 
          value={properties.description || ''} 
          onChange={(e) => updateProperty('description', e.target.value)}
          placeholder="Descrição do relacionamento..."
          rows={3}
        />
      </div>
    </div>
  );
};

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

// Componente para propriedades de Atributo
const AttributeProperties: React.FC<{properties: any, updateProperty: Function, element: any, modeler: any, addSubAttribute: Function}> = ({ properties, updateProperty, element, modeler, addSubAttribute }) => {
  const isSubAttr = isSubAttribute(element, modeler);
  
  console.log('🔸 AttributeProperties: isSubAttribute =', isSubAttr, 'para elemento:', element?.id);
  
  // Se é sub-atributo, só mostrar campo de nome
  if (isSubAttr) {
    return (
      <div className="property-group">
        <h4>Propriedades do Sub-atributo</h4>
        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 0' }}>
          Sub-atributos só permitem edição do nome.
        </p>
        {/* Apenas o campo nome está disponível para sub-atributos */}
      </div>
    );
  }
  return (
    <div className="property-group">
      <h4>Propriedades do Atributo</h4>
      
      <div className="property-field">
        <label>Tipo de Dados:</label>
        <select 
          value={properties.dataType || 'VARCHAR'} 
          onChange={(e) => updateProperty('dataType', e.target.value)}
        >
          <option value="VARCHAR">VARCHAR</option>
          <option value="INTEGER">INTEGER</option>
          <option value="DECIMAL">DECIMAL</option>
          <option value="DATE">DATE</option>
          <option value="DATETIME">DATETIME</option>
          <option value="BOOLEAN">BOOLEAN</option>
          <option value="TEXT">TEXT</option>
          <option value="BLOB">BLOB</option>
        </select>
      </div>

      <div className="property-field">
        <label>Tamanho:</label>
        <input 
          type="text" 
          value={properties.size || ''} 
          onChange={(e) => updateProperty('size', e.target.value)}
          placeholder="ex: 50, 10,2"
        />
      </div>

      <div className="property-checkboxes">
        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isPrimaryKey || false} 
              onChange={(e) => {
                const isChecked = e.target.checked;
                updateProperty('isPrimaryKey', isChecked);
                // Se marcar chave primária, desmarcar chave estrangeira
                if (isChecked && properties.isForeignKey) {
                  updateProperty('isForeignKey', false);
                }
              }}
            />
            Chave Primária
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isForeignKey || false} 
              onChange={(e) => {
                const isChecked = e.target.checked;
                updateProperty('isForeignKey', isChecked);
                // Se marcar chave estrangeira, desmarcar chave primária
                if (isChecked && properties.isPrimaryKey) {
                  updateProperty('isPrimaryKey', false);
                }
              }}
            />
            Chave Estrangeira
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isRequired !== false} 
              onChange={(e) => updateProperty('isRequired', e.target.checked)}
            />
            Obrigatório (NOT NULL)
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isMultivalued || false} 
              onChange={(e) => updateProperty('isMultivalued', e.target.checked)}
            />
            Multivalorado
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isDerived || false} 
              onChange={(e) => updateProperty('isDerived', e.target.checked)}
            />
            Derivado
          </label>
        </div>

        <div className="property-field">
          <label>
            <input 
              type="checkbox" 
              checked={properties.isComposite || false} 
              onChange={(e) => {
                const isChecked = e.target.checked;
                
                // NOVA VALIDAÇÃO: Verificar se elemento está dentro de container composto
                const isInsideCompositeContainer = element?.parent?.type === 'bpmn:SubProcess' && 
                                                  element?.parent?.businessObject?.erType === 'CompositeAttribute';
                
                if (isInsideCompositeContainer && !isChecked) {
                  console.warn('🚫 ErPropertiesPanel: Não é possível desmarcar "Composto" - elemento está dentro de container composto');
                  alert('⚠️ Não é possível desmarcar "Composto" enquanto o atributo estiver dentro de um container composto.\n\nPara tornar o atributo simples, mova-o para fora do container primeiro.');
                  return; // Impedir a mudança
                }
                
                updateProperty('isComposite', isChecked);
              }}
              disabled={
                // DESABILITAR checkbox se estiver dentro de container composto e for para desmarcar
                element?.parent?.type === 'bpmn:SubProcess' && 
                element?.parent?.businessObject?.erType === 'CompositeAttribute' &&
                properties.isComposite
              }
            />
            Composto
          </label>
          
          {/* Indicador visual quando está dentro de container - MOVIDO PARA BAIXO */}
          {element?.parent?.type === 'bpmn:SubProcess' && 
           element?.parent?.businessObject?.erType === 'CompositeAttribute' && (
            <div style={{ 
              fontSize: '11px', 
              color: '#666', 
              marginTop: '4px',
              fontStyle: 'italic',
              paddingLeft: '20px' // Alinhar com o texto da checkbox
            }}>
              Obrigatório enquanto estiver dentro do container composto
            </div>
          )}
        </div>
      </div>

      {/* Botão para adicionar sub-atributos - aparece para UserTask composto ou SubProcess composto */}
      {(properties.isComposite || properties.erType === 'CompositeAttribute') && (
        <div className="property-field">
          <button 
            type="button"
            onClick={() => {
              addSubAttribute();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Adicionar Sub-atributo
          </button>
        </div>
      )}

      <div className="property-field">
        <label>Valor Padrão:</label>
        <input 
          type="text" 
          value={properties.defaultValue || ''} 
          onChange={(e) => updateProperty('defaultValue', e.target.value)}
          placeholder="Valor padrão..."
        />
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea 
          value={properties.description || ''} 
          onChange={(e) => updateProperty('description', e.target.value)}
          placeholder="Descrição do atributo..."
          rows={2}
        />
      </div>
    </div>
  );
};

// Componente para propriedades de Container Composto (CompositeAttribute)
const CompositeAttributeProperties: React.FC<{properties: any, updateProperty: Function, element: any, modeler: any}> = ({ properties, updateProperty, element, modeler }) => {
  
  // Proteção inicial - se não há elemento ou modeler, não renderizar
  if (!element || !modeler) {
    return <div>Aguardando seleção...</div>;
  }
  
  const ungroupContainer = () => {
    if (!element || !modeler || element.type !== 'bpmn:SubProcess') {
      console.warn('🚫 Não é possível desfazer agrupamento: elemento não é um container válido');
      return;
    }

    try {
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const canvas = modeler.get('canvas');
      const rootElement = canvas.getRootElement();
      
      // Encontrar todos os elementos filhos do container
      const childElements = elementRegistry.getAll().filter((el: any) => 
        el.parent && el.parent.id && el.parent.id === element.id && el.type !== 'bpmn:SequenceFlow' && el.type !== 'label'
      );

      if (childElements.length === 0) {
        console.warn('⚠️ Container não possui elementos filhos para desfazer');
        alert('⚠️ Este container está vazio. Não há elementos para desfazer o agrupamento.');
        return;
      }

      // IDENTIFICAR CONEXÕES ANTES DE MOVER ELEMENTOS
      const allConnections = elementRegistry.getAll().filter((el: any) => el.type === 'bpmn:SequenceFlow');
      
      // Capturar TODOS os IDs dos elementos filhos
      const childElementIds = childElements.map((child: any) => child.id);
      
      // Conexões internas: entre elementos que estão dentro do container
      const internalConnections = allConnections.filter((conn: any) => {
        const sourceId = conn.source?.id;
        const targetId = conn.target?.id;
        const sourceIsChild = sourceId && childElementIds.includes(sourceId);
        const targetIsChild = targetId && childElementIds.includes(targetId);
        
        return sourceIsChild && targetIsChild;
      });
      
      // Conexões externas: do/para o container (estas devem ser removidas)
      const externalConnections = allConnections.filter((conn: any) => 
        (conn.source && conn.source.id === element.id) || (conn.target && conn.target.id === element.id)
      );
      
      // Calcular nova posição para os elementos (ao lado do container original)
      const containerX = element.x || 0;
      const containerY = element.y || 0;
      
      // Desabilitar context pad temporariamente para evitar erros durante movimentação
      const contextPad = modeler.get('contextPad');
      if (contextPad && contextPad.close) {
        contextPad.close();
      }
      
      // Calcular nova posição base
      const baseX = containerX + 200;
      const baseY = containerY;
      
      // Primeira tentativa: Mover todos os elementos (filhos + conexões) juntos
      const allElementsToMove = [...childElements, ...internalConnections];
      
      try {
        // Mover todos juntos para a raiz preservando relações
        modeling.moveElements(allElementsToMove, { x: 0, y: 0 }, rootElement);
        
        // Depois reorganizar posições dos elementos filhos individualmente
        childElements.forEach((child: any, index: number) => {
          const currentX = child.x || 0;
          const currentY = child.y || 0;
          
          const newX = baseX + (index % 3) * 100;
          const newY = baseY + Math.floor(index / 3) * 80;
          
          const deltaX = newX - currentX;
          const deltaY = newY - currentY;
          
          if (deltaX !== 0 || deltaY !== 0) {
            modeling.moveElements([child], { x: deltaX, y: deltaY });
          }
        });
        
      } catch (batchMoveError) {
        console.warn('⚠️ Erro na movimentação em lote, tentando individualmente:', batchMoveError);
        
        // Fallback: mover individualmente
        childElements.forEach((child: any, index: number) => {
          const currentX = child.x || 0;
          const currentY = child.y || 0;
          const newX = baseX + (index % 3) * 100;
          const newY = baseY + Math.floor(index / 3) * 80;
          const deltaX = newX - currentX;
          const deltaY = newY - currentY;
          
          modeling.moveElements([child], { x: deltaX, y: deltaY }, rootElement);
        });
        
        // Mover conexões separadamente
        internalConnections.forEach((conn: any) => {
          try {
            modeling.moveElements([conn], { x: 0, y: 0 }, rootElement);
          } catch (connError) {
            console.warn(`⚠️ Erro ao mover conexão ${conn.id}:`, connError);
          }
        });
      }
      
      // Aguardar um pouco para garantir que movimentação foi processada
      setTimeout(() => {
        try {
          // Remover apenas conexões EXTERNAS do container (preservar conexões internas entre elementos)
          externalConnections.forEach((connection: any) => {
            try {
              modeling.removeConnection(connection);
            } catch (connectionError) {
              console.warn('⚠️ Erro ao remover conexão externa:', connection.id, connectionError);
            }
          });
          
          // Remover o próprio container
          modeling.removeShape(element);
          
          // Selecionar os elementos que foram movidos para fora
          setTimeout(() => {
            try {
              const selection = modeler.get('selection');
              const elementRegistry = modeler.get('elementRegistry');
              
              // Verificar se os elementos ainda existem antes de selecioná-los
              const validElements = childElements.filter((child: any) => {
                const element = elementRegistry.get(child.id);
                return element && element.id;
              });
              
              if (validElements.length > 0) {
                selection.select(validElements);
              }
            } catch (selectionError) {
              console.warn('⚠️ Erro ao selecionar elementos desagrupados:', selectionError);
            }
          }, 200);
          
        } catch (removalError) {
          console.error('❌ Erro na remoção do container:', removalError);
          alert('Erro ao remover container. Verifique o console para detalhes.');
        }
      }, 300);
      
    } catch (error) {
      console.error('❌ Erro ao desfazer agrupamento:', error);
      alert('Erro ao desfazer agrupamento. Verifique o console para detalhes.');
    }
  };

  const childElementsCount = modeler && element && element.id ? 
    modeler.get('elementRegistry').getAll().filter((el: any) => 
      el && el.parent && el.parent.id && el.parent.id === element.id && el.type !== 'bpmn:SequenceFlow' && el.type !== 'label'
    ).length : 0;

  return (
    <div className="property-group">
      <h4>Propriedades do Container Composto</h4>
      
      <div className="property-field" style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#555' }}>
          Elementos agrupados:
        </label>
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#334155'
        }}>
          {childElementsCount} elementos
        </div>
      </div>

      <div className="property-field">
        <label>Descrição:</label>
        <textarea 
          value={properties.description || ''} 
          onChange={(e) => updateProperty('description', e.target.value)}
          placeholder="Descrição do container..."
          rows={2}
        />
      </div>

      <div className="property-field" style={{ marginTop: '20px' }}>
        <button 
          type="button"
          onClick={ungroupContainer}
          style={{
            padding: '12px 20px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            width: '100%',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
          }}
        >
          🔓 Desfazer Agrupamento ({childElementsCount} elementos)
        </button>
        
        <div style={{ 
          fontSize: '11px', 
          color: '#666', 
          marginTop: '6px',
          textAlign: 'center',
          lineHeight: 1.3
        }}>
          Atenção: Esta ação remove o container e move os elementos para fora, preservando suas posições relativas.
        </div>
      </div>
    </div>
  );
};

// Componente para propriedades de Conexão
const ConnectionProperties: React.FC<{properties: any, updateProperty: Function}> = ({ properties, updateProperty }) => {
  return (
    <div className="property-group">
      <h4>Propriedades da Conexão</h4>
      
      <div className="property-field">
        <label>De:</label>
        <input 
          type="text" 
          value={properties.source || ''} 
          disabled
          className="readonly"
        />
      </div>

      <div className="property-field">
        <label>Para:</label>
        <input 
          type="text" 
          value={properties.target || ''} 
          disabled
          className="readonly"
        />
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Cardinalidade (Origem):</label>
          <select 
            value={properties.cardinalitySource || '1'} 
            onChange={(e) => updateProperty('cardinalitySource', e.target.value)}
          >
            <option value="1">1 (Um)</option>
            <option value="N">N (Muitos)</option>
            <option value="M">M (Múltiplos)</option>
            <option value="0..1">0..1 (Zero ou Um)</option>
            <option value="0..N">0..N (Zero ou Muitos)</option>
            <option value="1..N">1..N (Um ou Muitos)</option>
          </select>
        </div>
        
        <div className="property-field">
          <label>Cardinalidade (Destino):</label>
          <select 
            value={properties.cardinalityTarget || 'N'} 
            onChange={(e) => updateProperty('cardinalityTarget', e.target.value)}
          >
            <option value="1">1 (Um)</option>
            <option value="N">N (Muitos)</option>
            <option value="M">M (Múltiplos)</option>
            <option value="0..1">0..1 (Zero ou Um)</option>
            <option value="0..N">0..N (Zero ou Muitos)</option>
            <option value="1..N">1..N (Um ou Muitos)</option>
          </select>
        </div>
      </div>
    </div>
  );
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