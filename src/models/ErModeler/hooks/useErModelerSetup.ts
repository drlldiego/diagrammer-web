import { useEffect, useRef, useState, useCallback } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import erModdle from '../../../schemas/er-moddle.json';
import ErModule from '../custom';
import resizeAllModule from "../rules";
import minimapModule from "diagram-js-minimap";
import { logger } from "../../../utils/logger";
import { ErrorHandler, ErrorType, safeAsyncOperation, safeOperation } from "../../../utils/errorHandler";
import { notifications } from "../../../utils/notifications";

export const useErModelerSetup = (
  canvasRef: React.RefObject<HTMLDivElement | null>,
  onSelectionChange: (element: any, elements: any[]) => void,
  onDiagramChange: () => void,
  onImportDone: () => void
) => {
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('Inicializando...');

  useEffect(() => {
    if (!canvasRef.current) {
      logger.warn('Container ER DOM não está disponível, aguardando...', 'ER_SETUP');
      setError('Container do canvas não encontrado');
      setLoading(false);
      return;
    }

    logger.info('Iniciando setup do ER Modeler', 'ER_SETUP');
    setStatus('Criando modeler ER...');

    const initializeErModeler = async () => {
      await safeAsyncOperation(
        async () => {
          // Criar o modeler ER
          modelerRef.current = new BpmnModeler({
            container: canvasRef.current!,
            moddleExtensions: {
              er: erModdle
            },
            additionalModules: [
              ErModule,
              resizeAllModule,
              minimapModule
            ]
          });

          logger.info('ER Modeler criado com sucesso', 'ER_SETUP');
          setStatus('Importando diagrama inicial...');

          // Diagrama ER inicial
          const initialDiagram = `<?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                              xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                              xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                              xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                              xmlns:er="http://er.org/schema/er"
                              id="Definitions_1"
                              targetNamespace="http://bpmn.io/schema/bpmn">
              <bpmn:process id="Process_1" isExecutable="false">
              </bpmn:process>
              <bpmndi:BPMNDiagram id="BPMNDiagram_1">
                <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
                </bpmndi:BPMNPlane>
              </bpmndi:BPMNDiagram>
            </bpmn:definitions>`;

          // Aguardar que o modeler esteja completamente inicializado
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verificar se o modeler está acessível
          if (!modelerRef.current) {
            throw new Error('Modeler ER não inicializado');
          }

          // Verificar se o canvas está acessível
          try {
            const canvas = modelerRef.current.get('canvas');
            if (!canvas) {
              throw new Error('Canvas ER não disponível');
            }
            logger.debug('Modeler ER e canvas prontos para importação', 'ER_SETUP');
          } catch (canvasError) {
            throw new Error(`Canvas ER não acessível: ${canvasError}`);
          }

          // Importar diagrama inicial
          await modelerRef.current.importXML(initialDiagram);
          logger.info('Diagrama ER inicial importado com sucesso', 'ER_SETUP');

          // Setup de event listeners
          setupEventListeners();
          
          // Setup minimap
          setupMinimapToggle();

          setError(null);
          setLoading(false);
          setStatus('ER Modeler pronto!');
          
          logger.info('ER Modeler totalmente inicializado', 'ER_SETUP');
        },
        {
          type: ErrorType.BPMN_SETUP,
          operation: 'Inicializar ER Modeler',
          userMessage: 'Erro ao inicializar editor ER. Recarregue a página.',
          showNotification: false,
          fallback: () => {
            logger.warn('ER Modeler não pôde ser inicializado completamente', 'ER_SETUP');
            setError('Erro na inicialização. Algumas funcionalidades podem estar limitadas.');
            setLoading(false);
            setStatus('Erro na inicialização');
            
            // Tentar criar um modeler básico como fallback
            setTimeout(async () => {
              try {
                if (!modelerRef.current && canvasRef.current) {
                  modelerRef.current = new BpmnModeler({
                    container: canvasRef.current,
                    additionalModules: [ErModule as any] // Módulos mínimos
                  });
                  
                  const minimalDiagram = `<?xml version="1.0" encoding="UTF-8"?>
                    <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                                      targetNamespace="http://bpmn.io/schema/bpmn">
                      <bpmn:process id="Process_1" isExecutable="false" />
                    </bpmn:definitions>`;
                  
                  await modelerRef.current.importXML(minimalDiagram);
                  setupEventListeners();
                  setStatus('Modo básico ativo');
                  notifications.warning('ER Editor em modo básico - algumas funcionalidades limitadas');
                  logger.info('ER Modeler fallback ativo', 'ER_SETUP');
                }
              } catch (fallbackError) {
                logger.error('Fallback do ER Modeler também falhou', 'ER_SETUP', fallbackError as Error);
                setStatus('Falha crítica');
              }
            }, 500);
          }
        }
      );
    };

    const setupEventListeners = () => {
      if (!modelerRef.current) return;

      try {
        const eventBus = modelerRef.current.get('eventBus') as any;
        const selection = modelerRef.current.get('selection') as any;

        // Event listeners para seleção
        eventBus.on('selection.changed', (event: any) => {
          const { newSelection } = event;
          const element = newSelection.length === 1 ? newSelection[0] : null;
          onSelectionChange(element, newSelection);
          logger.debug(`Seleção alterada: ${newSelection.length} elementos`, 'ER_INTERACTION');
        });

        // Event listeners para mudanças no diagrama
        const handleDiagramChange = () => {
          onDiagramChange();
        };

        eventBus.on('commandStack.changed', handleDiagramChange);
        eventBus.on('elements.changed', handleDiagramChange);
        eventBus.on('shape.added', handleDiagramChange);
        eventBus.on('shape.removed', handleDiagramChange);
        eventBus.on('connection.added', handleDiagramChange);
        eventBus.on('connection.removed', handleDiagramChange);
        
        eventBus.on('import.done', () => {
          onImportDone();
          logger.debug('Import ER concluído', 'ER_IMPORT');
        });

        logger.debug('Event listeners ER configurados', 'ER_SETUP');
      } catch (eventError) {
        logger.error('Erro ao configurar event listeners ER', 'ER_SETUP', eventError as Error);
      }
    };

    const setupMinimapToggle = () => {
      setTimeout(() => {
        safeOperation(
          () => {
            const minimap = document.querySelector('.djs-minimap');
            if (minimap) {
              logger.debug('Configurando minimap ER', 'ER_MINIMAP');
              minimap.classList.add('open');
              
              // Remover toggle padrão se existir
              const defaultToggle = minimap.querySelector('.toggle');
              if (defaultToggle) {
                defaultToggle.remove();
              }
            }
          },
          {
            type: ErrorType.MINIMAP_CONTROL,
            operation: 'Configurar minimap ER',
            userMessage: 'Erro no controle do minimap ER. Funcionalidade pode estar limitada.',
            showNotification: false,
            fallback: () => {
              logger.warn('Minimap ER não pôde ser configurado', 'ER_MINIMAP');
            }
          }
        );
      }, 1000);
    };

    initializeErModeler();

    return () => {
      // Cleanup
      if (modelerRef.current) {
        try {
          modelerRef.current.destroy();
          modelerRef.current = null;
          logger.debug('ER Modeler destruído com sucesso', 'ER_CLEANUP');
        } catch (cleanupError) {
          logger.warn('Erro no cleanup do ER Modeler', 'ER_CLEANUP', cleanupError as Error);
        }
      }
    };
  }, [canvasRef, onSelectionChange, onDiagramChange, onImportDone]);

  const importDiagram = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;

    logger.info(`Iniciando importação do arquivo ER: ${file.name}`, 'ER_IMPORT');
    setStatus(`Importando ${file.name}...`);

    const reader = new FileReader();
    reader.onload = async () => {
      await safeAsyncOperation(
        async () => {
          const xml = reader.result as string;
          await modelerRef.current!.importXML(xml);
          notifications.success(`Diagrama ER "${file.name}" importado com sucesso!`);
          logger.info(`Diagrama ER importado com sucesso: ${file.name}`, 'ER_IMPORT');
          setStatus('Diagrama ER carregado');
        },
        {
          type: ErrorType.BPMN_IMPORT,
          operation: `Importar diagrama ER: ${file.name}`,
          userMessage: `Erro ao importar "${file.name}". Verifique se é um arquivo ER válido.`,
          fallback: () => {
            logger.warn(`Fallback: Limpando input de arquivo ER após falha na importação`, 'ER_IMPORT');
            event.target.value = '';
            setStatus('Erro na importação');
          }
        }
      );
    };
    
    reader.onerror = () => {
      ErrorHandler.handle({
        type: ErrorType.FILE_OPERATION,
        operation: `Ler arquivo ER: ${file.name}`,
        userMessage: `Erro ao ler o arquivo ER "${file.name}". Tente novamente.`,
        fallback: () => {
          event.target.value = '';
          setStatus('Erro na leitura do arquivo');
        }
      });
    };

    reader.readAsText(file);
  };

  const handleFitAll = () => {
    if (!modelerRef.current) return;
    
    safeOperation(
      () => {
        const canvas = modelerRef.current!.get('canvas') as any;
        canvas.zoom('fit-viewport');
        logger.info('Fit All ER executado - canvas ajustado para mostrar todos os elementos', 'ER_CANVAS_OPERATION');
        notifications.info('Visualização ER ajustada para mostrar todos os elementos');
      },
      {
        type: ErrorType.CANVAS_OPERATION,
        operation: 'Ajustar visualização ER (Fit All)',
        userMessage: 'Erro ao ajustar visualização ER. Tente fazer zoom manualmente.',
        fallback: () => {
          logger.warn('Fallback: Tentando zoom ER alternativo', 'ER_CANVAS_OPERATION');
          try {
            const canvas = modelerRef.current!.get('canvas') as any;
            canvas.zoom(1.0); // Zoom padrão como fallback
          } catch (fallbackError) {
            logger.error('Fallback também falhou para Fit All ER', 'ER_CANVAS_OPERATION', fallbackError as Error);
          }
        }
      }
    );
  };

  return {
    modelerRef,
    error,
    loading,
    status,
    importDiagram,
    handleFitAll
  };
};