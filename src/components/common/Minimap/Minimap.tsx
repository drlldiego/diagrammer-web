import React, { useEffect, useRef, useState } from 'react';
import './Minimap.scss';
import { logger } from '../../../utils/logger';

interface MinimapProps {
  setupDelay?: number;
  initialMinimized?: boolean;
  isDeclarativeMode?: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({ 
  setupDelay = 100, 
  initialMinimized = true,
  isDeclarativeMode = false
}) => {
  const [minimapMinimized, setMinimapMinimized] = useState<boolean>(initialMinimized);
  const setupRef = useRef<boolean>(false);

  const setupMinimapToggle = () => {
    if (setupRef.current) return; // Previne múltiplas configurações
    
    setTimeout(() => {
      const minimap = document.querySelector('.djs-minimap');
      if (minimap) {
        // Esconder minimap completamente se estiver em modo declarativo
        if (isDeclarativeMode) {
          (minimap as HTMLElement).style.display = 'none';
          return;
        } else {
          (minimap as HTMLElement).style.display = 'block';
        }
        setupRef.current = true;

        // Forçar minimap a estar aberto adicionando a classe 'open' que o módulo espera
        minimap.classList.add('open');

        // Remover o elemento de alternância padrão completamente
        const defaultToggle = minimap.querySelector('.toggle');
        if (defaultToggle) {
          defaultToggle.remove();
        }

        // Remover botão de alternância personalizado existente, se houver
        const existingToggle = minimap.querySelector('.minimap-toggle');
        if (existingToggle) {
          existingToggle.remove();
        }

        // Criar nosso botão de alternância personalizado
        const toggleButton = document.createElement('button');
        toggleButton.className = 'minimap-toggle';
        toggleButton.innerHTML = minimapMinimized ? '+' : '−';
        toggleButton.setAttribute(
          'title', 
          minimapMinimized ? 'Expandir minimap' : 'Minimizar minimap'
        );

        // Adicionar evento de clique para nosso botão de alternância
        const handleToggle = (e: Event) => {
          e.stopPropagation();
          const currentMinimized = minimap.classList.contains('minimized');
          const newMinimized = !currentMinimized;
          setMinimapMinimized(newMinimized);

          if (newMinimized) {
            minimap.classList.add('minimized');
            toggleButton.innerHTML = '+';
            toggleButton.setAttribute('title', 'Expandir minimap');
          } else {
            minimap.classList.remove('minimized');
            // Manter a classe 'open' para garantir funcionalidade
            minimap.classList.add('open');
            toggleButton.innerHTML = '−';
            toggleButton.setAttribute('title', 'Minimizar minimap');
          }
        };

        toggleButton.addEventListener('click', handleToggle);

        // Adicionar evento de clique para o minimap em si para expandir quando minimizado
        const handleMinimapClick = () => {
          if (minimap.classList.contains('minimized')) {
            setMinimapMinimized(false);
            minimap.classList.remove('minimized');
            minimap.classList.add('open');
            toggleButton.innerHTML = '−';
            toggleButton.setAttribute('title', 'Minimizar minimap');
          }
        };

        minimap.addEventListener('click', handleMinimapClick);

        // Adicionar nosso botão de alternância ao minimap
        minimap.appendChild(toggleButton);

        // Aplicar estado inicial - o padrão é maximizado e funcional
        if (minimapMinimized) {
          minimap.classList.add('minimized');
        } else {
          // Garantir que está funcional por padrão com a classe 'open'
          minimap.classList.add('open');
        }
      }
    }, setupDelay);
  };

  useEffect(() => {
    setupMinimapToggle();
    
    // Função de limpeza
    return () => {
      setupRef.current = false;
      // Limpeza de event listeners quando o componente é desmontado
      const minimap = document.querySelector('.djs-minimap');
      if (minimap) {
        const toggleButton = minimap.querySelector('.minimap-toggle');
        if (toggleButton) {
          toggleButton.remove();
        }
      }
    };
  }, []);

  // Efeito para reagir às mudanças do modo declarativo
  useEffect(() => {
    const minimap = document.querySelector('.djs-minimap');
    if (minimap) {
      if (isDeclarativeMode) {
        logger.info('Minimap desabilitado - Modo Declarativo ativo');
        (minimap as HTMLElement).style.display = 'none';
      } else {
        logger.info('Minimap habilitado - Modo Interface ativo');
        (minimap as HTMLElement).style.display = 'block';        
        if (!setupRef.current) {
          setupMinimapToggle();
        }
      }
    }
  }, [isDeclarativeMode]); 

  return null;
};

export default Minimap;