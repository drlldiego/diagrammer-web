/**
 * ErSelectionEnhancer - Módulo para aprimorar a seleção de elementos ER
 * Implementa funcionalidade Shift+click para selecionar automaticamente ligações entre elementos
 */

import { logger } from '../../../../../utils/logger';

interface Element {
  id: string;
  type: string;
  businessObject?: {
    erType?: string;
    [key: string]: any;
  };
  source?: Element;
  target?: Element;
  waypoints?: Array<{ x: number; y: number }>;
}

interface EventBus {
  on: (event: string, callback: (event: any) => void) => void;
  fire: (event: string, data: any) => void;
}

interface ElementRegistry {
  get: (id: string) => Element | null;
  getAll: () => Element[];
  getGraphics: (element: Element) => any;
}

interface Selection {
  get: () => Element[];
  select: (elements: Element[]) => void;
  deselect: (elements?: Element[]) => void;
  isSelected: (element: Element) => boolean;
}

export default class ErSelectionEnhancer {
  static $inject = ['eventBus', 'elementRegistry', 'selection', 'canvas'];
  
  private eventBus: EventBus;
  private elementRegistry: ElementRegistry;
  private selection: Selection;
  private canvas: any;
  private isShiftPressed: boolean = false;

  constructor(eventBus: EventBus, elementRegistry: ElementRegistry, selection: Selection, canvas: any) {
    this.eventBus = eventBus;
    this.elementRegistry = elementRegistry;
    this.selection = selection;
    this.canvas = canvas;        
    this.init();
  }

  private init() {
    this.setupKeyboardHandlers();
    this.setupSelectionHandlers();
  }

  private setupKeyboardHandlers() {
    // Monitorar estado da tecla Shift
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Shift') {
        this.isShiftPressed = true;
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        this.isShiftPressed = false;
      }
    });

    // Garantir que o estado seja resetado se a janela perder o foco
    window.addEventListener('blur', () => {
      this.isShiftPressed = false;
    });
  }

  private setupSelectionHandlers() {
    // Interceptar eventos de seleção
    this.eventBus.on('selection.changed', (event: any) => {
      if (this.isShiftPressed && event.newSelection && event.newSelection.length > 0) {
        this.handleShiftSelection(event.newSelection, event.oldSelection || []);
      }
    });

    // Interceptar cliques em elementos
    this.eventBus.on('element.click', (event: any) => {
      if (this.isShiftPressed && event.element) {        
        this.handleShiftClick(event.element);
      }
    });
  }

  private handleShiftSelection(newSelection: Element[], oldSelection: Element[]) {    

    // Se apenas um elemento foi adicionado à seleção, verificar ligações
    if (newSelection.length > oldSelection.length) {
      const addedElements = newSelection.filter(e => !oldSelection.find(old => old.id === e.id));
      
      if (addedElements.length === 1) {
        this.handleShiftClick(addedElements[0]);
      }
    }
  }

  private handleShiftClick(clickedElement: Element) {    
    const currentSelection = this.selection.get();    
    // Encontrar ligações entre o elemento clicado e os elementos já selecionados
    const connectionsToAdd = this.findConnectionsBetweenElements(clickedElement, currentSelection);
    
    if (connectionsToAdd.length > 0) {            
      // Adicionar as ligações à seleção
      const newSelection = [...currentSelection, clickedElement, ...connectionsToAdd];
      const uniqueSelection = this.removeDuplicateElements(newSelection);            
      this.selection.select(uniqueSelection);
    } else {
    }
  }

  private findConnectionsBetweenElements(newElement: Element, existingElements: Element[]): Element[] {
    const allConnections = this.getAllConnections();
    const connectionsToAdd: Element[] = [];

    // Para cada elemento já selecionado, verificar se há conexões com o novo elemento
    existingElements.forEach(existingElement => {
      const connectionsBetween = allConnections.filter(connection => 
        this.areElementsConnected(connection, newElement, existingElement)
      );

      if (connectionsBetween.length > 0) {        
        connectionsToAdd.push(...connectionsBetween);
      }
    });

    return this.removeDuplicateElements(connectionsToAdd);
  }

  private getAllConnections(): Element[] {
    const allElements = this.elementRegistry.getAll();
    return allElements.filter(element => this.isConnection(element));
  }

  private isConnection(element: Element): boolean {
    return element.type === 'bpmn:SequenceFlow' || 
           (element.waypoints && element.waypoints.length > 0) ||
           element.type.includes('Connection');
  }

  private areElementsConnected(connection: Element, element1: Element, element2: Element): boolean {
    if (!connection.source || !connection.target) {
      return false;
    }

    return (connection.source.id === element1.id && connection.target.id === element2.id) ||
           (connection.source.id === element2.id && connection.target.id === element1.id);
  }

  private removeDuplicateElements(elements: Element[]): Element[] {
    const seen = new Set<string>();
    return elements.filter(element => {
      if (seen.has(element.id)) {
        return false;
      }
      seen.add(element.id);
      return true;
    });
  }

  /**
   * Método público para encontrar todas as ligações entre elementos selecionados
   * Pode ser usado externamente para análise ou debug
   */
  public findAllConnectionsBetweenSelected(): Element[] {
    const selected = this.selection.get();
    
    if (selected.length < 2) {
      return [];
    }

    const allConnections = this.getAllConnections();
    const connectionsBetweenSelected: Element[] = [];

    // Verificar todas as combinações de elementos selecionados
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const element1 = selected[i];
        const element2 = selected[j];
        
        const connectionsBetween = allConnections.filter(connection => 
          this.areElementsConnected(connection, element1, element2)
        );

        connectionsBetweenSelected.push(...connectionsBetween);
      }
    }

    return this.removeDuplicateElements(connectionsBetweenSelected);
  }

  /**
   * Método para selecionar automaticamente todas as ligações entre elementos atualmente selecionados
   */
  public selectAllConnectionsBetween() {
    const connections = this.findAllConnectionsBetweenSelected();
    if (connections.length > 0) {
      const currentSelection = this.selection.get();
      const newSelection = [...currentSelection, ...connections];
      const uniqueSelection = this.removeDuplicateElements(newSelection);
            
      this.selection.select(uniqueSelection);
    }
  }
}