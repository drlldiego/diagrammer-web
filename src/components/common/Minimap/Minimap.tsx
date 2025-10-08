import React, { useEffect, useRef, useState } from 'react';
import './Minimap.scss';

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
    if (setupRef.current) return; // Prevent multiple setups
    
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
        
        // Force minimap to be open by adding the 'open' class that the module expects
        minimap.classList.add('open');

        // Remove the default toggle element completely
        const defaultToggle = minimap.querySelector('.toggle');
        if (defaultToggle) {
          defaultToggle.remove();
        }

        // Remove existing custom toggle button if any
        const existingToggle = minimap.querySelector('.minimap-toggle');
        if (existingToggle) {
          existingToggle.remove();
        }

        // Create our custom toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'minimap-toggle';
        toggleButton.innerHTML = minimapMinimized ? '+' : '−';
        toggleButton.setAttribute(
          'title', 
          minimapMinimized ? 'Expandir minimap' : 'Minimizar minimap'
        );

        // Add click event for our toggle
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
            // Keep the 'open' class to ensure functionality
            minimap.classList.add('open');
            toggleButton.innerHTML = '−';
            toggleButton.setAttribute('title', 'Minimizar minimap');
          }
        };

        toggleButton.addEventListener('click', handleToggle);

        // Add click event to minimap itself to expand when minimized
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

        // Append our toggle button to minimap
        minimap.appendChild(toggleButton);

        // Apply initial state - default is maximized and functional
        if (minimapMinimized) {
          minimap.classList.add('minimized');
        } else {
          // Ensure it's functional by default with 'open' class
          minimap.classList.add('open');
        }
      }
    }, setupDelay);
  };

  useEffect(() => {
    setupMinimapToggle();
    
    // Cleanup function
    return () => {
      setupRef.current = false;
      // Clean up event listeners when component unmounts
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
        console.log('🚫 Minimap desabilitado - Modo Declarativo ativo');
        (minimap as HTMLElement).style.display = 'none';
      } else {
        console.log('✅ Minimap habilitado - Modo Interface ativo');
        (minimap as HTMLElement).style.display = 'block';
        // Re-setup minimap if needed
        if (!setupRef.current) {
          setupMinimapToggle();
        }
      }
    }
  }, [isDeclarativeMode]); 

  return null;
};

export default Minimap;