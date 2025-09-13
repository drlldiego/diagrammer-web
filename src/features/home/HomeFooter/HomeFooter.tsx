import React from 'react';
import './HomeFooter.scss';

export const HomeFooter: React.FC = () => {
  return (
    <footer className="home-footer-container">
      <p className="home-footer-text">
        © 2025 Diagrammer - 
        <a 
          href="https://isec.pt/PT/Default.aspx" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="home-footer-link"
        >
          ISEC
        </a>
      </p>
    </footer>
  );
};

export default HomeFooter;