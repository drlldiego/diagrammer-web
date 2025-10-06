/**
 * ElementPlacementRules
 * 
 * RuleProvider que implementa regras para impedir que elementos sejam colocados
 * sobre conexões existentes usando o sistema de regras do BPMN.js.
 */

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import EventBus from 'diagram-js/lib/core/EventBus';
import { ElementPlacementBlockerService } from '../services/element-placement-blocker.service';

const HIGH_PRIORITY = 1500;

interface MoveContext {
  shapes: any[];
  delta: { x: number; y: number };
}

interface CreateContext {
  shape: any;
  position?: { x: number; y: number };
}

interface ResizeContext {
  shape: any;
  newBounds: { x: number; y: number; width: number; height: number };
}

export default class ElementPlacementRules extends RuleProvider {
  static $inject = ['eventBus', 'elementRegistry'];
  
  private placementBlocker: ElementPlacementBlockerService;
  private elementRegistry: any;
  
  // Sistema de controle de sessões para notificações
  private sessionControl = {
    move: {
      hasShownNotification: false,
      currentElementId: null as string | null,
      isInSession: false
    },
    create: {
      hasShownNotification: false,
      isInSession: false
    },
    resize: {
      hasShownNotification: false,
      currentElementId: null as string | null,
      isInSession: false
    }
  };

  constructor(eventBus: EventBus, elementRegistry: any) {
    super(eventBus);
    this.elementRegistry = elementRegistry;
    this.placementBlocker = new ElementPlacementBlockerService(elementRegistry, eventBus);
    this.init();
    this.setupVisualFeedback(eventBus);
  }

  public init() {
    // Regra para movimento de elementos
    this.addRule('elements.move', HIGH_PRIORITY, (context: MoveContext) => {
      const elements = context.shapes || [];
      const delta = context.delta || { x: 0, y: 0 };

      // Verificar cada elemento sendo movido
      for (const element of elements) {
        if (!element) continue;

        const newX = element.x + delta.x;
        const newY = element.y + delta.y;
        
        // Verificar se a nova posição é válida
        if (!this.placementBlocker.isPositionValid(newX, newY, element.width, element.height, element.id)) {
          // Mostrar notificação apenas uma vez por sessão de movimento
          if (!this.sessionControl.move.hasShownNotification || 
              this.sessionControl.move.currentElementId !== element.id) {
            
            const result = this.placementBlocker.validateElementMove(element, delta);
            this.sessionControl.move.hasShownNotification = true;
            this.sessionControl.move.currentElementId = element.id;
          }
          return false; // Bloquear movimento
        }
      }

      return true; // Permitir movimento
    });

    // Regra para criação de elementos
    this.addRule('shape.create', HIGH_PRIORITY, (context: CreateContext) => {
      const shape = context.shape;
      if (!shape) return true;

      // Para criação, as coordenadas podem estar em position ou diretamente no shape
      const x = context.position?.x || shape.x || 0;
      const y = context.position?.y || shape.y || 0;
      const width = shape.width || 100;
      const height = shape.height || 80;

      // Verificar se a posição de criação é válida
      if (!this.placementBlocker.isPositionValid(x, y, width, height)) {
        // Mostrar notificação apenas uma vez por sessão de criação
        if (!this.sessionControl.create.hasShownNotification) {
          const result = this.placementBlocker.validateElementCreation(x, y, width, height);
          this.sessionControl.create.hasShownNotification = true;
        }
        return false; // Bloquear criação
      }

      return true; // Permitir criação
    });

    // Regra para redimensionamento
    this.addRule('shape.resize', HIGH_PRIORITY, (context: ResizeContext) => {
      const shape = context.shape;
      const newBounds = context.newBounds;
      
      if (!shape || !newBounds) return true;

      // Verificar se o novo tamanho é válido
      if (!this.placementBlocker.isPositionValid(newBounds.x, newBounds.y, newBounds.width, newBounds.height, shape.id)) {
        // Mostrar notificação apenas uma vez por sessão de redimensionamento
        if (!this.sessionControl.resize.hasShownNotification || 
            this.sessionControl.resize.currentElementId !== shape.id) {
          
          const result = this.placementBlocker.validateElementResize(shape, newBounds);
          this.sessionControl.resize.hasShownNotification = true;
          this.sessionControl.resize.currentElementId = shape.id;
        }
        return false; // Bloquear redimensionamento
      }

      return true; // Permitir redimensionamento
    });
  }

