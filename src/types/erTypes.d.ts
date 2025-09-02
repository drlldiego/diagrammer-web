/**
 * Representa uma Entidade em um diagrama ER, estendendo as propriedades básicas de um elemento de diagrama.
 * @interface ErEntity
 * @property {string} id - Um identificador único para a entidade.
 * @property {string} name - O nome da entidade (por exemplo, "Cliente" ou "Produto").
 * @property {'er:Entity'} type - O tipo de elemento, fixado como 'er:Entity'.
 * @property {boolean} [isWeak] - Opcional. Indica se a entidade é uma entidade fraca.
 * @property {ErAttribute[]} [attributes] - Opcional. Uma lista de atributos associados a esta entidade.
 * @property {string} [description] - Opcional. Uma breve descrição ou notas sobre a entidade.
 * @property {number} [x] - Opcional. Coordenada X na tela do diagrama.
 * @property {number} [y] - Opcional. Coordenada Y na tela do diagrama.
 * @property {number} [width] - Opcional. A largura visual da entidade no diagrama.
 * @property {number} [height] - Opcional. A altura visual da entidade no diagrama.
 */
export interface ErEntity {
  id: string;
  name: string;
  type: 'er:Entity';
  isWeak?: boolean;
  attributes?: ErAttribute[];
  description?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}


/**
 * Representa um Relacionamento em um diagrama ER, estendendo as propriedades básicas de um elemento de diagrama.
 * @interface ErRelationship
 * @property {string} id - Um identificador único para o relacionamento.
 * @property {string} name - O nome do relacionamento (por exemplo, "Compra" ou "Venda").
 * @property {'er:Relationship'} type - O tipo de elemento, fixado como 'er:Relationship'.
 * @property {('1' | 'N' | 'M' | '0..1' | '0..N' | '1..N')} [cardinalitySource] - Opcional. A cardinalidade na origem do relacionamento. 
 * @property {boolean} [isIdentifying] - Opcional. Indica se o relacionamento é identificador.
 * @property {ErAttribute[]} [attributes] - Opcional. Uma lista de atributos associados a este relacionamento.
 * @property {string} [description] - Opcional. Uma breve descrição ou notas sobre o relacionamento.
 * @property {number} [x] - Opcional. Coordenada X na tela do diagrama.
 * @property {number} [y] - Opcional. Coordenada Y na tela do diagrama.
 * @property {number} [width] - Opcional. A largura visual do relacionamento no diagrama.
 * @property {number} [height] - Opcional. A altura visual do relacionamento no diagrama.
 */
export interface ErRelationship {
  id: string;
  name: string;
  type: 'er:Relationship';
  cardinalitySource?: '1' | 'N' | 'M' | '0..1' | '0..N' | '1..N';  
  isIdentifying?: boolean;
  attributes?: ErAttribute[];
  description?: string;
  connectedEntities?: ErEntity[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}


/**
 * Representa um Atributo em um diagrama ER, estendendo as propriedades básicas de um elemento de diagrama.
 * @interface ErAttribute
 * @property {string} id - Um identificador único para o atributo.
 * @property {string} name - O nome do atributo (por exemplo, "Nome" ou "Preço").
 * @property {'er:Attribute'} type - O tipo de elemento, fixado como 'er:Attribute'.
 * @property {string} [dataType] - Opcional. O tipo de dado do atributo (por exemplo, "String", "Integer").
 * @property {boolean} [isPrimaryKey] - Opcional. Indica se o atributo é uma chave primária.
 * @property {boolean} [isRequired] - Opcional. Indica se o atributo é obrigatório.
 * @property {boolean} [isMultivalued] - Opcional. Indica se o atributo é multivalorado.
 * @property {boolean} [isDerived] - Opcional. Indica se o atributo é derivado.
 * @property {boolean} [isComposite] - Opcional. Indica se o atributo é composto.
 * @property {string} [size] - Opcional. O tamanho ou precisão do atributo (por exemplo, "255" para uma string).
 * @property {string} [defaultValue] - Opcional. O valor padrão do atributo.
 * @property {string} [description] - Opcional. Uma breve descrição ou notas sobre o atributo.
 * @property {ErEntity[]} [connectedTo] - Opcional. Uma lista de entidades conectadas a este atributo.
 * @property {number} [x] - Opcional. Coordenada X na tela do diagrama.
 * @property {number} [y] - Opcional. Coordenada Y na tela do diagrama.
 * @property {number} [width] - Opcional. A largura visual do atributo no diagrama.
 * @property {number} [height] - Opcional. A altura visual do atributo no diagrama.
 */
export interface ErAttribute {
  id: string;
  name: string;
  type: 'er:Attribute';
  dataType?: string;
  isPrimaryKey?: boolean;  
  isRequired?: boolean;
  isMultivalued?: boolean;
  isDerived?: boolean;
  isComposite?: boolean;
  size?: string;
  defaultValue?: string;
  description?: string;
  connectedTo?: ErEntity | ErRelationship;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * Representa uma Conexão em um diagrama ER, estendendo as propriedades básicas de um elemento de diagrama.
 * @interface ErConnection
 * @property {string} id - Um identificador único para a conexão.
 * @property {'er:Connection'} type - O tipo de elemento, fixado como 'er:Connection'.
 * @property {ErEntity | ErRelationship | ErAttribute} source - O elemento de origem da conexão.
 * @property {ErEntity | ErRelationship | ErAttribute} target - O elemento de destino da conexão.
 * @property {Array<{ x: number; y: number }>} [waypoints] - Opcional. Uma lista de pontos intermediários para a conexão.
 */
export interface ErConnection {
  id: string;
  type: 'er:Connection';
  source: ErEntity | ErRelationship | ErAttribute;
  target: ErEntity | ErRelationship | ErAttribute;
  waypoints?: Array<{ x: number; y: number }>;
}

/**
 * Representa um elemento em um diagrama ER, que pode ser uma entidade, relacionamento ou atributo.
 */
export type ErElement = ErEntity | ErRelationship | ErAttribute;

/**
 * Representa um Diagrama ER, que contém elementos e conexões.
 */
export interface ErDiagram {
  xml: string;
  customElements: ErElement[];
  connections: ErConnection[];
  metadata: {
    type: 'ER';
    version: string;
    created: string;
    modified?: string;
  };
}

/**
 * Extensões para o modelo BPMN.
 */
declare module 'bpmn-js/lib/Modeler' {
  interface BpmnModeler {
    addCustomElements?: (elements: ErElement[]) => void;
    getCustomElements?: () => ErElement[];
  }
}

export {};