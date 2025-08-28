import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";
import BpmnModeler from 'bpmn-js/lib/Modeler';
import logoIsec from "../../assets/logo-isec-cor.png";
import erModdle from './er-moddle.json';

// Export to SVG e PDF
import jsPDF from "jspdf";

// Importar o módulo ER customizado
import ErModule from './custom';

// Módulos extras para funcionalidade de resize e minimap
import resizeAllModule from "../../lib/resize-all-rules";
import minimapModule from "diagram-js-minimap";

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "../../styles/DiagramEditor.css";
import './ErPalette.css'; // CSS para os ícones ER
import './ErModeler.css'; // CSS para grid e estilos visuais ER

// import {
//   BpmnPropertiesPanelModule,
//   BpmnPropertiesProviderModule
// } from "bpmn-js-properties-panel";

import { Download as PdfIcon, Maximize2 as FitAllIcon, Upload, ChevronDown, FileImage, File } from "lucide-react";
import ErPropertiesPanel from "./properties/ErPropertiesPanel";
// import ErPropertiesProvider from './properties/ErPropertiesProvider';

const ErModelerComponent: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // const navigate = useNavigate();
  
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('Inicializando...');
  const [xml, setXml] = useState<string>("");
  const [showExitModal, setShowExitModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [minimapMinimized, setMinimapMinimized] = useState<boolean>(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  // Interceptar fechamento de aba/janela
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        // Para fechamento direto da aba/janela, mostrar modal customizado se possível
        // Como não podemos mostrar modal no beforeunload, usar texto nativo como fallback
        e.returnValue = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
        return 'Você tem alterações não salvas. Tem certeza que deseja sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, showExitModal]);

  // Interceptar navegação de volta do browser
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !showExitModal) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        setShowExitModal(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges, showExitModal]);

  useEffect(() => {
    console.log('ErModelerComponent: useEffect iniciado');
    
    if (!canvasRef.current) {
      console.error('ErModelerComponent: canvasRef.current é null');
      setError('Container do canvas não encontrado');
      setLoading(false);
      return;
    }

    console.log('ErModelerComponent: Container encontrado, criando modeler...');
    setStatus('Criando modeler...');
    
    const initializeModeler = async () => {
      try {
        // Criar instância do modeler
        const modeler = new BpmnModeler({
          container: canvasRef.current!,
          keyboard: {
            bindTo: window
          },
          // Adicionar módulos customizados ER - minimap por último para evitar conflitos
          additionalModules: [
            resizeAllModule,
            ErModule,
            minimapModule            
          ],
          // Registrar tipos ER como extensão do moddle
          moddleExtensions: {
            er: erModdle
          }
        });

        console.log('ErModelerComponent: Modeler criado');
        modelerRef.current = modeler;

        // XML válido com elementos ER e uma conexão com cardinalidade para testar
        const validBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:er="http://er.com/schema/1.0/er"
  id="sample-diagram"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:task id="Entity_1" er:type="entity" er:erType="Entity" er:isWeak="false" name="Cliente"/>
    <bpmn2:intermediateThrowEvent id="Relationship_1" er:type="relationship" er:erType="Relationship" er:isIdentifying="false" name="Compra"/>
    <bpmn2:task id="Entity_2" er:type="entity" er:erType="Entity" er:isWeak="false" name="Produto"/>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="Entity_1" targetRef="Relationship_1" er:cardinalitySource="1" er:cardinalityTarget="N"/>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="Relationship_1" targetRef="Entity_2" er:cardinalitySource="N" er:cardinalityTarget="1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Entity_1_di" bpmnElement="Entity_1">
        <dc:Bounds x="150" y="180" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Relationship_1_di" bpmnElement="Relationship_1">
        <dc:Bounds x="350" y="170" width="140" height="100" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Entity_2_di" bpmnElement="Entity_2">
        <dc:Bounds x="550" y="180" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="270" y="220" />
        <di:waypoint x="350" y="220" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="490" y="220" />
        <di:waypoint x="550" y="220" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

        console.log('ErModelerComponent: Importando XML...');
        setStatus('Importando diagrama...');

        // Importar o XML
        const result = await modeler.importXML(validBpmnXml);
        console.log('ErModelerComponent: XML importado com sucesso', result);

        // Configurar businessObject.erType para elementos importados do XML e forçar re-render
        const elementRegistry = modeler.get('elementRegistry') as any;
        const modeling = modeler.get('modeling') as any;
        const graphicsFactory = modeler.get('graphicsFactory') as any;
        
        const allElements = elementRegistry.getAll();
        console.log('🔍 DEBUG: Total de elementos encontrados:', allElements.length);
        
        allElements.forEach((element: any) => {
          console.log('🔍 DEBUG: Processando elemento:', element.id, 'tipo:', element.type, 'businessObject:', element.businessObject);
          
          if (element.businessObject && element.businessObject.$attrs) {
            console.log('🔍 DEBUG: $attrs encontrado:', element.businessObject.$attrs);
            
            // Verificar namespace er: ou ns0:
            const erTypeAttr = element.businessObject.$attrs['er:erType'] || element.businessObject.$attrs['ns0:erType'];
            if (erTypeAttr) {
              console.log('🔍 DEBUG: erType encontrado:', erTypeAttr);
              
              // Definir erType no businessObject para que o renderer aplique o estilo azul
              element.businessObject.erType = erTypeAttr;
              
              // Para entidades, adicionar propriedades necessárias igual à palette
              const isWeakAttr = element.businessObject.$attrs['er:isWeak'] || element.businessObject.$attrs['ns0:isWeak'];
              if (erTypeAttr === 'Entity' && isWeakAttr !== undefined) {
                element.businessObject.isWeak = isWeakAttr === 'true';
                console.log('✅ IsWeak definido para entidade:', element.id, '→', element.businessObject.isWeak);
              }
              
              console.log('✅ ErType definido para elemento:', element.id, '→', element.businessObject.erType);
              console.log('✅ $attrs após pós-processamento:', element.businessObject.$attrs);
              
              // Forçar re-renderização do elemento - múltiplas estratégias
              try {
                console.log('🔄 Forçando re-render agressivo do elemento:', element.id);
                
                // Estratégia 1: graphicsFactory.update
                const gfx = elementRegistry.getGraphics(element);
                if (gfx) {
                  console.log('🔄 Estratégia 1: graphicsFactory.update');
                  graphicsFactory.update('shape', element, gfx);
                }
                
                // Estratégia 2: modeling.updateProperties (força evento de mudança)
                console.log('🔄 Estratégia 2: modeling.updateProperties');
                modeling.updateProperties(element, { 
                  name: element.businessObject.name || 'Entidade',
                  erType: erTypeAttr // Explicitamente definir erType
                });
                
                // Estratégia 3: Remover e re-adicionar graphics (mais agressivo)
                setTimeout(() => {
                  try {
                    console.log('🔄 Estratégia 3: Re-renderização forçada após timeout');
                    const canvas = modeler.get('canvas') as any;
                    canvas.removeMarker(element, 'needs-update');
                    canvas.addMarker(element, 'er-element');
                    canvas.removeMarker(element, 'er-element');
                  } catch (timeoutError) {
                    console.log('⚠️ Estratégia 3 falhou:', timeoutError);
                  }
                }, 100);
                
              } catch (renderError) {
                console.error('❌ Erro no re-render:', renderError);
              }
            } else {
              console.log('🔍 DEBUG: erType NÃO encontrado para elemento:', element.id);
            }
          } else {
            console.log('🔍 DEBUG: businessObject ou $attrs não encontrado para elemento:', element.id);
          }
        });
        
        console.log('🔍 DEBUG: Post-processamento concluído');

        // Configurar canvas
        const canvas = modeler.get('canvas') as any;
        if (canvas) {
          console.log('Canvas obtido com sucesso');
          // Fazer zoom para ajustar
          canvas.zoom('fit-viewport');
          
          // DEBUG: Elemento Entity inicial para testar minimap
          console.log('Usando Entity ER inicial para testar minimap');
          
          // Verificar se minimap está presente
          const minimap = modeler.get('minimap', false) as any;
          if (minimap) {
            console.log('✅ Minimap detectado:', minimap);
            // Tentar forçar atualização do minimap
            setTimeout(() => {
              try {
                if (typeof minimap.open === 'function') {
                  minimap.open();
                  console.log('✅ Minimap aberto');
                } else {
                  console.log('📋 Minimap já está visível ou não tem método open');
                }
              } catch (e) {
                console.warn('⚠️ Erro ao abrir minimap:', e);
              }
            }, 1000);
          } else {
            console.warn('⚠️ Minimap não detectado');
          }
        }

        // Setup minimap toggle functionality
        setupMinimapToggle();

        // Configurar eventos
        const eventBus = modeler.get('eventBus') as any;
        if (eventBus) {
          eventBus.on('selection.changed', (event: any) => {
            console.log('Seleção alterada:', event?.newSelection);
            const element = event?.newSelection?.[0] || null;
            const elements = event?.newSelection || [];
            setSelectedElement(element);
            setSelectedElements(elements);
            
            // Desabilitar contextPad para seleção múltipla
            const contextPad = modeler.get('contextPad') as any;
            if (elements.length > 1) {
              console.log('🚫 ErModeler: Desabilitando contextPad para seleção múltipla de', elements.length, 'elementos');
              try {
                // Fechar imediatamente qualquer contextPad aberto
                contextPad.close();
                
                // Bloquear abertura usando timer que persiste
                if ((contextPad as any)._multiSelectBlock) {
                  clearTimeout((contextPad as any)._multiSelectBlock);
                }
                
                // Substituir método open temporariamente
                if (!(contextPad as any)._originalOpen) {
                  (contextPad as any)._originalOpen = contextPad.open;
                }
                
                contextPad.open = () => {
                  console.log('🚫 ErModeler: Bloqueando contextPad durante seleção múltipla');
                };
                
                // Configurar timer para manter bloqueio
                (contextPad as any)._multiSelectBlock = setTimeout(() => {
                  // Não restaurar automaticamente - só restaurar quando seleção única
                }, 10000);
                
              } catch (error) {
                console.warn('⚠️ Erro ao desabilitar contextPad:', error);
              }
            } else if (elements.length <= 1) {
              // Restaurar contextPad para seleção única
              if ((contextPad as any)._originalOpen) {
                console.log('✅ ErModeler: Restaurando contextPad para seleção única');
                contextPad.open = (contextPad as any)._originalOpen;
                
                if ((contextPad as any)._multiSelectBlock) {
                  clearTimeout((contextPad as any)._multiSelectBlock);
                  delete (contextPad as any)._multiSelectBlock;
                }
              }
            }
          });

          eventBus.on('element.added', (event: any) => {
            console.log('Elemento adicionado:', event.element);
          });

          eventBus.on('import.done', (event: any) => {
            console.log('Import concluído:', event);
            setHasUnsavedChanges(false);
          });

          // Setup de detecção de mudanças
          const handleDiagramChange = () => {
            setHasUnsavedChanges(true);
          };

          // Escutar múltiplos eventos de mudança
          eventBus.on('commandStack.changed', handleDiagramChange);
          eventBus.on('elements.changed', handleDiagramChange);
          eventBus.on('shape.added', handleDiagramChange);
          eventBus.on('shape.removed', handleDiagramChange);
          eventBus.on('connection.added', handleDiagramChange);
          eventBus.on('connection.removed', handleDiagramChange);
        }

        setLoading(false);
        setError(null);
        setStatus('Pronto para modelagem ER');

      } catch (err: unknown) {
        console.error('ErModelerComponent: Erro detalhado:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(`Erro: ${errorMessage}`);
        setStatus('Erro ao inicializar');
        setLoading(false);
      }
    };

    initializeModeler();

    // Cleanup
    return () => {
      console.log('ErModelerComponent: Cleanup');
      if (modelerRef.current) {
        try {
          modelerRef.current.destroy();
          modelerRef.current = null;
        } catch (cleanupError) {
          console.warn('ErModelerComponent: Erro no cleanup:', cleanupError);
        }
      }
    };
  }, []); // Array de dependências vazio e constante

  // Função para exportar PDF com máxima qualidade e fundo branco
  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    try {
      console.log('🎯 Iniciando exportação PDF com qualidade máxima...');
      
      const { svg } = await modelerRef.current.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }
      
      // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
      const scaleFactor = 5;
      
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        console.log(`📐 Dimensões SVG originais: ${img.width}x${img.height}`);
        
        const originalWidth = img.width;
        const originalHeight = img.height;
        const highResWidth = originalWidth * scaleFactor;
        const highResHeight = originalHeight * scaleFactor;
        
        // Configurar canvas para resolução máxima
        canvas.width = highResWidth;
        canvas.height = highResHeight;
        
        console.log(`📐 Canvas alta resolução: ${highResWidth}x${highResHeight} (escala ${scaleFactor}x)`);
        
        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // ✅ GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, highResWidth, highResHeight);
        console.log('✅ Fundo branco aplicado');
        
        // Escalar contexto APÓS pintar o fundo
        ctx.scale(scaleFactor, scaleFactor);
        
        // Desenhar SVG escalado sobre fundo branco
        ctx.drawImage(img, 0, 0);
        console.log('✅ SVG desenhado sobre fundo branco');

        // Criar PDF com dimensões em milímetros para precisão
        const mmWidth = originalWidth * 0.264583; // px para mm (1px = 0.264583mm)
        const mmHeight = originalHeight * 0.264583;
        
        const pdf = new jsPDF({
          orientation: mmWidth > mmHeight ? "landscape" : "portrait",
          unit: "mm",
          format: [mmWidth, mmHeight],
        });

        // ✅ USAR PNG SEM COMPRESSÃO para máxima qualidade
        const imgData = canvas.toDataURL("image/png", 1.0); // PNG sem compressão
        
        console.log(`📄 PDF: ${mmWidth.toFixed(1)}x${mmHeight.toFixed(1)}mm`);
        pdf.addImage(imgData, "PNG", 0, 0, mmWidth, mmHeight, undefined, 'SLOW'); // SLOW = máxima qualidade
        
        console.log('✅ PDF ALTA QUALIDADE gerado com sucesso');
        pdf.save("diagrama-er.pdf");

        URL.revokeObjectURL(url);
      };

      img.onerror = function() {
        console.error('❌ Erro ao carregar SVG como imagem');
        alert('Erro ao processar SVG. Tente novamente.');
      };

      img.src = url;
    } catch (err) {
      console.error("❌ Erro crítico na exportação PDF:", err);
      alert(`Erro na exportação PDF: ${err}`);
    }
  };

  // Função para processar elementos ER após import
  const processErElementsAfterImport = () => {
    if (!modelerRef.current) return;
    
    console.log('🔄 Processando elementos ER após import...');
    
    const elementRegistry = modelerRef.current.get('elementRegistry') as any;
    const modeling = modelerRef.current.get('modeling') as any;
    const graphicsFactory = modelerRef.current.get('graphicsFactory') as any;
    
    const allElements = elementRegistry.getAll();
    console.log('🔍 DEBUG IMPORT: Total de elementos encontrados:', allElements.length);
    
    allElements.forEach((element: any) => {
      console.log('🔍 DEBUG IMPORT: Processando elemento:', element.id, 'tipo:', element.type, 'businessObject:', element.businessObject);
      
      // ESPECIAL: Log para detectar UserTasks que são atributos
      if (element.type === 'bpmn:UserTask') {
        console.log('🔍 DEBUG IMPORT: *** UserTask detectado! ***', element.id, element.businessObject);
      }
      
      if (element.businessObject && element.businessObject.$attrs) {
        console.log('🔍 DEBUG IMPORT: $attrs encontrado:', element.businessObject.$attrs);
        
        // Verificar namespace er: ou ns0:
        const erTypeAttr = element.businessObject.$attrs['er:erType'] || element.businessObject.$attrs['ns0:erType'];
        
        // TAMBÉM processar conexões (SequenceFlow) para cardinalidades e conexões pai-filho
        const isConnection = element.type === 'bpmn:SequenceFlow' || element.waypoints;
        const cardinalitySource = element.businessObject.$attrs['er:cardinalitySource'] || element.businessObject.$attrs['ns0:cardinalitySource'];
        const cardinalityTarget = element.businessObject.$attrs['er:cardinalityTarget'] || element.businessObject.$attrs['ns0:cardinalityTarget'];
        const isParentChild = element.businessObject.$attrs['er:isParentChild'] || element.businessObject.$attrs['ns0:isParentChild'];
        
        if (erTypeAttr || isConnection) {
          if (erTypeAttr) {
            console.log('🔍 DEBUG IMPORT: erType encontrado:', erTypeAttr);
            
            // Definir erType no businessObject para que o renderer aplique o estilo correto
            element.businessObject.erType = erTypeAttr;
            
            // Para entidades, adicionar propriedades necessárias igual à palette
            const isWeakAttr = element.businessObject.$attrs['er:isWeak'] || element.businessObject.$attrs['ns0:isWeak'];
            if (erTypeAttr === 'Entity' && isWeakAttr !== undefined) {
              element.businessObject.isWeak = isWeakAttr === 'true';
              console.log('✅ IMPORT: IsWeak definido para entidade:', element.id, '→', element.businessObject.isWeak);
            }
            
            // Para atributos, adicionar propriedades de chave
            if (erTypeAttr === 'Attribute') {
              const isPrimaryKey = element.businessObject.$attrs['er:isPrimaryKey'] || element.businessObject.$attrs['ns0:isPrimaryKey'];
              const isForeignKey = element.businessObject.$attrs['er:isForeignKey'] || element.businessObject.$attrs['ns0:isForeignKey'];
              const isRequired = element.businessObject.$attrs['er:isRequired'] || element.businessObject.$attrs['ns0:isRequired'];
              const isMultivalued = element.businessObject.$attrs['er:isMultivalued'] || element.businessObject.$attrs['ns0:isMultivalued'];
              const isDerived = element.businessObject.$attrs['er:isDerived'] || element.businessObject.$attrs['ns0:isDerived'];
              const isComposite = element.businessObject.$attrs['er:isComposite'] || element.businessObject.$attrs['ns0:isComposite'];
              
              if (isPrimaryKey !== undefined) {
                element.businessObject.isPrimaryKey = isPrimaryKey === 'true';
                console.log('✅ IMPORT: isPrimaryKey definido para atributo:', element.id, '→', element.businessObject.isPrimaryKey);
              }
              if (isForeignKey !== undefined) {
                element.businessObject.isForeignKey = isForeignKey === 'true';
                console.log('✅ IMPORT: isForeignKey definido para atributo:', element.id, '→', element.businessObject.isForeignKey);
              }
              if (isRequired !== undefined) {
                element.businessObject.isRequired = isRequired === 'true';
                console.log('✅ IMPORT: isRequired definido para atributo:', element.id, '→', element.businessObject.isRequired);
              }
              if (isMultivalued !== undefined) {
                element.businessObject.isMultivalued = isMultivalued === 'true';
                console.log('✅ IMPORT: isMultivalued definido para atributo:', element.id, '→', element.businessObject.isMultivalued);
              }
              if (isDerived !== undefined) {
                element.businessObject.isDerived = isDerived === 'true';
                console.log('✅ IMPORT: isDerived definido para atributo:', element.id, '→', element.businessObject.isDerived);
              }
              if (isComposite !== undefined) {
                element.businessObject.isComposite = isComposite === 'true';
                console.log('✅ IMPORT: isComposite definido para atributo:', element.id, '→', element.businessObject.isComposite);
              }
            }
            
            // Para relacionamentos, adicionar propriedade de identificação
            if (erTypeAttr === 'Relationship') {
              const isIdentifying = element.businessObject.$attrs['er:isIdentifying'] || element.businessObject.$attrs['ns0:isIdentifying'];
              if (isIdentifying !== undefined) {
                element.businessObject.isIdentifying = isIdentifying === 'true';
                console.log('✅ IMPORT: isIdentifying definido para relacionamento:', element.id, '→', element.businessObject.isIdentifying);
              }
            }
            
            console.log('✅ IMPORT: ErType definido para elemento:', element.id, '→', element.businessObject.erType);
          }
          
          // Processar cardinalidades e conexões pai-filho para conexões
          if (isConnection && (cardinalitySource || cardinalityTarget || isParentChild)) {
            if (cardinalitySource) {
              element.businessObject.cardinalitySource = cardinalitySource;
              console.log('✅ IMPORT: cardinalitySource definido para conexão:', element.id, '→', cardinalitySource);
            }
            if (cardinalityTarget) {
              element.businessObject.cardinalityTarget = cardinalityTarget;
              console.log('✅ IMPORT: cardinalityTarget definido para conexão:', element.id, '→', cardinalityTarget);
            }
            if (isParentChild !== undefined) {
              element.businessObject.isParentChild = isParentChild === 'true';
              console.log('✅ IMPORT: isParentChild definido para conexão:', element.id, '→', element.businessObject.isParentChild);
            }
          }
          
          // Forçar re-renderização do elemento
          try {
            console.log('🔄 IMPORT: Forçando re-render do elemento:', element.id);
            
            // Estratégia 1: graphicsFactory.update
            const gfx = elementRegistry.getGraphics(element);
            if (gfx) {
              console.log('🔄 IMPORT: Estratégia 1: graphicsFactory.update');
              if (isConnection) {
                graphicsFactory.update('connection', element, gfx);
              } else {
                graphicsFactory.update('shape', element, gfx);
              }
            }
            
            // Estratégia 2: modeling.updateProperties (força evento de mudança)
            console.log('🔄 IMPORT: Estratégia 2: modeling.updateProperties');
            const updateProps: any = { 
              name: element.businessObject.name || (erTypeAttr ? 'Elemento ER' : 'Conexão')
            };
            if (erTypeAttr) updateProps.erType = erTypeAttr;
            if (cardinalitySource) updateProps.cardinalitySource = cardinalitySource;
            if (cardinalityTarget) updateProps.cardinalityTarget = cardinalityTarget;
            
            modeling.updateProperties(element, updateProps);
            
          } catch (renderError) {
            console.error('❌ IMPORT: Erro no re-render:', renderError);
          }
        } else {
          console.log('🔍 DEBUG IMPORT: erType e cardinalidades NÃO encontrados para elemento:', element.id);
        }
      } else {
        console.log('🔍 DEBUG IMPORT: businessObject ou $attrs não encontrado para elemento:', element.id);
      }
    });
    
    console.log('🔍 DEBUG IMPORT: Pós-processamento concluído');
  };

  // Função para importar diagrama (copiada do BpmnModeler)
  const importDiagram = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const xml = reader.result as string;
        await modelerRef.current!.importXML(xml);
        
        // IMPORTANTE: Aplicar pós-processamento ER após import
        processErElementsAfterImport();
      } catch (error) {
        console.error("Erro ao importar diagrama:", error);
      }
    };
    reader.readAsText(file);
  };

  // Função para exportar PNG com máxima qualidade e fundo branco
  const exportToPNG = async () => {
    if (!modelerRef.current) return;

    try {
      console.log('🎯 Iniciando exportação PNG com qualidade máxima...');
      
      const { svg } = await modelerRef.current.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        console.log(`📐 Dimensões SVG originais: ${img.width}x${img.height}`);
        
        // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
        const scaleFactor = 5;
        const highResWidth = img.width * scaleFactor;
        const highResHeight = img.height * scaleFactor;
        
        canvas.width = highResWidth;
        canvas.height = highResHeight;
        
        console.log(`📐 PNG alta resolução: ${highResWidth}x${highResHeight} (escala ${scaleFactor}x)`);
        
        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // ✅ GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, highResWidth, highResHeight);
        console.log('✅ Fundo branco aplicado ao PNG');
        
        // Escalar contexto APÓS pintar o fundo
        ctx.scale(scaleFactor, scaleFactor);
        
        // Desenhar SVG escalado sobre fundo branco
        ctx.drawImage(img, 0, 0);
        console.log('✅ SVG desenhado sobre fundo branco');

        // Converter canvas para PNG com qualidade máxima
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('✅ PNG ALTA QUALIDADE gerado com sucesso');
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = "diagrama-er.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
          } else {
            console.error('❌ Erro ao criar blob PNG');
          }
        }, "image/png", 1.0); // Qualidade máxima PNG

        URL.revokeObjectURL(url);
      };

      img.onerror = function() {
        console.error('❌ Erro ao carregar SVG como imagem para PNG');
        alert('Erro ao processar SVG para PNG. Tente novamente.');
      };

      img.src = url;
    } catch (err) {
      console.error("❌ Erro crítico na exportação PNG:", err);
      alert(`Erro na exportação PNG: ${err}`);
    }
  };

  // Funções para controlar o dropdown de exportação
  const toggleExportDropdown = () => {
    setExportDropdownOpen(!exportDropdownOpen);
  };

  const handleExportOption = (option: string) => {
    setExportDropdownOpen(false);
    switch (option) {
      case 'pdf':
        exportToPDF();
        break;
      case 'png':
        exportToPNG();
        break;
      case 'bpmn':
        exportDiagram();
        break;
      default:
        break;
    }
  };

  // Função para sincronizar propriedades ER antes da exportação
  const syncErPropertiesToAttrs = () => {
    if (!modelerRef.current) return;

    const elementRegistry = modelerRef.current.get('elementRegistry') as any;
    const allElements = elementRegistry.getAll();
    
    console.log('🔧 Sincronizando propriedades ER para export...');
    
    allElements.forEach((element: any) => {
      const businessObject = element.businessObject;
      if (!businessObject) return;

      // Garantir que $attrs existe
      if (!businessObject.$attrs) {
        businessObject.$attrs = {};
      }

      // ✅ SINCRONIZAR PROPRIEDADES PARA TODAS AS ENTIDADES ER
      if (businessObject.erType) {
        // Propriedade base para todos os tipos ER
        businessObject.$attrs['er:erType'] = businessObject.erType;
        businessObject.$attrs['er:type'] = businessObject.erType.toLowerCase();
        
        if (businessObject.name) {
          businessObject.$attrs['name'] = businessObject.name;
        }

        // ✅ PROPRIEDADES ESPECÍFICAS DE ENTIDADES
        if (businessObject.erType === 'Entity') {
          if (businessObject.hasOwnProperty('isWeak')) {
            businessObject.$attrs['er:isWeak'] = businessObject.isWeak ? 'true' : 'false';
            console.log(`✅ Entity ${element.id}: isWeak = ${businessObject.isWeak}`);
          }
        }

        // ✅ PROPRIEDADES ESPECÍFICAS DE ATRIBUTOS (PK, FK, etc.)
        if (businessObject.erType === 'Attribute') {
          const attrProps = ['isPrimaryKey', 'isForeignKey', 'isRequired', 'isMultivalued', 'isDerived', 'isComposite'];
          
          attrProps.forEach(prop => {
            if (businessObject.hasOwnProperty(prop)) {
              businessObject.$attrs[`er:${prop}`] = businessObject[prop] ? 'true' : 'false';
              console.log(`✅ Attribute ${element.id}: ${prop} = ${businessObject[prop]}`);
            }
          });

          // Tipo de dados
          if (businessObject.dataType) {
            businessObject.$attrs['er:dataType'] = businessObject.dataType;
            console.log(`✅ Attribute ${element.id}: dataType = ${businessObject.dataType}`);
          }
        }

        // ✅ PROPRIEDADES ESPECÍFICAS DE RELACIONAMENTOS
        if (businessObject.erType === 'Relationship') {
          if (businessObject.hasOwnProperty('isIdentifying')) {
            businessObject.$attrs['er:isIdentifying'] = businessObject.isIdentifying ? 'true' : 'false';
            console.log(`✅ Relationship ${element.id}: isIdentifying = ${businessObject.isIdentifying}`);
          }
        }
      }

      // ✅ PROPRIEDADES DE CONEXÕES (cardinalidades, pai-filho)
      if (element.type === 'bpmn:SequenceFlow') {
        if (businessObject.cardinalitySource) {
          businessObject.$attrs['er:cardinalitySource'] = businessObject.cardinalitySource;
        }
        if (businessObject.cardinalityTarget) {
          businessObject.$attrs['er:cardinalityTarget'] = businessObject.cardinalityTarget;
        }
        if (businessObject.hasOwnProperty('isParentChild')) {
          businessObject.$attrs['er:isParentChild'] = businessObject.isParentChild ? 'true' : 'false';
        }
      }
    });
    
    console.log('✅ Sincronização de propriedades ER concluída');
  };

  // Função para exportar diagrama com propriedades ER preservadas
  const exportDiagram = async () => {
    if (!modelerRef.current) return;
    try {
      console.log('🎯 Iniciando exportação com preservação de propriedades ER...');
      
      // ✅ SINCRONIZAR PROPRIEDADES ANTES DA EXPORTAÇÃO
      syncErPropertiesToAttrs();
      
      // DEBUG: Verificar elementos após sincronização
      const elementRegistry = modelerRef.current.get('elementRegistry') as any;
      const allElements = elementRegistry.getAll();
      console.log('🔍 DEBUG EXPORT: Elementos após sincronização:');
      allElements.forEach((element: any) => {
        if (element.businessObject?.erType || element.type === 'bpmn:SequenceFlow') {
          console.log(`🔍 EXPORT: ${element.id} - tipo: ${element.type} - erType: ${element.businessObject?.erType}`);
          console.log('🔍 EXPORT: $attrs:', element.businessObject?.$attrs);
        }
      });
      
      const { xml } = await modelerRef.current!.saveXML({ format: true });
      const xmlString: string = xml ?? "";
      
      // DEBUG: Log do XML gerado para verificar se os atributos ER estão lá
      console.log('🔍 DEBUG EXPORT: XML gerado:');
      console.log(xmlString);
      
      setXml(xmlString);
      const blob = new Blob([xmlString], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagrama-er.bpmn";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting BPMN XML", err);
    }
  };

  // Função Fit All - ajusta canvas para mostrar todos os elementos
  const handleFitAll = () => {
    if (!modelerRef.current) return;
    try {
      const canvas = modelerRef.current.get('canvas') as any;
      canvas.zoom('fit-viewport');
      console.log('✅ Fit All executado - canvas ajustado para mostrar todos os elementos');
    } catch (error) {
      console.error('❌ Erro ao executar Fit All:', error);
    }
  };

  // Fechar dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (exportDropdownOpen && !target.closest('.export-dropdown-container')) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportDropdownOpen]);

  const setupMinimapToggle = () => {
    setTimeout(() => {
      const minimap = document.querySelector('.djs-minimap');
      if (minimap) {
        // Force minimap to be open by adding the 'open' class that the module expects
        minimap.classList.add('open');

        // Remove the default toggle element completely
        const defaultToggle = minimap.querySelector('.toggle');
        if (defaultToggle) {
          defaultToggle.remove();
        }

        // Remove existing custom toggle button if any
        const existingToggle = minimap.querySelector('.minimap-toggle');
        if (existingToggle) {
          existingToggle.remove();
        }

        // Create our custom toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'minimap-toggle';
        toggleButton.innerHTML = minimapMinimized ? '+' : '−';
        toggleButton.setAttribute('title', minimapMinimized ? 'Expandir minimap' : 'Minimizar minimap');

        // Add click event for our toggle
        const handleToggle = (e: Event) => {
          e.stopPropagation();
          const currentMinimized = minimap.classList.contains('minimized');
          const newMinimized = !currentMinimized;
          setMinimapMinimized(newMinimized);
          
          if (newMinimized) {
            minimap.classList.add('minimized');
            toggleButton.innerHTML = '+';
            toggleButton.setAttribute('title', 'Expandir minimap');
          } else {
            minimap.classList.remove('minimized');
            // Keep the 'open' class to ensure functionality
            minimap.classList.add('open');
            toggleButton.innerHTML = '−';
            toggleButton.setAttribute('title', 'Minimizar minimap');
          }
        };

        toggleButton.addEventListener('click', handleToggle);

        // Add click event to minimap itself to expand when minimized
        const handleMinimapClick = () => {
          if (minimap.classList.contains('minimized')) {
            setMinimapMinimized(false);
            minimap.classList.remove('minimized');
            minimap.classList.add('open');
            toggleButton.innerHTML = '−';
            toggleButton.setAttribute('title', 'Minimizar minimap');
          }
        };

        minimap.addEventListener('click', handleMinimapClick);

        // Append our toggle button to minimap
        minimap.appendChild(toggleButton);

        // Apply initial state - default is maximized and functional
        if (minimapMinimized) {
          minimap.classList.add('minimized');
        } else {
          // Ensure it's functional by default with 'open' class
          minimap.classList.add('open');
        }
      }
    }, 1000); // Wait for minimap to be rendered
  };

  // Função para lidar com saída
  const handleExit = () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      window.location.href = '/';
    }
  };

  // Função para salvar e sair
  const handleSaveAndExit = async () => {
    await exportDiagram();
    setHasUnsavedChanges(false);
    setTimeout(() => {
      window.location.href = '/';
    }, 500); // Pequeno delay para garantir o download
  };

  // Função para descartar e sair
  const handleDiscardAndExit = () => {
    setHasUnsavedChanges(false);
    window.location.href = '/';
  };

  // Função para cancelar saída
  const handleCancelExit = () => {
    setShowExitModal(false);
  };


  // Interface de erro
  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: 'red' }}>❌ Erro no ErModelerComponent</h2>
        <div style={{ 
          background: '#ffebee', 
          border: '1px solid #f44336', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <p style={{ color: '#d32f2f', margin: 0 }}><strong>Erro:</strong> {error}</p>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>Status: {status}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  // Interface principal
  return (
    <div className="diagram-editor er-modeler">
      <div className="editor-header">
        <div className="header-left">
          <img src={logoIsec} alt="ISEC Logo" className="editor-logo" />
        </div>
        <h1 className="editor-title">Diagrama Entidade Relacionamento</h1>
        <div className="editor-actions">
          <button className="fit-all-button" onClick={handleFitAll} title="Ajustar Visualização">
            <FitAllIcon size={24} />
          </button>
          
          {/* Dropdown de Exportação */}
          <div className="export-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
            <button className="download-button" onClick={toggleExportDropdown} title="Opções de Exportação">
              <PdfIcon size={24} />
              <ChevronDown size={24} style={{ marginLeft: '3px', marginTop: '2px', color: '#eaeaeaff' }} />
            </button>
            {exportDropdownOpen && (
              <div className="export-dropdown" style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                minWidth: '180px',
                marginTop: '4px'
              }}>
                <button 
                  className="dropdown-option" 
                  onClick={() => handleExportOption('pdf')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    borderRadius: '6px 6px 0 0'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <PdfIcon size={20} style={{ marginRight: '16px', color: '#6e1a1aff' }} />
                  Exportar (PDF)
                </button>
                <button 
                  className="dropdown-option" 
                  onClick={() => handleExportOption('png')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileImage size={20} style={{ marginRight: '16px', color: '#553996ff' }} />
                  Exportar (PNG)
                </button>
                <button 
                  className="dropdown-option" 
                  onClick={() => handleExportOption('bpmn')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    borderRadius: '0 0 6px 6px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <File size={20} style={{ marginRight: '16px', color: '#035e6eff' }} />
                  Exportar (.bpmn)
                </button>
              </div>
            )}
          </div>

          {/* Botão de Importação com novo estilo */}
          <button 
            className="upload-button" 
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: '#453b3b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            title="Importar Diagrama"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#212048ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#453b3b'}
          >
            <Upload size={24} />            
          </button>
          <input
            type="file"
            accept=".bpmn,.xml"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={importDiagram}
          />
        </div>
      </div>

      {/* Status bar - Muito utilizado para DEBUG */}
      {/* <div style={{
        padding: '8px 20px',
        backgroundColor: loading ? '#fff3e0' : '#e8f5e9',
        borderBottom: '1px solid #ddd',
        fontSize: '14px',
        color: loading ? '#f57c00' : '#388e3c'
      }}>
        Status: {status} {loading && '⏳'}
        {selectedElement && (
          <span style={{ marginLeft: '20px' }}>
            | Selecionado: {selectedElement.type} ({selectedElement.id})
          </span>
        )}
      </div> */}

      <div className="modeler-content">
        <div 
          ref={canvasRef} 
          className="modeler-container"
        ></div>
        <div className="properties-panel-container">
          <ErPropertiesPanel 
            element={selectedElement} 
            elements={selectedElements}
            modeler={modelerRef.current}
          />
        </div>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '18px',
            color: '#666',
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            <div>⏳ {status}</div>
          </div>
        )}
      </div>
      
      {/* Modal de confirmação de saída */}
      {showExitModal && (
        <div className="exit-modal-overlay">
          <div className="exit-modal">
            <h3>Trabalho não salvo</h3>
            <p>Você tem alterações não salvas. O que deseja fazer?</p>
            <div className="exit-modal-buttons">
              <button className="modal-save-button" onClick={handleSaveAndExit}>
                💾 Salvar e Sair
              </button>
              <button className="modal-discard-button" onClick={handleDiscardAndExit}>
                🗑️ Descartar e Sair
              </button>
              <button className="modal-cancel-button" onClick={handleCancelExit}>
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErModelerComponent;