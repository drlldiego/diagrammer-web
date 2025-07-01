import BpmnJS from 'bpmn-js/lib/Modeler';
import { DiagramType } from '../types/DiagramTypes';
import { ERModule } from '../modules';

export class ModuleLoader {
  private static instance: ModuleLoader;
  private loadedModules: Map<DiagramType, any[]> = new Map();

  public static getInstance(): ModuleLoader {
    if (!ModuleLoader.instance) {
      ModuleLoader.instance = new ModuleLoader();
    }
    return ModuleLoader.instance;
  }

  public async loadModulesForType(type: DiagramType): Promise<any[]> {
    if (this.loadedModules.has(type)) {
      return this.loadedModules.get(type)!;
    }

    const modules = await this.getModulesForType(type);
    this.loadedModules.set(type, modules);
    return modules;
  }

  private async getModulesForType(type: DiagramType): Promise<any[]> {
    const baseModules = [
      require('bpmn-js/lib/features/modeling').default,
      require('bpmn-js/lib/features/move').default,
      require('bpmn-js/lib/features/selection').default,
      require('bpmn-js/lib/features/resize').default,
      require('bpmn-js/lib/features/create').default,
      require('bpmn-js/lib/features/connect').default,
      require('bpmn-js/lib/features/keyboard').default,
      require('bpmn-js/lib/features/mouse').default
    ];

    switch (type) {
      case 'bpmn':
        return [
          ...baseModules,
          require('bpmn-js/lib/features/palette').default,
          require('bpmn-js/lib/features/context-pad').default,
          require('bpmn-js/lib/features/rules').default
        ];
      
      case 'er':
        return [
          ...baseModules,
          ERModule,
          require('bpmn-js/lib/features/palette').default,
          require('bpmn-js/lib/features/context-pad').default
        ];
      
      default:
        return baseModules;
    }
  }

  public createModelerWithModules(container: HTMLElement, type: DiagramType): BpmnJS {
    const modules = this.loadedModules.get(type) || [];
    
    return new BpmnJS({
      container,
      modules,
      keyboard: {
        bindTo: window
      },
      additionalModules: type === 'er' ? [ERModule] : []
    });
  }
}

export {};