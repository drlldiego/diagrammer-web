export class ERRules {
  private _eventBus: any;

  constructor(eventBus: any) {
    this._eventBus = eventBus;
    console.log('🔧 ERRules: Inicializando com prioridade máxima...');
    
    // 🚨 CRÍTICO: Sobrescrever TODAS as regras com prioridade máxima
    this.setupERRules();
  }

  private setupERRules() {
    // Prioridade MUITO ALTA para sobrescrever regras BPMN
    const HIGHEST_PRIORITY = 10000;

    // ✅ PERMITIR CRIAÇÃO de elementos ER
    this._eventBus.on('commandStack.shape.create.canExecute', HIGHEST_PRIORITY, (context: any) => {
      return this.canCreateShape(context);
    });

    // ✅ PERMITIR MOVIMENTO de elementos ER
    this._eventBus.on('commandStack.shape.move.canExecute', HIGHEST_PRIORITY, (context: any) => {
      return this.canMoveShape(context);
    });

    // ✅ PERMITIR CONEXÕES entre elementos ER
    this._eventBus.on('commandStack.connection.create.canExecute', HIGHEST_PRIORITY, (context: any) => {
      return this.canCreateConnection(context);
    });

    // ✅ PERMITIR REMOÇÃO de elementos ER
    this._eventBus.on('commandStack.shape.delete.canExecute', HIGHEST_PRIORITY, (context: any) => {
      return this.canDeleteShape(context);
    });

    // ✅ PERMITIR REDIMENSIONAMENTO
    this._eventBus.on('commandStack.shape.resize.canExecute', HIGHEST_PRIORITY, (context: any) => {
      return this.canResizeShape(context);
    });

    console.log('✅ ERRules: Todas as regras ER configuradas com prioridade máxima');
  }

  private canCreateShape(context: any): boolean | undefined {
    const shape = context.shape;
    
    if (!shape || !shape.type) {
      return undefined;
    }

    // Se for elemento ER, SEMPRE permitir
    if (shape.type.startsWith('er:')) {
      console.log('✅ ERRules: PERMITINDO criação de', shape.type);
      return true;
    }

    // Para elementos BPMN, deixar as regras padrão decidirem
    return undefined;
  }

  private canMoveShape(context: any): boolean | undefined {
    const shape = context.shape;
    
    if (shape && shape.type && shape.type.startsWith('er:')) {
      console.log('✅ ERRules: PERMITINDO movimento de', shape.type);
      return true;
    }

    return undefined;
  }

  private canCreateConnection(context: any): boolean | undefined {
    const connection = context.connection;
    const source = connection?.source;
    const target = connection?.target;

    // Se envolve elementos ER, aplicar regras ER
    if ((source?.type && source.type.startsWith('er:')) || 
        (target?.type && target.type.startsWith('er:'))) {
      
      const isValid = this.isValidERConnection(source, target);
      console.log(`${isValid ? '✅' : '❌'} ERRules: Conexão ER ${source?.type} -> ${target?.type}`);
      return isValid;
    }

    return undefined;
  }

  private canDeleteShape(context: any): boolean | undefined {
    const shape = context.shape;
    
    if (shape && shape.type && shape.type.startsWith('er:')) {
      console.log('✅ ERRules: PERMITINDO remoção de', shape.type);
      return true;
    }

    return undefined;
  }

  private canResizeShape(context: any): boolean | undefined {
    const shape = context.shape;
    
    if (shape && shape.type && shape.type.startsWith('er:')) {
      console.log('✅ ERRules: PERMITINDO redimensionamento de', shape.type);
      return true;
    }

    return undefined;
  }

  private isValidERConnection(source: any, target: any): boolean {
    if (!source || !target) return false;

    const sourceType = source.type;
    const targetType = target.type;

    // Conexões válidas ER:
    const validConnections = [
      // Entidade <-> Relacionamento
      ['er:Entity', 'er:Relationship'],
      ['er:Relationship', 'er:Entity'],
      ['er:WeakEntity', 'er:Relationship'],
      ['er:Relationship', 'er:WeakEntity'],
      
      // Atributo -> Entidade
      ['er:Attribute', 'er:Entity'],
      ['er:KeyAttribute', 'er:Entity'],
      ['er:Attribute', 'er:WeakEntity'],
      ['er:KeyAttribute', 'er:WeakEntity'],
      
      // Entidade -> Atributo (ambas direções)
      ['er:Entity', 'er:Attribute'],
      ['er:Entity', 'er:KeyAttribute'],
      ['er:WeakEntity', 'er:Attribute'],
      ['er:WeakEntity', 'er:KeyAttribute']
    ];

    return validConnections.some(([from, to]) => sourceType === from && targetType === to);
  }
}

export {};