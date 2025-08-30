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
        <a href="https://isec.pt/PT/Default.aspx" target='_blank'>
          <img src={logoIsec} alt="ISEC Logo" className="editor-logo" />
        </a>  
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