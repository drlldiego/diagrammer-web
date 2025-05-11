import { is } from 'bpmn-js/lib/util/ModelUtil';

// Tipagem das dependências
interface ContextPad {
  registerProvider(provider: any): void;
}

interface CommandStack {
  registerHandler(type: string, handler: any): void;
  execute(type: string, context: any): void;
}

interface EventBus {}

// Tipagem da função `ColorPicker`
export default function ColorPicker(this: any, 
  eventBus: EventBus,
  contextPad: ContextPad,
  commandStack: CommandStack
) {
  // Registrando o provider no contextPad
  contextPad.registerProvider(this);

  // Registrando o handler no commandStack
  commandStack.registerHandler('shape.updateColor', UpdateColorHandler);

  // Função para alterar a cor do elemento
  function changeColor(event: Event, element: any) {
    const color = window.prompt('type a color code');
    if (color) {
      commandStack.execute('shape.updateColor', { element, color });
    }
  }

  // Função para obter as entradas do context pad
  this.getContextPadEntries = function (element: any) {
    if (is(element, 'bpmn:Event')) {
      return {
        'changeColor': {
          group: 'edit',
          className: 'icon-red',
          title: 'Change element color',
          action: {
            click: changeColor,
          },
        },
      };
    }
  };
}

// Tipagem do handler `UpdateColorHandler`
function UpdateColorHandler(this: any) {
  this.execute = function (context: {
    oldColor: any; element: any; color: string 
}) {
    context.oldColor = context.element.color;
    context.element.color = context.color;

    return context.element;
  };

  this.revert = function (context: { element: any; oldColor: string }) {
    context.element.color = context.oldColor;

    return context.element;
  };
}
