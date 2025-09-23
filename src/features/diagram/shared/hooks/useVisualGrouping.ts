/**
 * Hook React para agrupamento visual simples
 */

import { useCallback, useState, useEffect } from 'react';
import { ErElement } from '../../er/core';
import { VisualGroupingService, VisualGroup } from '../services/visual-grouping.service';
import { logger } from '../../../../utils/logger';

export interface UseVisualGroupingReturn {
  groups: VisualGroup[];
  selectedElements: ErElement[];
  canCreateGroup: boolean;
  createGroup: (name?: string) => void;
  removeGroup: (groupId: string) => void;
  clearAllGroups: () => void;
  refreshGroups: () => void;
  saveGroupsToXML: () => void;
  loadGroupsFromXML: () => void;
  addGroupsToSVG: () => void;
  removeGroupsFromSVG: () => void;
}

/**
 * Hook para agrupamento visual de elementos ER
 */
export const useVisualGrouping = (modeler: any): UseVisualGroupingReturn => {
  const [groups, setGroups] = useState<VisualGroup[]>([]);
  const [selectedElements, setSelectedElements] = useState<ErElement[]>([]);
  const [groupingService, setGroupingService] = useState<VisualGroupingService | null>(null);

  // Inicializar serviço quando modeler estiver disponível
  useEffect(() => {
    if (!modeler) return;

    try {
      const service = modeler.get('visualGroupingService') as VisualGroupingService;
      setGroupingService(service);
      
      logger.info('Serviço de agrupamento visual inicializado', 'useVisualGrouping');
    } catch (error) {
      logger.error('Erro ao inicializar agrupamento visual:', 'useVisualGrouping', error as Error);
    }
  }, [modeler]);

  // Escutar mudanças de seleção
  useEffect(() => {
    if (!modeler) return;

    const selection = modeler.get('selection');
    const eventBus = modeler.get('eventBus');

    const handleSelectionChange = () => {
      const selected = selection.get();
      setSelectedElements(selected);
    };

    eventBus.on('selection.changed', handleSelectionChange);
    
    return () => {
      eventBus.off('selection.changed', handleSelectionChange);
    };
  }, [modeler]);

  // Atualizar lista de grupos periodicamente
  const refreshGroups = useCallback(() => {
    if (!groupingService) return;
    
    const currentGroups = groupingService.getAllGroups();
    setGroups([...currentGroups]);
  }, [groupingService]);

  // Atualizar grupos quando service muda
  useEffect(() => {
    refreshGroups();
  }, [groupingService, refreshGroups]);

  // Verificar se pode criar grupo
  const canCreateGroup = selectedElements.length >= 2;

  // Criar novo grupo
  const createGroup = useCallback((name?: string) => {
    if (!groupingService || !canCreateGroup) {
      logger.warn('Não é possível criar grupo: serviço não disponível ou elementos insuficientes', 'useVisualGrouping');
      return;
    }

    // Filtrar apenas elementos ER válidos
    const validElements = selectedElements.filter(el => 
      el.businessObject?.erType && 
      el.type !== 'bpmn:SequenceFlow' && 
      el.type !== 'label'
    );

    if (validElements.length < 2) {
      logger.warn('Pelo menos 2 elementos ER válidos são necessários para criar um grupo', 'useVisualGrouping');
      return;
    }

    const groupId = groupingService.createGroup(validElements, name);
    
    if (groupId) {
      refreshGroups();
      logger.info(`Grupo visual criado com ${validElements.length} elementos`, 'useVisualGrouping');
    }
  }, [groupingService, canCreateGroup, selectedElements, refreshGroups]);

  // Remover grupo
  const removeGroup = useCallback((groupId: string) => {
    if (!groupingService) return;

    const success = groupingService.removeGroup(groupId);
    if (success) {
      refreshGroups();
      logger.info(`Grupo visual removido: ${groupId}`, 'useVisualGrouping');
    }
  }, [groupingService, refreshGroups]);

  // Limpar todos os grupos
  const clearAllGroups = useCallback(() => {
    if (!groupingService) return;

    groupingService.clearAllGroups();
    refreshGroups();
    logger.info('Todos os grupos visuais removidos', 'useVisualGrouping');
  }, [groupingService, refreshGroups]);

  // Salvar grupos no XML
  const saveGroupsToXML = useCallback(() => {
    if (!groupingService) return;

    groupingService.saveGroupsToXML();
    logger.info('Grupos salvos no XML BPMN', 'useVisualGrouping');
  }, [groupingService]);

  // Carregar grupos do XML
  const loadGroupsFromXML = useCallback(() => {
    if (!groupingService) return;

    groupingService.loadGroupsFromXML();
    refreshGroups();
    logger.info('Grupos carregados do XML BPMN', 'useVisualGrouping');
  }, [groupingService, refreshGroups]);

  // Adicionar grupos ao SVG para exportação
  const addGroupsToSVG = useCallback(() => {
    if (!groupingService) return;

    groupingService.addGroupsToSVG();
    logger.debug('Grupos adicionados ao SVG para exportação', 'useVisualGrouping');
  }, [groupingService]);

  // Remover grupos do SVG após exportação
  const removeGroupsFromSVG = useCallback(() => {
    if (!groupingService) return;

    groupingService.removeGroupsFromSVG();
    logger.debug('Grupos removidos do SVG após exportação', 'useVisualGrouping');
  }, [groupingService]);

  return {
    groups,
    selectedElements,
    canCreateGroup,
    createGroup,
    removeGroup,
    clearAllGroups,
    refreshGroups,
    saveGroupsToXML,
    loadGroupsFromXML,
    addGroupsToSVG,
    removeGroupsFromSVG
  };
};