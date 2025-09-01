import React, { useState, useEffect } from 'react';

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
        const elementRegistry = modeler.get('elementRegistry');
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
    <div style={{
      padding: '16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      margin: '8px'
    }}>
      <div style={{
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '8px',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Propriedades do Diagrama
        </h3>
      </div>

      <div>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '500' }}>
            Informações Gerais
          </h4>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '12px', 
              fontWeight: '500' 
            }}>
              Nome do Diagrama:
            </label>
            <input 
              type="text" 
              value={diagramName} 
              onChange={handleNameChange}
              placeholder="Digite o nome do diagrama..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '12px', 
              fontWeight: '500' 
            }}>
              Tipo:
            </label>
            <input 
              type="text" 
              value="Business Process Model and Notation (BPMN)" 
              disabled 
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f5f5f5',
                color: '#666',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>
            Exportação
          </h4>
          <p style={{ fontSize: '12px', color: '#666', margin: '8px 0' }}>
            Os arquivos exportados usarão o nome: <br />
            <strong>"{diagramName} - BPMN.pdf"</strong>
          </p>
        </div>
      </div>
    </div>
  );
};