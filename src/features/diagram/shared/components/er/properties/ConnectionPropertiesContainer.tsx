/**
 * Componente Container para as propriedades de conexões em diagramas ER.
 * Utiliza hooks especializados para extrair dados da conexão e gerenciar o estado.
 * Fornece valores padrão e fallback devido à ausência de contexto em ErModeler.
 */
import React from 'react';
import { ErElement } from '../../../../er/core';
import { useConnectionData } from '../../../hooks/er/useConnectionData';
import { ConnectionPropertiesView } from './ConnectionPropertiesView';

interface ConnectionPropertiesContainerProps {
  element: ErElement;
  modeler: any;
  updateProperty: (property: string, value: any) => void;
}

export const ConnectionPropertiesContainer: React.FC<ConnectionPropertiesContainerProps> = ({
  element,
  modeler,
  updateProperty
}) => {
  // Extrair dados da conexão usando hook especializado
  const connectionData = useConnectionData(element);

  // Usar valores padrão, pois o contexto não está disponível no ErModeler
  const notation: 'crowsfoot' | 'chen' = 'crowsfoot'; // Notação padrão para este componente
  const notationInfo = undefined; // Nenhuma informação de notação disponível
  
  // Opções de cardinalidade com fallback
  const cardinalityOptions = React.useMemo(() => {
    // Sempre usar opções de fallback, pois o serviço de contexto não está disponível
    return ['0..1', '1..1', '0..N', '1..N'];
  }, [notation]);

  // Determinar se os campos devem ser desabilitados (padrão para falso)
  const isDeclarativeMode = false; // Padrão para falso, pois o contexto não está disponível
  const fieldsDisabled = isDeclarativeMode && connectionData.isDeclarative;

  // Props para o componente de visualização
  const viewProps = {
    connectionData,
    notation,
    notationInfo,
    cardinalityOptions,
    fieldsDisabled,
    isDeclarativeMode,
    updateProperty
  };

  return <ConnectionPropertiesView {...viewProps} />;
};