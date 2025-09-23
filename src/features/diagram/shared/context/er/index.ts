/**
 * Central export for ER contexts
 */

export {
  ErDiagramProvider,
  useErDiagramContext,
  useErSelection,
  useErMode,
  useErNotation,
  useErServices
} from './ErDiagramContext';

export {
  ErStatisticsProvider,
  useErStatistics
} from './ErStatisticsContext';

// Combined provider for convenience
import React from 'react';
import { ErDiagramProvider } from './ErDiagramContext';
import { ErStatisticsProvider } from './ErStatisticsContext';
import { DiagramMode, DiagramNotation } from '../../../er/core';

interface ErContextProviderProps {
  children: React.ReactNode;
  initialMode?: DiagramMode;
  initialNotation?: DiagramNotation;
  modeler?: any;
}

export const ErContextProvider: React.FC<ErContextProviderProps> = (props) => {
  const { children, ...erDiagramProps } = props;
  
  return React.createElement(
    ErDiagramProvider,
    { ...erDiagramProps, children: React.createElement(
      ErStatisticsProvider,
      null,
      children
    )}
  );
};