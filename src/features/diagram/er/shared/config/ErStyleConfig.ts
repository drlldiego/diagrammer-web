/**
 * Configuração centralizada de estilos para elementos ER
 * Este arquivo centraliza todas as cores, fontes e dimensões para elementos ER
 */

/**
 * Cores padrão para elementos ER
 */
export interface ErColors {  
  relationship: {
    default: { fill: string; stroke: string };
    identifying: { fill: string; stroke: string };
    nonIdentifying: { fill: string; stroke: string };    
  };
  entity: {
    default: { fill: string; stroke: string };
    weak: { fill: string; stroke: string };    
  };
  attribute: {
    default: { fill: string; stroke: string };
    primaryKey: { fill: string; stroke: string };
    multivalued: { fill: string; stroke: string };
    derived: { fill: string; stroke: string };
    composite: { fill: string; stroke: string };
  };
  // Cores para elementos internos (contrastes)
  inner: {
    lightBackground: string; // Para fundos escuros
    darkBackground: string;  // Para fundos claros
  };
  // Cores do sistema (grid, seleção, etc.)
  system: {
    gridPrimary: string;
    gridSecondary: string;
    selection: string;
    outline: string;
  };
}

/**
 * Configuração de fontes para elementos ER
 */
export interface ErFonts {
  family: string;
  sizes: {
    label: number;
    property: number;
    cardinality: number;
    description: number;
  };
  weights: {
    normal: number;
    bold: number;
  };
}

/**
 * Dimensões padrão para elementos ER
 */
export interface ErDimensions {
  entity: { width: number; height: number };
  relationship: { width: number; height: number };
  attribute: { width: number; height: number; radius: number };
  strokeWidths: {
    default: number;
    selected: number;
    weak: number;
  };
  margins: {
    label: number;
    inner: number;
  };
}

/**
 * Configuração completa de estilos para elementos ER
 */
export const ER_STYLE_CONFIG = {
  colors: {
    relationship: {
      default: { fill: '#e0c4ffff', stroke: '#000000' },
      identifying: { fill: '#f7e5fdff', stroke: '#000000' },
      nonIdentifying: { fill: '#e0c4ffff', stroke: '#000000' }      
    },
    entity: {
      default: { fill: '#b1c6ffff', stroke: '#000000' },
      weak: { fill: '#ebf0ffff', stroke: '#000000' }      
    },
    attribute: {
      default: { fill: '#f2f2f2ff', stroke: '#000000' },
      primaryKey: { fill: '#FEF08A', stroke: '#000000' },
      multivalued: { fill: '#FED7D7', stroke: '#000000' },
      derived: { fill: '#D1FAE5', stroke: '#000000' },
      composite: { fill: '#E0E7FF', stroke: '#000000' }
    },
    inner: {
      lightBackground: '#FFFFFF', // Para fundos escuros
      darkBackground: '#000000'   // Para fundos claros
    },
    system: {
      gridPrimary: 'rgba(59, 130, 246, 0.08)',
      gridSecondary: 'rgba(59, 130, 246, 0.15)',
      selection: '#ffee30ff',
      outline: '#52570dff'
    }
  } as ErColors,

  fonts: {
    family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    sizes: {
      label: 11,
      property: 11,
      cardinality: 11,
      description: 11
    },
    weights: {
      normal: 400,
      bold: 600
    }
  } as ErFonts,

  dimensions: {
    entity: { width: 120, height: 80 },
    relationship: { width: 120, height: 80 },
    attribute: { width: 110, height: 40, radius: 20 },
    strokeWidths: {
      default: 2,
      selected: 3,
      weak: 1
    },
    margins: {
      label: 4,
      inner: 6
    }
  } as ErDimensions
};

/**
 * Utilitários para trabalhar com cores
 */
