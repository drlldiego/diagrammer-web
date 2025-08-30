import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import './ImportButton.css';

interface ImportButtonProps {
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  title?: string;
  disabled?: boolean;
}

export const ImportButton: React.FC<ImportButtonProps> = ({ 
  onImport, 
  accept = ".bpmn,.xml",
  title = "Importar Diagrama",
  disabled = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <button 
        className="upload-button" 
        onClick={handleButtonClick}
        title={title}
        disabled={disabled}
      >
        <Upload size={24} />            
      </button>
      <input
        type="file"
        accept={accept}
        className="hidden-file-input"
        ref={fileInputRef}
        onChange={onImport}
      />
    </>
  );
};

export default ImportButton;