import React from 'react';

interface CompositeAttributePropertiesProps {
  properties: any;
  updateProperty: Function;
  element: any;
  modeler: any;
}

export const CompositeAttributeProperties: React.FC<CompositeAttributePropertiesProps> = ({ properties, updateProperty, element, modeler }) => {
  
  // Proteção inicial - se não há elemento ou modeler, não renderizar
  if (!element || !modeler) {
    return <div>Aguardando seleção...</div>;
  }
  
  const ungroupContainer = () => {
    if (!element || !modeler || element.type !== 'bpmn:SubProcess') {
      console.warn('Não é possível desfazer agrupamento: elemento não é um container válido');
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
      
      // 🔍 DEBUG: Testar se as conexões têm source/target válidos LOGO APÓS serem obtidas
      console.log('🔍 DEBUG INICIAL: Total conexões encontradas:', allConnections.length);
      allConnections.forEach((conn: any, index: number) => {
        console.log(`🔍 DEBUG INICIAL: Conexão ${index + 1}:`, {
          id: conn.id,
          hasSource: !!conn.source,
          hasTarget: !!conn.target,
          sourceId: conn.source?.id,
          targetId: conn.target?.id,
          type: conn.type
        });
      });
      
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
      
      // NOVA ABORDAGEM: Usar moveElements em lote para manter relações (baseado no projeto antigo)
      
      // Calcular nova posição base
      const baseX = containerX + 200;
      const baseY = containerY;
      
      // Primeira tentativa: Mover todos os elementos (filhos + conexões) juntos
      const allElementsToMove = [...childElements, ...internalConnections];
      
      try {
        console.log('🚀 Tentando mover elementos em lote para preservar conexões...');
        
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
        
        console.log('✅ Movimentação em lote bem-sucedida - conexões preservadas');
        
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
          
          // Confirmar conexões internas preservadas
          if (internalConnections.length > 0) {
            console.log(`✅ ${internalConnections.length} conexões internas foram preservadas automaticamente`);
            internalConnections.forEach((conn: any) => {
              console.log(`✅ Conexão preservada: ${conn.id} (${conn.source?.id} -> ${conn.target?.id})`);
            });
          }
          
          // Remover o próprio container
          modeling.removeShape(element);
          
          console.log('✅ Desagrupamento concluído com sucesso!');
          
          // FORÇAR RESTAURAÇÃO DE TODAS AS CONEXÕES após desagrupamento
          setTimeout(() => {
            try {
              console.log('🔧 Forçando restauração de conexões após desagrupamento...');
              
              // Tentar obter ErRules e forçar restauração específica para desagrupamento
              const erRules = (window as any).erRules;
              if (erRules && typeof erRules.handleUngrouping === 'function') {
                erRules.handleUngrouping(childElements);
                console.log('✅ Desagrupamento processado via ErRules');
              } else if (erRules && typeof erRules.restoreAllConnections === 'function') {
                erRules.restoreAllConnections();
                console.log('✅ Conexões restauradas via ErRules após desagrupamento');
              } else {
                console.warn('⚠️ ErRules não disponível para restauração automática');
                
                // Fallback: forçar re-avaliação manual das conexões desagrupadas
                const elementRegistry = modeler.get('elementRegistry');
                const allConnections = elementRegistry.getAll().filter((el: any) => el.type === 'bpmn:SequenceFlow');
                
                allConnections.forEach((conn: any) => {
                  if (conn.node && conn.node.classList.contains('er-connection-blocked')) {
                    // Verificar se ainda deve ser bloqueada
                    const sourceInsideContainer = conn.source?.parent?.type === 'bpmn:SubProcess' &&
                                                 conn.source?.parent?.businessObject?.erType === 'CompositeAttribute';
                    const targetInsideContainer = conn.target?.parent?.type === 'bpmn:SubProcess' &&
                                                 conn.target?.parent?.businessObject?.erType === 'CompositeAttribute';
                    const sameContainer = sourceInsideContainer && targetInsideContainer &&
                                         conn.source?.parent?.id === conn.target?.parent?.id;
                    
                    if (!sameContainer) {
                      // Restaurar conexão que não deveria mais estar bloqueada
                      conn.node.classList.remove('er-connection-blocked');
                      conn.node.style.pointerEvents = '';
                      conn.node.style.cursor = '';
                      conn.node.style.opacity = '';
                      
                      const children = conn.node.querySelectorAll('*');
                      children.forEach((child: any) => {
                        child.style.pointerEvents = '';
                        child.style.cursor = '';
                      });
                      
                      console.log('🔧 Conexão restaurada manualmente:', conn.id);
                    }
                  }
                });
              }
            } catch (restoreError) {
              console.warn('⚠️ Erro ao restaurar conexões:', restoreError);
            }
          }, 200);
          
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
                
                // Garantir que contextPad seja restaurado para os elementos desagrupados
                setTimeout(() => {
                  const contextPad = modeler.get('contextPad');
                  if (contextPad && validElements[0]) {
                    // Forçar atualização do contextPad fechando e abrindo novamente
                    try {
                      contextPad.close();
                      setTimeout(() => {
                        contextPad.open(validElements[0]);
                      }, 50);
                    } catch (contextError) {
                      console.warn('⚠️ Erro ao restaurar contextPad:', contextError);
                    }
                  }
                }, 100);
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
      
      <div className="property-field composite-grouped-elements-field">
        <label className="composite-grouped-elements-label">
          Elementos agrupados:
        </label>
        <div className="composite-grouped-elements-display">
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

      <div className="property-field composite-ungroup-section">
        <button 
          type="button"
          onClick={ungroupContainer}
          className="composite-ungroup-button"
        >
          🔓 Desfazer Agrupamento ({childElementsCount} elementos)
        </button>
        
        <div className="composite-ungroup-warning">
          Atenção: Esta ação remove o container e move os elementos para fora, preservando suas posições relativas.
        </div>
      </div>
    </div>
  );
};