/**
 * Serviço para agrupamento visual simples
 * Cria overlays CSS coloridos sem mexer nos elementos BPMN
 */

import { ErElement } from "../../er/core";
import { logger } from "../../../../utils/logger";

export interface VisualGroup {
  id: string;
  name: string;
  elements: ErElement[];
  color: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface GroupColors {
  background: string;
  border: string;
  text: string;
}

export class VisualGroupingService {
  private groups: Map<string, VisualGroup> = new Map();
  private overlayContainer: HTMLElement | null = null;
  private canvas: any;
  private elementRegistry: any;
  private selection: any;
  private eventBus: any;
  private modeler: any;

  // Cores pré-definidas para grupos
  private readonly GROUP_COLORS: GroupColors[] = [
    { background: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#1e40af' },
    { background: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#047857' },
    { background: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#92400e' },
    { background: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#dc2626' },
    { background: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6', text: '#7c3aed' },
    { background: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#be185d' },
  ];

  constructor(canvas: any, elementRegistry: any, selection: any, eventBus: any) {
    this.canvas = canvas;
    this.elementRegistry = elementRegistry;
    this.selection = selection;
    this.eventBus = eventBus;
    this.modeler = null; // Not directly available, set to null
    
    this.setupOverlayContainer();
    this.setupEventListeners();
  }

  /**
   * Cria container para overlays visuais
   */
  private setupOverlayContainer(): void {
    const canvasContainer = this.canvas.getContainer();
    
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'visual-groups-overlay';
    this.overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;
    
    canvasContainer.appendChild(this.overlayContainer);
  }

  /**
   * Configura event listeners para atualizar grupos
   */
  private setupEventListeners(): void {
    let updateTimeout: NodeJS.Timeout | null = null;
    
    // Função throttled para atualizar grupos (evita muitas atualizações)
    const throttledUpdate = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(() => {
        this.updateAllGroupVisuals();
        updateTimeout = null;
      }, 16); // ~60 FPS
    };

    // Atualizar grupos quando elementos se movem
    this.eventBus.on('element.changed', throttledUpdate);

    // Atualizar grupos quando canvas é movido ou zoom muda
    this.eventBus.on('canvas.viewbox.changed', throttledUpdate);

    // Atualizar quando elementos são movidos
    this.eventBus.on('element.move.end', throttledUpdate);

    // Atualizar durante zoom
    this.eventBus.on('canvas.zoom.changed', throttledUpdate);

    // Atualizar quando canvas é redimensionado
    this.eventBus.on('canvas.resized', throttledUpdate);

    // Seleção em bloco quando clicar em elemento do grupo
    this.eventBus.on('element.click', (event: any) => {
      const element = event.element;
      const group = this.findGroupByElement(element.id);
      
      if (group && !event.originalEvent.ctrlKey) {
        // Selecionar todos os elementos do grupo
        this.selection.select(group.elements);
      }
    });
  }

  /**
   * Cria um novo grupo com os elementos selecionados
   */
  createGroup(elements: ErElement[], name?: string): string | null {
    if (elements.length < 2) {
      logger.warn('Pelo menos 2 elementos são necessários para criar um grupo', 'VisualGroupingService');
      return null;
    }

    // Gerar ID único
    const groupId = `visual-group-${Date.now()}`;
    
    // Escolher cor disponível
    const colorIndex = this.groups.size % this.GROUP_COLORS.length;
    const colors = this.GROUP_COLORS[colorIndex];
    
    // Calcular bounds do grupo
    const bounds = this.calculateGroupBounds(elements);
    
    const group: VisualGroup = {
      id: groupId,
      name: name || `Grupo ${this.groups.size + 1}`,
      elements: [...elements],
      color: colors.background,
      bounds
    };

    this.groups.set(groupId, group);
    this.createGroupVisual(group, colors);
    
    logger.info(`Grupo visual "${group.name}" criado com ${elements.length} elementos`, 'VisualGroupingService');
    return groupId;
  }

  /**
   * Remove um grupo
   */
  removeGroup(groupId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    // Remover visual
    const visualElement = document.querySelector(`[data-group-id="${groupId}"]`);
    if (visualElement) {
      visualElement.remove();
    }

    this.groups.delete(groupId);
    logger.info(`Grupo visual "${group.name}" removido`, 'VisualGroupingService');
    return true;
  }

  /**
   * Calcula os bounds de um grupo baseado nos elementos
   */
  private calculateGroupBounds(elements: ErElement[]): VisualGroup['bounds'] {
    const padding = 20;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    elements.forEach(element => {
      const x = element.x || 0;
      const y = element.y || 0;
      const width = element.width || 80;
      const height = element.height || 80;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2)
    };
  }

  /**
   * Converte coordenadas do diagrama para coordenadas da tela
   */
  private diagramToScreenCoordinates(bounds: VisualGroup['bounds']): { x: number; y: number; width: number; height: number } {
    const viewbox = this.canvas.viewbox();
    
    return {
      x: (bounds.x - viewbox.x) * viewbox.scale,
      y: (bounds.y - viewbox.y) * viewbox.scale,
      width: bounds.width * viewbox.scale,
      height: bounds.height * viewbox.scale
    };
  }

  /**
   * Cria o visual do grupo no DOM
   */
  private createGroupVisual(group: VisualGroup, colors: GroupColors): void {
    if (!this.overlayContainer) return;

    const groupElement = document.createElement('div');
    groupElement.className = 'visual-group';
    groupElement.setAttribute('data-group-id', group.id);
    
    // Calcular posição correta na tela
    const screenPos = this.diagramToScreenCoordinates(group.bounds);
    
    groupElement.style.cssText = `
      position: absolute;
      left: ${screenPos.x}px;
      top: ${screenPos.y}px;
      width: ${screenPos.width}px;
      height: ${screenPos.height}px;
      background: ${colors.background};
      border: 2px solid ${colors.border};
      border-radius: 12px;
      pointer-events: none;
      transition: none;
      z-index: -1;
    `;

    // Adicionar label do grupo
    const label = document.createElement('div');
    label.className = 'visual-group-label';
    label.textContent = group.name;
    label.style.cssText = `
      position: absolute;
      top: -8px;
      left: 8px;
      background: ${colors.border};
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    `;

    groupElement.appendChild(label);
    this.overlayContainer.appendChild(groupElement);
  }

  /**
   * Atualiza visuais de todos os grupos
   */
  private updateAllGroupVisuals(): void {
    const groupsArray = Array.from(this.groups.values());
    groupsArray.forEach(group => {
      // Recalcular bounds
      group.bounds = this.calculateGroupBounds(group.elements);
      
      // Atualizar visual
      const groupElement = document.querySelector(`[data-group-id="${group.id}"]`) as HTMLElement;
      if (groupElement) {
        const screenPos = this.diagramToScreenCoordinates(group.bounds);
        
        groupElement.style.left = `${screenPos.x}px`;
        groupElement.style.top = `${screenPos.y}px`;
        groupElement.style.width = `${screenPos.width}px`;
        groupElement.style.height = `${screenPos.height}px`;
      }
    });
  }

  /**
   * Encontra grupo que contém um elemento
   */
  private findGroupByElement(elementId: string): VisualGroup | null {
    const groupsArray = Array.from(this.groups.values());
    for (const group of groupsArray) {
      if (group.elements.some(el => el.id === elementId)) {
        return group;
      }
    }
    return null;
  }

  /**
   * Retorna todos os grupos
   */
  getAllGroups(): VisualGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Limpa todos os grupos
   */
  clearAllGroups(): void {
    const groupsArray = Array.from(this.groups.values());
    groupsArray.forEach(group => {
      this.removeGroup(group.id);
    });
  }

  /**
   * Serializa grupos para persistência
   */
  serializeGroups(): any[] {
    const serializedGroups: any[] = [];
    
    this.groups.forEach(group => {
      serializedGroups.push({
        id: group.id,
        name: group.name,
        color: group.color,
        elementIds: group.elements.map(el => el.id)
      });
    });
    
    return serializedGroups;
  }

  /**
   * Deserializa e restaura grupos
   */
  deserializeGroups(serializedGroups: any[]): void {
    // Limpar grupos existentes
    this.clearAllGroups();
    
    serializedGroups.forEach(groupData => {
      // Recuperar elementos pelos IDs
      const elements = groupData.elementIds
        .map((id: string) => this.elementRegistry.get(id))
        .filter((el: any) => el); // Filtrar elementos que ainda existem
      
      if (elements.length >= 2) {
        // Recrear grupo
        const colorIndex = this.groups.size % this.GROUP_COLORS.length;
        const colors = this.GROUP_COLORS.find(c => c.background === groupData.color) || this.GROUP_COLORS[colorIndex];
        
        const bounds = this.calculateGroupBounds(elements);
        
        const group: VisualGroup = {
          id: groupData.id,
          name: groupData.name,
          elements: elements,
          color: groupData.color,
          bounds
        };

        this.groups.set(groupData.id, group);
        this.createGroupVisual(group, colors);
      }
    });
    
    logger.info(`${serializedGroups.length} grupos visuais restaurados`, 'VisualGroupingService');
  }

  /**
   * Salva grupos no XML BPMN como propriedades customizadas
   */
  saveGroupsToXML(): void {
    try {
      const serializedGroups = this.serializeGroups();
      
      // Obter o root element
      const rootElement = this.canvas.getRootElement();
      const businessObject = rootElement.businessObject;

      // Inicializar $attrs se não existir
      if (!businessObject.$attrs) {
        businessObject.$attrs = {};
      }

      if (serializedGroups.length === 0) {
        // Se não há grupos, remover propriedade se existir
        delete businessObject.$attrs['visualGroups'];
        logger.debug('Propriedade visualGroups removida (nenhum grupo)', 'VisualGroupingService');
        return;
      }

      // Salvar grupos como propriedade customizada
      businessObject.$attrs['visualGroups'] = JSON.stringify(serializedGroups);
      
      logger.info(`${serializedGroups.length} grupos salvos no XML BPMN como propriedades`, 'VisualGroupingService');
    } catch (error) {
      logger.error('Erro ao salvar grupos no XML:', 'VisualGroupingService', error as Error);
    }
  }

  /**
   * Carrega grupos do XML BPMN
   */
  loadGroupsFromXML(): void {
    try {
      const rootElement = this.canvas.getRootElement();
      const businessObject = rootElement.businessObject;

      if (!businessObject.$attrs?.visualGroups) {
        logger.debug('Nenhum grupo visual encontrado nas propriedades do XML', 'VisualGroupingService');
        return;
      }

      // Parse e deserializar grupos
      const serializedGroups = JSON.parse(businessObject.$attrs.visualGroups);
      this.deserializeGroups(serializedGroups);
      
      logger.info(`Grupos carregados das propriedades XML: ${serializedGroups.length}`, 'VisualGroupingService');
      
    } catch (error) {
      logger.error('Erro ao carregar grupos do XML:', 'VisualGroupingService', error as Error);
    }
  }

  /**
   * Modifica string SVG para incluir grupos visuais
   */
  addGroupsToSVGString(svgString: string): string {
    try {
      if (this.groups.size === 0) return svgString;

      // Validar SVG string básico
      if (!svgString || !svgString.includes('<svg')) {
        logger.warn('SVG string inválido ou vazio', 'VisualGroupingService');
        return svgString;
      }

      console.log('=== INÍCIO DEBUG SVG GRUPOS ===');
      console.log('SVG original length:', svgString.length);
      console.log('SVG original primeiro trecho:', svgString.substring(0, 300));
      console.log('Número de grupos:', this.groups.size);

      // Primeira tentativa: usar abordagem mais simples sem coordenadas complexas
      let simpleGroupsSVG = '';
      
      this.groups.forEach((group, index) => {
        // Validar bounds básicos
        if (!group.bounds || typeof group.bounds.x !== 'number') {
          console.log(`Grupo ${group.id} tem bounds inválidos:`, group.bounds);
          return;
        }

        console.log(`Processando grupo ${index + 1}:`, {
          name: group.name,
          bounds: group.bounds,
          color: group.color
        });

        // Usar coordenadas mais simples e seguras
        const x = Math.max(0, Math.round(group.bounds.x || 0));
        const y = Math.max(0, Math.round(group.bounds.y || 0));
        const width = Math.max(10, Math.round(group.bounds.width || 100));
        const height = Math.max(10, Math.round(group.bounds.height || 50));

        // Nome seguro (sem caracteres especiais)
        const safeName = (group.name || 'Group').replace(/[<>&"']/g, '_');
        
        // SVG super simples
        const simpleRect = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="rgba(0,123,255,0.1)" stroke="rgba(0,123,255,0.5)" stroke-width="2"/>`;
        
        simpleGroupsSVG += simpleRect + '\n';
        
        console.log(`Grupo ${safeName} - Rect gerado:`, simpleRect);
      });

      if (!simpleGroupsSVG) {
        console.log('Nenhum grupo SVG gerado');
        return svgString;
      }

      console.log('SVG dos grupos gerado:', simpleGroupsSVG);

      // CORREÇÃO: encontrar ponto correto de inserção dentro do SVG
      let modifiedSVG;
      const viewportPoint = svgString.indexOf('<g class="viewport">');
      
      if (viewportPoint !== -1) {
        console.log('Inserindo grupos antes do viewport');
        const before = svgString.substring(0, viewportPoint);
        const after = svgString.substring(viewportPoint);
        modifiedSVG = before + simpleGroupsSVG + after;
      } else {
        console.log('Viewport não encontrado, procurando tag <svg> correta');
        
        // Procurar a tag SVG real (não apenas o primeiro >)
        const svgTagMatch = svgString.match(/<svg[^>]*>/);
        if (!svgTagMatch) {
          console.log('Erro: tag <svg> não encontrada');
          return svgString;
        }
        
        const svgTagEnd = svgString.indexOf(svgTagMatch[0]) + svgTagMatch[0].length;
        console.log('Posição da tag SVG:', svgTagEnd);
        console.log('Tag SVG encontrada:', svgTagMatch[0]);
        
        const before = svgString.substring(0, svgTagEnd);
        const after = svgString.substring(svgTagEnd);
        modifiedSVG = before + '\n' + simpleGroupsSVG + after;
      }

      console.log('SVG modificado length:', modifiedSVG.length);
      console.log('SVG modificado primeiro trecho:', modifiedSVG.substring(0, 400));

      // Validação simples
      if (modifiedSVG.includes('<svg') && modifiedSVG.includes('</svg>') && modifiedSVG.length > svgString.length) {
        console.log('=== SVG MODIFICADO COM SUCESSO ===');
        logger.info(`${this.groups.size} grupos adicionados ao SVG string para exportação`, 'VisualGroupingService');
        return modifiedSVG;
      } else {
        console.log('=== SVG MODIFICADO INVÁLIDO, RETORNANDO ORIGINAL ===');
        logger.warn('SVG modificado parece inválido, retornando original', 'VisualGroupingService');
        return svgString;
      }

    } catch (error) {
      console.error('ERRO no addGroupsToSVGString:', error);
      logger.error('Erro ao adicionar grupos ao SVG string:', 'VisualGroupingService', error as Error);
      return svgString;
    }
  }

  /**
   * Método legacy mantido para compatibilidade
   */
  addGroupsToSVG(): void {
    // Este método agora não faz nada pois a modificação é feita no SVG string
    logger.debug('addGroupsToSVG chamado - usando addGroupsToSVGString em vez disso', 'VisualGroupingService');
  }

  /**
   * Remove grupos do SVG após exportação
   */
  removeGroupsFromSVG(): void {
    try {
      const svg = this.canvas.getContainer().querySelector('svg');
      if (!svg) return;

      const exportGroups = svg.querySelectorAll('.export-visual-group');
      exportGroups.forEach((group: Element) => group.remove());

      logger.debug('Grupos removidos do SVG após exportação', 'VisualGroupingService');
    } catch (error) {
      logger.error('Erro ao remover grupos do SVG:', 'VisualGroupingService', error as Error);
    }
  }

  /**
   * Obtém cor da borda baseada na cor de fundo
   */
  private getGroupBorderColor(backgroundColor: string): string {
    // Mapear cores de fundo para cores de borda
    const colorMap: { [key: string]: string } = {
      'rgba(59, 130, 246, 0.15)': '#3b82f6',
      'rgba(16, 185, 129, 0.15)': '#10b981',
      'rgba(245, 158, 11, 0.15)': '#f59e0b',
      'rgba(239, 68, 68, 0.15)': '#ef4444',
      'rgba(139, 92, 246, 0.15)': '#8b5cf6',
      'rgba(236, 72, 153, 0.15)': '#ec4899',
    };

    return colorMap[backgroundColor] || '#6b7280';
  }

  /**
   * Verifica se o serviço está pronto
   */
  isReady(): boolean {
    return !!(this.canvas && this.elementRegistry && this.selection && this.eventBus && this.overlayContainer);
  }
}