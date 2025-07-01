import React from 'react';
import { DiagramType } from '../types/DiagramTypes';

interface DiagramTypeSelectorProps {
  currentType: DiagramType;
  onTypeChange: (type: DiagramType) => void;
}

export const DiagramTypeSelector: React.FC<DiagramTypeSelectorProps> = ({
  currentType,
  onTypeChange
}) => {
  return (
    <div className="diagram-type-selector">
      <label htmlFor="diagram-type">Tipo de Diagrama:</label>
      <select
        id="diagram-type"
        value={currentType}
        onChange={(e) => onTypeChange(e.target.value as DiagramType)}
        className="diagram-type-select"
      >
        <option value="bpmn">BPMN</option>
        <option value="er">Entidade-Relacionamento (ER)</option>
        <option value="uml">UML (em desenvolvimento)</option>
      </select>
    </div>
  );
};