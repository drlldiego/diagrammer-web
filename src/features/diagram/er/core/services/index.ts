/**
 * @fileoverview Ponto de exportação central para todos os serviços da aplicação.
 * @description Fornece acesso unificado e organizado à funcionalidade da camada de serviço (Service Layer).
 */
import { PropertyManagementService } from './property-management.service';
import { RenderingStrategyService, ChenRenderingStrategy, CrowsFootRenderingStrategy } from './rendering-strategy.service';
import { 
  NotationService, 
  ChenNotationStrategy, 
  CrowsFootNotationStrategy 
} from './notation.service';
import { ErEventService } from './er-event.service';

export { 
  PropertyManagementService,
  RenderingStrategyService,
  ChenRenderingStrategy,
  CrowsFootRenderingStrategy,
  NotationService, 
  ChenNotationStrategy, 
  CrowsFootNotationStrategy, 
  ErEventService 
};

// Service Factory para facilitar a criação e configuração dos serviços
export class ErServiceFactory {
  static createPropertyManagementService(modeler: any, notation: 'chen' | 'crowsfoot' = 'chen') {
    return new PropertyManagementService(modeler, notation);
  }

  static createRenderingStrategyService(notation: 'chen' | 'crowsfoot' = 'chen') {
    return new RenderingStrategyService(notation);
  }

  static createNotationService(notation: 'chen' | 'crowsfoot' = 'chen') {
    return new NotationService(notation);
  }

  static createEventService(eventBus?: any) {
    return new ErEventService(eventBus);
  }

  static createServicesBundle(modeler: any, notation: 'chen' | 'crowsfoot' = 'chen') {
    const eventBus = modeler?.get?.('eventBus');
    
    return {
      propertyManagement: new PropertyManagementService(modeler, notation),
      notation: new NotationService(notation),
      events: new ErEventService(eventBus),
      rendering: new RenderingStrategyService(notation)
    };
  }
}