import React, { useState } from 'react';
import HomeHeader from './HomeHeader/HomeHeader';
import HomeFooter from './HomeFooter/HomeFooter';
import './HomePage.scss';

export const HomePage = () => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);  

  const diagramTypes = [
    {
      id: 'bpmn',
      title: 'BPMN',
      description: 'Business Process Model and Notation',
      icon: (
        <svg viewBox="0 0 24 24" className="diagram-icon bpmn-icon">
          <path fill="currentColor" d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z" />
        </svg>
      )
    },
    {
      id: 'erchen',
      title: 'ER - Chen',
      description: 'Diagrama Entidade Relacionamento - Notação Chen',
      icon: (
        <svg viewBox="0 0 24 24" className="diagram-icon er-chen-icon">
          <path fill="currentColor" d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M8,17A2,2 0 0,1 6,15V13H8V15H16V13H18V15A2,2 0 0,1 16,17H8M18,8H6V5H18V8Z" />
        </svg>  
      )
    },
    {
      id: 'ercrow',
      title: 'ER - Crow\'s Foot',
      description: 'Diagrama Entidade Relacionamento - Notação Crow\'s Foot',
      icon: (
        <svg viewBox="0 0 24 24" className="diagram-icon er-crow-icon">
          <path fill="currentColor" d="M9,7H11V11H13V7H15V17H13V13H11V17H9V7M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3Z" />
        </svg>
      )
    },
    {
      id: 'flowchart',
      title: 'Fluxograma',
      description: 'Diagramas de fluxo de trabalho',
      icon: (
        <svg viewBox="0 0 24 24" className="diagram-icon flowchart-icon">
          <path fill="currentColor" d="M3,3H11V7.34L16.66,1.69L22.31,7.34L16.66,13H21V21H13V13H16.66L11,7.34V11H3V3M3,13H11V21H3V13Z" />
        </svg>
      )
    }
  ];

  const handleCardClick = (diagramId: string) => {
    // Navegar na mesma aba
    window.location.href = `/editor/${diagramId}`;
  };
  
  return (
    <div className="home-container">
      <HomeHeader 
        title={<>Diagrammer <span className="web-text">Web</span></>}
        subtitle="Selecione o tipo de diagrama que deseja criar"
      />
      
      <div className="home-content">

        <div className="diagram-grid">
        {diagramTypes.map((diagram) => (
          <div
            key={diagram.id}
            className={`diagram-card ${hoveredCard === diagram.id ? 'hovered' : ''}`}
            onClick={() => handleCardClick(diagram.id)}
            onMouseEnter={() => setHoveredCard(diagram.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {diagram.icon}
            <h2 className="diagram-title">{diagram.title}</h2>
            <p className="diagram-description">{diagram.description}</p>
          </div>
        ))}
        </div>
      </div>
      
      <HomeFooter />
    </div>
  );
};

export default HomePage;