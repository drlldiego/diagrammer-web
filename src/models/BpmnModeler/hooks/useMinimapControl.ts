import { useState, useCallback } from "react";

export const useMinimapControl = () => {
  const [minimapMinimized, setMinimapMinimized] = useState<boolean>(false);

  const setupMinimapToggle = useCallback(() => {
    setTimeout(() => {
      const minimap = document.querySelector('.djs-minimap');
      if (minimap) {
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
        toggleButton.setAttribute('title', minimapMinimized ? 'Expandir minimap' : 'Minimizar minimap');

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
    }, 1000); // Wait for minimap to be rendered
  }, [minimapMinimized]);

  /* 
   * ========================================================================
   * FUNCIONALIDADE DE AUTO-FIT DO MINIMAP - COMENTADA PARA RELATÓRIO
   * ========================================================================
   * 
   * Esta funcionalidade foi implementada com várias abordagens mas não obteve 
   * os resultados esperados. O minimap do diagram-js/bpmn-js possui controlo 
   * interno que resiste às modificações externas.
   * 
   * TENTATIVAS IMPLEMENTADAS:
   * 1. Manipulação direta do viewBox SVG do minimap
   * 2. CSS Transforms (scale + translate) para zoom visual
   * 3. Reset/toggle do minimap (close/open)
   * 4. Forçar updates internos (_update) e resize events
   * 5. Manipulação de elementos DOM internos do minimap
   * 
   * PROBLEMA: O minimap não mostrava todos os elementos do canvas de forma 
   * consistente, mantendo apenas uma visualização parcial.
   * 
   * ALTERNATIVA IMPLEMENTADA: Botão "Fit All" para ajustar o canvas principal.
   * ========================================================================
   */
  const setupMinimapAutoFit = () => {
    // FUNCIONALIDADE DESABILITADA - MANTIDA APENAS PARA DOCUMENTAÇÃO
    /* 
     * Código original da tentativa de auto-fit do minimap foi removido
     * e substituído por funcionalidade de botão "Fit All" para o canvas.
     * O código original incluía várias abordagens que não funcionaram:
     * - Cálculo de bounds de elementos
     * - Manipulação de viewBox SVG  
     * - CSS Transforms
     * - Toggle e reset do minimap
     * - Eventos de resize
     */
  };

  return {
    minimapMinimized,
    setMinimapMinimized,
    setupMinimapToggle,
    setupMinimapAutoFit
  };
};