export const ErColorUtils = {
  /**
   * Determina se uma cor é escura (para calcular contraste)
   */
  isColorDark(color: string): boolean {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  },

  /**
   * Formata cor garantindo o prefixo #
   */
  formatColor(color: string): string {
    return color.startsWith('#') ? color : `#${color}`;
  },

  /**
   * Obtém cor de contraste para elementos internos
   */
  getContrastColor(backgroundColor: string): string {
    return this.isColorDark(backgroundColor) 
      ? ER_STYLE_CONFIG.colors.inner.lightBackground
      : ER_STYLE_CONFIG.colors.inner.darkBackground;
  },

  /**
   * Validar se uma cor é válida (formato hex)
   */
  isValidColor(color: string): boolean {
    if (!color) return false;
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexPattern.test(color);
  },

  /**
   * Extrair cores customizadas completas de um elemento (substitui função de 82 linhas)
   */
  getCustomColors(element: any): { fill?: string; stroke?: string } {
    const colors: { fill?: string; stroke?: string } = {};
    
    if (!element?.businessObject) return colors;
    
    // 1. Verificar nos atributos do businessObject (BPMN Color Specification)
    if (element.businessObject.$attrs) {
      const attrs = element.businessObject.$attrs;
      
      // Verificar fill
      if (attrs['bioc:fill']) {
        const fillColor = this.formatColor(attrs['bioc:fill']);
        if (this.isValidColor(fillColor)) {
          colors.fill = fillColor;
        }
      }
      
      // Verificar stroke
      if (attrs['bioc:stroke']) {
        const strokeColor = this.formatColor(attrs['bioc:stroke']);
        if (this.isValidColor(strokeColor)) {
          colors.stroke = strokeColor;
        }
      }
    }
    
    // 2. Verificar na DI (Diagram Interchange)
    const di = element.di || element.businessObject?.di;
    if (di && !colors.fill && !colors.stroke) {
      
      // Verificar via método get()
      if (di.get && typeof di.get === 'function') {
        const diocFill = di.get('bioc:fill');
        const diocStroke = di.get('bioc:stroke');
        
        if (diocFill && !colors.fill) {
          const formattedFill = this.formatColor(diocFill);
          if (this.isValidColor(formattedFill)) {
            colors.fill = formattedFill;
          }
        }
        
        if (diocStroke && !colors.stroke) {
          const formattedStroke = this.formatColor(diocStroke);
          if (this.isValidColor(formattedStroke)) {
            colors.stroke = formattedStroke;
          }
        }
      }
      
      // Verificar propriedades diretas
      if (di.fill && !colors.fill && this.isValidColor(di.fill)) {
        colors.fill = di.fill;
      }
      if (di.stroke && !colors.stroke && this.isValidColor(di.stroke)) {
        colors.stroke = di.stroke;
      }
      
      // Verificar $attrs do DI
      if (di.$attrs && (!colors.fill || !colors.stroke)) {
        const fillAttrs = ['bioc:fill', 'bpmn:fill', 'color:fill', 'fill'];
        const strokeAttrs = ['bioc:stroke', 'bpmn:stroke', 'color:stroke', 'stroke'];
        
        if (!colors.fill) {
          for (const fillAttr of fillAttrs) {
            if (di.$attrs[fillAttr] && this.isValidColor(di.$attrs[fillAttr])) {
              colors.fill = di.$attrs[fillAttr];
              break;
            }
          }
        }
        
        if (!colors.stroke) {
          for (const strokeAttr of strokeAttrs) {
            if (di.$attrs[strokeAttr] && this.isValidColor(di.$attrs[strokeAttr])) {
              colors.stroke = di.$attrs[strokeAttr];
              break;
            }
          }
        }
      }
    }
    
    // 3. Verificar diretamente no element (algumas implementações)
    if (element.color && (!colors.fill || !colors.stroke)) {
      if (element.color.fill && !colors.fill && this.isValidColor(element.color.fill)) {
        colors.fill = element.color.fill;
      }
      if (element.color.stroke && !colors.stroke && this.isValidColor(element.color.stroke)) {
        colors.stroke = element.color.stroke;
      }
    }
    
    return colors;
  },

  /**
   * Extrai cores customizadas de um elemento, com fallback para padrões
   */
  getElementColors(element: any, elementType: 'relationship' | 'entity' | 'attribute'): { fill: string; stroke: string } {
    const customFill = element.businessObject?.$attrs?.['bioc:fill'];
    const customStroke = element.businessObject?.$attrs?.['bioc:stroke'];
    
    // Se tem cores customizadas do ColorPick, SEMPRE usar elas
    // NUNCA sobrescrever cores customizadas baseado em propriedades como isIdentifying
    if (customFill || customStroke) {
      // Para bordas, sempre usar preto se não especificado (mas preservar customização)
      return {
        fill: customFill || this.getDefaultFillForType(elementType, element),
        stroke: customStroke || '#000000' // Bordas sempre pretas por padrão
      };
    }

    // Se NÃO tem cores customizadas, usar cores baseadas no tipo/propriedades
    return this.getDefaultColorsForElement(elementType, element);
  },

  /**
   * Obtém cor de preenchimento padrão baseada no tipo e propriedades
   */
  getDefaultFillForType(elementType: 'relationship' | 'entity' | 'attribute', element: any): string {
    if (elementType === 'relationship') {
      if (element.businessObject?.type === 'isIdentifying') {
        return ER_STYLE_CONFIG.colors.relationship.identifying.fill;
      }
      if (element.businessObject?.type === 'nonIdentifying') {
        return ER_STYLE_CONFIG.colors.relationship.nonIdentifying.fill;
      }
      // IMPORTANTE: isIdentifying NÃO afeta cores, apenas visual do duplo contorno
      return ER_STYLE_CONFIG.colors.relationship.default.fill;
    }

    if (elementType === 'entity') {
      if (element.businessObject?.isWeak) {
        return ER_STYLE_CONFIG.colors.entity.weak.fill;
      }
      return ER_STYLE_CONFIG.colors.entity.default.fill;
    }

    if (elementType === 'attribute') {
      if (element.businessObject?.isPrimaryKey) {
        return ER_STYLE_CONFIG.colors.attribute.primaryKey.fill;
      }
      if (element.businessObject?.isMultivalued) {
        return ER_STYLE_CONFIG.colors.attribute.multivalued.fill;
      }
      if (element.businessObject?.isDerived) {
        return ER_STYLE_CONFIG.colors.attribute.derived.fill;
      }
      if (element.businessObject?.isComposite) {
        return ER_STYLE_CONFIG.colors.attribute.composite.fill;
      }
      return ER_STYLE_CONFIG.colors.attribute.default.fill;
    }

    return '#FFFFFF';
  },

  /**
   * Obtém cores padrão para elementos sem customização
   */
  getDefaultColorsForElement(elementType: 'relationship' | 'entity' | 'attribute', element: any): { fill: string; stroke: string } {
    if (elementType === 'relationship') {
      if (element.businessObject?.type === 'isIdentifying') {
        return ER_STYLE_CONFIG.colors.relationship.identifying;
      }
      // IMPORTANTE: isIdentifying NÃO afeta cores, apenas visual do duplo contorno
      return ER_STYLE_CONFIG.colors.relationship.default;
    }

    if (elementType === 'entity') {
      if (element.businessObject?.isWeak) {
        return ER_STYLE_CONFIG.colors.entity.weak;
      }
      return ER_STYLE_CONFIG.colors.entity.default;
    }

    if (elementType === 'attribute') {
      if (element.businessObject?.isPrimaryKey) {
        return ER_STYLE_CONFIG.colors.attribute.primaryKey;
      }
      if (element.businessObject?.isMultivalued) {
        return ER_STYLE_CONFIG.colors.attribute.multivalued;
      }
      if (element.businessObject?.isDerived) {
        return ER_STYLE_CONFIG.colors.attribute.derived;
      }
      if (element.businessObject?.isComposite) {
        return ER_STYLE_CONFIG.colors.attribute.composite;
      }
      return ER_STYLE_CONFIG.colors.attribute.default;
    }

    return { fill: '#FFFFFF', stroke: '#000000' };
  },

  /**
   * Converte hex para rgba
   */
  hexToRgba(hex: string, alpha: number = 1): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  /**
   * Escurece uma cor hex
   */
  darken(hex: string, amount: number = 0.1): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * (1 - amount));
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  },

  /**
   * Clareia uma cor hex
   */
  lighten(hex: string, amount: number = 0.1): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * amount);
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  },

  /**
   * Obtém estilos completos para um elemento
   */
  getElementStyle(elementType: 'relationship' | 'entity' | 'attribute', element?: any, customStyle?: Partial<{ fill: string; stroke: string }>) {
    const colors = this.getElementColors(element || {}, elementType);
    const dimensions = ER_STYLE_CONFIG.dimensions[elementType] || ER_STYLE_CONFIG.dimensions.entity;
    const fonts = ER_STYLE_CONFIG.fonts;

    return {
      fill: customStyle?.fill || colors.fill,
      stroke: customStyle?.stroke || colors.stroke,
      strokeWidth: ER_STYLE_CONFIG.dimensions.strokeWidths.default,
      width: dimensions.width,
      height: dimensions.height,
      fontFamily: fonts.family,
      fontSize: fonts.sizes.label,
      fontWeight: fonts.weights.normal,
      textFill: this.getContrastColor(customStyle?.fill || colors.fill)
    };
  }
};