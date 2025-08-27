import React, { useState, useEffect } from 'react';
import './ErPropertiesPanel.css';

interface ErPropertiesPanelProps {
  element: any;
  modeler: any;
}

interface ElementProperties {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

export const ErPropertiesPanel: React.FC<ErPropertiesPanelProps> = ({ element, modeler }) => {
  const [properties, setProperties] = useState<ElementProperties | null>(null);
  const [isER, setIsER] = useState(false);
  
  // Estados locais para dimensões editáveis
  const [localWidth, setLocalWidth] = useState<number>(0);
  const [localHeight, setLocalHeight] = useState<number>(0);

   useEffect(() => {
     if (!element) {
       setProperties(null);
       setIsER(false);
       setLocalWidth(0);
       setLocalHeight(0);
       return;
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
      
      console.log('📂 Carregando propriedades do elemento:', element.id);
      console.log('📋 Propriedades carregadas:', loadedProperties);
      console.log('🔍 isWeak no businessObject:', element.businessObject.isWeak);
      
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
      
      console.log('🔗 Carregando propriedades da conexão:', element.id);
      console.log('📋 Propriedades da conexão:', connectionProperties);
      
      setProperties(connectionProperties);
      setLocalWidth(0);
      setLocalHeight(0);
    } else {
      setProperties(null);
      setLocalWidth(0);
      setLocalHeight(0);
    }
  }, [element]);

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
      updateElementSize('width', numValue);
    }
  };

  const handleHeightChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setLocalHeight(numValue);
    
    if (numValue >= 30) {
      updateElementSize('height', numValue);
    }
  };

  if (!isER || !properties) {
    return (
      <div className="er-properties-panel">
        <div className="er-properties-header">
          <h3>📋 Propriedades</h3>
        </div>
        <div className="er-properties-content">
          <p className="no-selection">
            {!element ? 'Nenhum elemento selecionado' : 'Selecione um elemento ER para editar propriedades'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="er-properties-panel">
      <div className="er-properties-header">
        <h3>📋 Propriedades - {properties.isConnection ? 'Conexão' : getElementTypeLabel(properties.erType)}</h3>
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

        {properties.isConnection && (
          <ConnectionProperties properties={properties} updateProperty={updateProperty} />
        )}

        {/* Propriedades de Posição - só mostrar quando há elemento válido */}
        {element && (
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

  function updateElementSize(dimension: 'width' | 'height', value: number) {
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
      
      console.log(`🔧 Redimensionando ${dimension} para ${value}:`, newBounds);
      
      modeling.resizeShape(element, newBounds);
      
      console.log('✅ Redimensionamento aplicado');
      
      // Forçar re-renderização para elementos ER customizados
      if (element.businessObject && element.businessObject.erType) {
        console.log('🔄 Forçando re-renderização após redimensionamento');
        try {
          const elementRegistry = modeler.get('elementRegistry');
          const renderer = modeler.get('bpmnRenderer') || modeler.get('erBpmnRenderer');
          
          if (renderer && renderer.drawShape) {
            const gfx = elementRegistry.getGraphics(element);
            if (gfx) {
              gfx.innerHTML = '';
              renderer.drawShape(gfx, element);
              console.log('🎨 Re-renderizado após redimensionamento:', element.id);
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
};

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
              onChange={(e) => updateProperty('isComposite', e.target.checked)}
            />
            Composto
          </label>
        </div>
      </div>

      {/* Botão para adicionar sub-atributos - aparece para UserTask composto ou SubProcess composto */}
      {(properties.isComposite || properties.erType === 'CompositeAttribute') && (
        <div className="property-field">
          <button 
            type="button"
            onClick={() => {
              console.log('🏗️ ✨ Solicitação para adicionar sub-atributo ao elemento composto:', element?.id);
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
            + Adicionar Sub-atributo
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