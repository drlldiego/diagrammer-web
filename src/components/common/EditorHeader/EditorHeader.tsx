import React, { ReactNode } from 'react';
import logoIsec from '../../../assets/logo-isec-cor.png';
import './EditorHeader.css';

interface EditorHeaderProps {
  title: string;
  actions?: ReactNode;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({ title, actions }) => {
  return (
    <div className="editor-header">
      <div className="header-left">
        <img src={logoIsec} alt="ISEC Logo" className="editor-logo" />
      </div>
      <h1 className="editor-title">{title}</h1>
      {actions && (
        <div className="editor-actions">
          {actions}
        </div>
      )}
    </div>
  );
};

export default EditorHeader;