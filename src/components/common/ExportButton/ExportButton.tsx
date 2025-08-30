import React from 'react';
import { Download as PdfIcon, ChevronUp, FileImage, File } from 'lucide-react';
import './ExportButton.css';

export interface ExportOptions {
  pdf: {
    enabled: boolean;
    filename: string;
    label: string;
  };
  png: {
    enabled: boolean;
    filename: string;
    label: string;
  };
  bpmn: {
    enabled: boolean;
    filename: string;
    label: string;
    extension: string; // 'bpmn', 'xml', etc.
  };
}

interface ExportButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  onExport: (type: 'pdf' | 'png' | 'bpmn') => void;
  options: ExportOptions;
  title?: string;
  disabled?: boolean;
  openOnHover?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ 
  isOpen, 
  onToggle, 
  onExport, 
  options,
  title = "Opções de Exportação",
  disabled = false,
  openOnHover = false 
}) => {
  const handleExportClick = (type: 'pdf' | 'png' | 'bpmn') => {
    onExport(type);
  };

  const handleMouseEnter = () => {
    if (openOnHover && !disabled && !isOpen) {
      onToggle();
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (openOnHover && !disabled && isOpen) {
      // Verificar se o mouse saiu completamente do componente
      const currentTarget = e.currentTarget as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // Se o mouse foi para um elemento filho ou permanece dentro do componente, não fechar
      if (relatedTarget && currentTarget.contains(relatedTarget)) {
        return;
      }
      
      onToggle();
    }
  };

  return (
    <div 
      className="export-dropdown-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        className="download-button" 
        onClick={onToggle} 
        title={title}
        disabled={disabled}
      >
        <PdfIcon size={24} />
        <ChevronUp size={24} className="chevron-up" />
      </button>
      {isOpen && (
        <div className="export-dropdown">
          {options.pdf.enabled && (
            <button 
              className="dropdown-option" 
              onClick={() => handleExportClick('pdf')}
            >
              <PdfIcon size={20} className="icon pdf" />
              {options.pdf.label}
            </button>
          )}
          {options.png.enabled && (
            <button 
              className="dropdown-option" 
              onClick={() => handleExportClick('png')}
            >
              <FileImage size={20} className="icon png" />
              {options.png.label}
            </button>
          )}
          {options.bpmn.enabled && (
            <button 
              className="dropdown-option" 
              onClick={() => handleExportClick('bpmn')}
            >
              <File size={20} className="icon bpmn" />
              {options.bpmn.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportButton;