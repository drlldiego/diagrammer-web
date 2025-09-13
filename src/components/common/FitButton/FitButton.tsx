import React from 'react';
import { Maximize2 as FitAllIcon } from 'lucide-react';
import './FitButton.scss';

interface FitButtonProps {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}

export const FitButton: React.FC<FitButtonProps> = ({ 
  onClick, 
  title = "Ajustar visualização para mostrar todos os elementos",
  disabled = false 
}) => {
  return (
    <button 
      className="fit-all-button" 
      onClick={onClick} 
      title={title}
      disabled={disabled}
    >
      <FitAllIcon size={24} />
    </button>
  );
};

export default FitButton;