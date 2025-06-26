import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import EventBus from 'diagram-js/lib/core/EventBus';

export default class ErRules extends RuleProvider {
  static $inject = ['eventBus'];

  constructor(eventBus: EventBus) {
    super(eventBus);
    this.init();
  }

  public init() {
    // Regras para conexões
    this.addRule('connection.create', 1500, function(context: any) {
      const source = context.source;
      const target = context.target;

      // Permite conexões entre:
      // - Entidade -> Atributo
      // - Entidade -> Relacionamento
      // - Relacionamento -> Entidade
      
      if (source.type === 'er:Entity' && target.type === 'er:Attribute') {
        return true;
      }
      
      if (source.type === 'er:Entity' && target.type === 'er:Relationship') {
        return true;
      }
      
      if (source.type === 'er:Relationship' && target.type === 'er:Entity') {
        return true;
      }

      // Não permite outras combinações
      return false;
    });

    // Permite redimensionar todos os elementos
    this.addRule('shape.resize', 1500, function() {
      return true;
    });

    // Regras para mover elementos
    this.addRule('shape.move', 1500, function() {
      return true;
    });

    // Regras para deletar elementos
    this.addRule('elements.delete', 1500, function() {
      return true;
    });
  }
}