  /**
   * Configurar feedback visual durante operações
   */
  private setupVisualFeedback(eventBus: EventBus) {
    let currentDragElement: any = null;
    let isCreating = false;

    // Controle de sessões de movimento
    eventBus.on('element.move.start', (event: any) => {
      currentDragElement = event.element;
      // Reset da sessão de movimento
      this.sessionControl.move.hasShownNotification = false;
      this.sessionControl.move.currentElementId = event.element?.id || null;
      this.sessionControl.move.isInSession = true;
    });

    eventBus.on('element.move.move', (event: any) => {
      if (!currentDragElement) return;

      const dx = event.dx || 0;
      const dy = event.dy || 0;
      
      // Verificar se a posição atual do drag é válida
      const isValid = this.placementBlocker.isPositionValid(
        currentDragElement.x + dx, 
        currentDragElement.y + dy, 
        currentDragElement.width, 
        currentDragElement.height, 
        currentDragElement.id
      );

      // Adicionar classe CSS para feedback visual
      const gfx = this.elementRegistry.getGraphics(currentDragElement);
      if (gfx) {
        if (isValid) {
          gfx.classList.remove('invalid-position');
          gfx.classList.add('valid-position');
        } else {
          gfx.classList.remove('valid-position');
          gfx.classList.add('invalid-position');
        }
      }
    });

    eventBus.on('element.move.end', (event: any) => {
      // Limpar feedback visual e finalizar sessão
      if (currentDragElement) {
        const gfx = this.elementRegistry.getGraphics(currentDragElement);
        if (gfx) {
          gfx.classList.remove('valid-position', 'invalid-position');
        }
        currentDragElement = null;
      }
      
      // Finalizar sessão de movimento
      this.sessionControl.move.isInSession = false;
    });

    // Controle de sessões de criação
    eventBus.on('create.start', (event: any) => {
      isCreating = true;
      // Reset da sessão de criação
      this.sessionControl.create.hasShownNotification = false;
      this.sessionControl.create.isInSession = true;
    });

    eventBus.on('create.move', (event: any) => {
      if (!isCreating) return;

      const shape = event.shape;
      if (!shape) return;

      // Calcular posição do centro do shape
      const shapeX = event.x - (shape.width / 2);
      const shapeY = event.y - (shape.height / 2);

      // Verificar se a posição de criação é válida
      const isValid = this.placementBlocker.isPositionValid(shapeX, shapeY, shape.width, shape.height);

      // Adicionar feedback visual via cursor
      const canvas = this.elementRegistry.getGraphics('__implicitroot')?.parentElement;
      if (canvas) {
        if (isValid) {
          canvas.style.cursor = 'crosshair';
        } else {
          canvas.style.cursor = 'not-allowed';
        }
      }
    });

    eventBus.on('create.end', (event: any) => {
      isCreating = false;
      
      // Restaurar cursor e finalizar sessão
      const canvas = this.elementRegistry.getGraphics('__implicitroot')?.parentElement;
      if (canvas) {
        canvas.style.cursor = '';
      }
      
      // Finalizar sessão de criação
      this.sessionControl.create.isInSession = false;
    });

    // Controle de sessões de redimensionamento  
    eventBus.on('element.resize.start', (event: any) => {
      // Reset da sessão de redimensionamento
      this.sessionControl.resize.hasShownNotification = false;
      this.sessionControl.resize.currentElementId = event.element?.id || null;
      this.sessionControl.resize.isInSession = true;
    });

    eventBus.on('element.resize.end', (event: any) => {
      // Finalizar sessão de redimensionamento
      this.sessionControl.resize.isInSession = false;
    });
  }

  /**
   * API pública para validação externa
   */
  public canPlaceAt(x: number, y: number, width: number, height: number, excludeElementId?: string): boolean {
    return this.placementBlocker.isPositionValid(x, y, width, height, excludeElementId);
  }

  public findValidPosition(x: number, y: number, width: number, height: number, excludeElementId?: string) {
    return this.placementBlocker.findNearbyValidPosition(x, y, width, height, excludeElementId);
  }
}

// Módulo para integração com BPMN.js
export const ElementPlacementRulesModule = {
  __init__: ['elementPlacementRules'],
  elementPlacementRules: ['type', ElementPlacementRules]
};