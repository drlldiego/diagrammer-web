import React, { useState, useEffect } from 'react';
import './DiagramProperties.scss';

interface DiagramPropertiesProps {
  modeler: any;
  onDiagramNameChange?: (name: string) => void;
}

export const DiagramProperties: React.FC<DiagramPropertiesProps> = ({ 
  modeler, 
  onDiagramNameChange 
}) => {
  const [diagramName, setDiagramName] = useState<string>('Diagrama BPMN');

  useEffect(() => {
    if (modeler) {
      // Tentar obter nome do diagrama do XML
      try {
        modeler.saveXML({ format: false }).then(({ xml }: { xml: string }) => {
          // Extrair nome do processo ou usar padrão
          const nameMatch = xml.match(/<bpmn:process[^>]*name="([^"]*)"[^>]*>/);
          if (nameMatch && nameMatch[1]) {
            setDiagramName(nameMatch[1]);
          }
        }).catch(() => {
          // Se não conseguir obter, manter nome padrão
        });
      } catch (error) {
        // Se não conseguir obter, manter nome padrão
      }
    }
  }, [modeler]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setDiagramName(newName);
    
    // Notificar componente pai sobre mudança de nome
    if (onDiagramNameChange) {
      onDiagramNameChange(newName);
    }
    
    // Atualizar o nome no XML do diagrama
    if (modeler) {
      try {        
        const rootElement = modeler.get('canvas').getRootElement();
        const modeling = modeler.get('modeling');
        
        if (rootElement && rootElement.businessObject) {
          modeling.updateProperties(rootElement, { name: newName });
        }
      } catch (error) {
        console.warn('Não foi possível atualizar nome no modelo:', error);
      }
    }
  };

  return (
    <div className="diagram-properties-container">
      <div className="diagram-properties-header">
        <h3 className="diagram-properties-title">
          Propriedades do Diagrama
        </h3>
      </div>

      <div className="diagram-general-info">
        <div>
          <h4 className="diagram-section-title">
            Informações Gerais
          </h4>
          
          <div className="diagram-field">
            <label className="diagram-field-label">
              Nome do Diagrama:
            </label>
            <input 
              type="text" 
              value={diagramName} 
              onChange={handleNameChange}
              placeholder="Digite o nome do diagrama..."
              className="diagram-name-input"
            />
          </div>

          <div className="diagram-field">
            <label className="diagram-field-label">
              Tipo:
            </label>
            <input 
              type="text" 
              value="Business Process Model and Notation (BPMN)" 
              disabled 
              className="diagram-type-input"
            />
          </div>
        </div>

        <div className="diagram-export-section">
          <h4 className="diagram-export-title">
            Exportação
          </h4>
          <p className="diagram-export-info">
            Os arquivos exportados usarão o nome: <br />
            <strong>"{diagramName} - BPMN.pdf"</strong>
          </p>
        </div>
      </div>
    </div>
  );
};