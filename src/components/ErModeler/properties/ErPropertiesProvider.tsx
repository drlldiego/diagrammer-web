import { is } from 'bpmn-js/lib/util/ModelUtil';

// Interfaces para tipagem TypeScript
interface EventBus {
  on: (event: string, callback: Function) => void;
}

interface Translate {
  (text: string): string;
}

interface Element {
  businessObject: {
    id: string;
    name?: string;
    erType?: string;
    cardinality?: string;
    isIdentifying?: boolean;
    type?: string;
    nullable?: boolean;
    documentation?: Array<{ $type: string; text: string }>;
  };
}

interface PropertyEntry {
  id: string;
  label: string;
  modelProperty: string;
  widget?: string;
  selectOptions?: Array<{ name: string; value: string }>;
  get: (element: Element) => any;
  set: (element: Element, values: any) => any;
}

interface PropertyGroup {
  id: string;
  label: string;
  entries: PropertyEntry[];
}

// Simple properties provider for ER elements
export default function ErPropertiesProvider(this: any, eventBus: EventBus, translate: Translate) {
  this._eventBus = eventBus;
  this._translate = translate;

  eventBus.on('propertiesPanel.getProviders', (event: any) => {
    event.providers.push(this);
  });
}

(ErPropertiesProvider as any).prototype.getGroups = function(this: any, element: Element): PropertyGroup[] {
  // Return different property groups based on element type
  if (is(element, 'bpmn:Task')) {
    return [
      {
        id: 'entity',
        label: 'Entity Properties',
        entries: [
          {
            id: 'entity-name',
            label: 'Name',
            modelProperty: 'name',
            get: (element: Element) => {
              return { name: element.businessObject.name || '' };
            },
            set: (element: Element, values: any) => {
              return { 
                cmd: 'element.updateLabel', 
                context: { 
                  element: element, 
                  newLabel: values.name 
                } 
              };
            }
          },
          {
            id: 'entity-description',
            label: 'Description',
            modelProperty: 'documentation',
            widget: 'textArea',
            get: (element: Element) => {
              const documentation = element.businessObject.documentation;
              return { documentation: documentation && documentation[0] ? documentation[0].text : '' };
            },
            set: (element: Element, values: any) => {
              return {
                cmd: 'element.updateModdleProperties',
                context: {
                  element: element,
                  moddleElement: element.businessObject,
                  properties: {
                    documentation: values.documentation ? [{
                      $type: 'bpmn:Documentation',
                      text: values.documentation
                    }] : []
                  }
                }
              };
            }
          }
        ]
      }
    ];
  }

  if (is(element, 'bpmn:IntermediateCatchEvent') && element.businessObject.erType === 'Relationship') {
    return [
      {
        id: 'relationship',
        label: 'Relationship Properties',
        entries: [
          {
            id: 'relationship-name',
            label: 'Name',
            modelProperty: 'name',
            get: (element: Element) => {
              return { name: element.businessObject.name || '' };
            },
            set: (element: Element, values: any) => {
              return { 
                cmd: 'element.updateLabel', 
                context: { 
                  element: element, 
                  newLabel: values.name 
                } 
              };
            }
          },
          {
            id: 'relationship-cardinality',
            label: 'Cardinality',
            modelProperty: 'cardinality',
            widget: 'select',
            selectOptions: [
              { name: '1:1', value: '1:1' },
              { name: '1:N', value: '1:N' },
              { name: 'N:1', value: 'N:1' },
              { name: 'N:N', value: 'N:N' }
            ],
            get: (element: Element) => {
              return { cardinality: element.businessObject.cardinality || '1:N' };
            },
            set: (element: Element, values: any) => {
              return {
                cmd: 'element.updateModdleProperties',
                context: {
                  element: element,
                  moddleElement: element.businessObject,
                  properties: { cardinality: values.cardinality }
                }
              };
            }
          },
          {
            id: 'relationship-identifying',
            label: 'Identifying Relationship',
            modelProperty: 'isIdentifying',
            widget: 'checkbox',
            get: (element: Element) => {
              return { isIdentifying: element.businessObject.isIdentifying || false };
            },
            set: (element: Element, values: any) => {
              return {
                cmd: 'element.updateModdleProperties',
                context: {
                  element: element,
                  moddleElement: element.businessObject,
                  properties: { isIdentifying: values.isIdentifying }
                }
              };
            }
          }
        ]
      }
    ];
  }

  if (is(element, 'bpmn:UserTask') && element.businessObject.erType === 'Attribute') {
    return [
      {
        id: 'attribute',
        label: 'Attribute Properties',
        entries: [
          {
            id: 'attribute-name',
            label: 'Name',
            modelProperty: 'name',
            get: (element: Element) => {
              return { name: element.businessObject.name || '' };
            },
            set: (element: Element, values: any) => {
              return { 
                cmd: 'element.updateLabel', 
                context: { 
                  element: element, 
                  newLabel: values.name 
                } 
              };
            }
          },
          {
            id: 'attribute-type',
            label: 'Data Type',
            modelProperty: 'type',
            widget: 'select',
            selectOptions: [
              { name: 'String', value: 'string' },
              { name: 'Integer', value: 'int' },
              { name: 'Float', value: 'float' },
              { name: 'Boolean', value: 'boolean' },
              { name: 'Date', value: 'date' },
              { name: 'Text', value: 'text' }
            ],
            get: (element: Element) => {
              return { type: element.businessObject.type || 'string' };
            },
            set: (element: Element, values: any) => {
              return {
                cmd: 'element.updateModdleProperties',
                context: {
                  element: element,
                  moddleElement: element.businessObject,
                  properties: { type: values.type }
                }
              };
            }
          },
          {
            id: 'attribute-nullable',
            label: 'Nullable',
            modelProperty: 'nullable',
            widget: 'checkbox',
            get: (element: Element) => {
              return { nullable: element.businessObject.nullable || false };
            },
            set: (element: Element, values: any) => {
              return {
                cmd: 'element.updateModdleProperties',
                context: {
                  element: element,
                  moddleElement: element.businessObject,
                  properties: { nullable: values.nullable }
                }
              };
            }
          }
        ]
      }
    ];
  }

  // Default empty groups for other elements
  return [];
};

ErPropertiesProvider.$inject = ['eventBus', 'translate'];