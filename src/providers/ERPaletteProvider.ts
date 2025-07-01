export class ERPaletteProvider {
  private _palette: any;
  private _create: any;
  private _elementFactory: any;

  constructor(palette: any, create: any, elementFactory: any) {
    this._palette = palette;
    this._create = create;
    this._elementFactory = elementFactory;
    
    console.log('🎨 ERPaletteProvider: Registrando provider...');
    palette.registerProvider(this);
    console.log('✅ ERPaletteProvider: Registrado com sucesso!');
  }

  getPaletteEntries() {
    console.log('🎨 ERPaletteProvider: Fornecendo entradas da palette...');
    
    const entries = {
      'er-separator-1': {
        group: 'er-entities',
        separator: true
      },
      'create-er-entity': {
        group: 'er-entities',
        className: 'bpmn-icon-start-event-none',
        title: 'Criar Entidade',
        action: {
          dragstart: (event: any) => {
            console.log('🖱️ DRAG START: Entidade');
            this.createERElement(event, 'er:Entity', 'Nova Entidade', 120, 80);
          },
          click: (event: any) => {
            console.log('🖱️ CLICK: Entidade');
            this.createERElement(event, 'er:Entity', 'Nova Entidade', 120, 80);
          }
        }
      },
      'create-er-weak-entity': {
        group: 'er-entities',
        className: 'bpmn-icon-intermediate-event-none',
        title: 'Criar Entidade Fraca',
        action: {
          dragstart: (event: any) => this.createERElement(event, 'er:WeakEntity', 'Entidade Fraca', 120, 80),
          click: (event: any) => this.createERElement(event, 'er:WeakEntity', 'Entidade Fraca', 120, 80)
        }
      },
      'er-separator-2': {
        group: 'er-relationships',
        separator: true
      },
      'create-er-relationship': {
        group: 'er-relationships',
        className: 'bpmn-icon-gateway-none',
        title: 'Criar Relacionamento',
        action: {
          dragstart: (event: any) => {
            console.log('🖱️ DRAG START: Relacionamento');
            this.createERElement(event, 'er:Relationship', 'Relacionamento', 100, 80);
          },
          click: (event: any) => {
            console.log('🖱️ CLICK: Relacionamento');
            this.createERElement(event, 'er:Relationship', 'Relacionamento', 100, 80);
          }
        }
      },
      'er-separator-3': {
        group: 'er-attributes',
        separator: true
      },
      'create-er-attribute': {
        group: 'er-attributes',
        className: 'bpmn-icon-end-event-none',
        title: 'Criar Atributo',
        action: {
          dragstart: (event: any) => {
            console.log('🖱️ DRAG START: Atributo');
            this.createERElement(event, 'er:Attribute', 'Atributo', 100, 60);
          },
          click: (event: any) => {
            console.log('🖱️ CLICK: Atributo');
            this.createERElement(event, 'er:Attribute', 'Atributo', 100, 60);
          }
        }
      },
      'create-er-key-attribute': {
        group: 'er-attributes',
        className: 'bpmn-icon-end-event-terminate',
        title: 'Criar Atributo Chave',
        action: {
          dragstart: (event: any) => this.createERElement(event, 'er:KeyAttribute', 'Chave', 100, 60),
          click: (event: any) => this.createERElement(event, 'er:KeyAttribute', 'Chave', 100, 60)
        }
      }
    };

    console.log('✅ ERPaletteProvider: Retornando', Object.keys(entries).length, 'entradas');
    return entries;
  }

  private createERElement(event: any, type: string, defaultName: string, width: number, height: number) {
    console.log(`🚀 ERPaletteProvider: Criando elemento ${type}`);
    
    try {
      // Criar shape com configuração mais completa
      const shape = this._elementFactory.createShape({
        type: type,
        width: width,
        height: height,
        businessObject: { 
          $type: type,
          name: defaultName,
          id: `${type.replace('er:', '')}_${Date.now()}`
        }
      });

      console.log('✅ Elemento criado com sucesso:', shape);
      console.log('📋 Propriedades do shape:', {
        type: shape.type,
        width: shape.width,
        height: shape.height,
        businessObject: shape.businessObject
      });
      
      console.log('🎯 Iniciando processo de criação via _create.start...');
      this._create.start(event, shape);
      
    } catch (error) {
      console.error('❌ ERRO ao criar elemento:', error);
      console.error('📊 Detalhes do erro:', {
        type,
        defaultName,
        width,
        height,
        event: event?.type || 'unknown'
      });
    }
  }
}

export {};