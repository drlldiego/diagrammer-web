# Diagrammer Web - Projeto P029 ISEC - Diego Lima

## Resumo do Projeto

O **Diagrammer** é uma aplicação web desenvolvida em React com TypeScript, especificamente criada para servir como ferramenta educacional gratuita para estudantes do Instituto Superior de Engenharia de Coimbra (ISEC). O projeto surge como resposta à necessidade de uma alternativa às ferramentas de modelação comerciais, que além de serem pagas, frequentemente não oferecem as funcionalidades específicas requeridas no contexto académico.

## Objetivo Principal

Desenvolver uma plataforma unificada e gratuita que permita aos estudantes criar e manipular diferentes tipos de diagramas de forma intuitiva e eficiente, servindo como ferramenta de apoio ao processo de ensino-aprendizagem nas disciplinas que requerem representação gráfica de conceitos.

## Inovação Técnica

A principal inovação do Diagrammer reside na sua capacidade de **reutilizar e expandir os componentes fundamentais da biblioteca bpmn-js** para suportar múltiplos tipos de diagramas, incluindo:

- **Diagramas de Entidade-Relacionamento (ER)**
- **Diagramas UML**
- **Diagramas BPMN (Business Process Model and Notation)**
- **Outros formatos de modelação**

Esta abordagem permite criar uma plataforma unificada onde os utilizadores podem construir diferentes tipos de diagramas utilizando uma **interface declarativa** consistente e intuitiva.

## Características Principais

### Interface Declarativa
- Permite aos utilizadores definir diagramas através de especificações de alto nível
- Abstrai a complexidade técnica subjacente
- Foca na lógica e estrutura dos modelos
- Reduz significativamente o tempo necessário para criação de diagramas complexos

### Arquitetura Tecnológica
- **Frontend**: React com TypeScript para maior segurança de tipos e facilidade de manutenção
- **Biblioteca Base**: bpmn-js como fundação técnica, estendida através de componentes modulares
- **Renderização**: SVG para escalabilidade perfeita e capacidade de estilização
- **Arquitetura**: Baseada em componentes para extensibilidade e personalização

### Funcionalidades Educacionais
- Interface otimizada para diferentes níveis de conhecimento dos estudantes
- Eliminação de barreiras económicas através da disponibilização gratuita
- Experiência de utilizador focada no contexto educacional
- Redução da curva de aprendizagem comparativamente a ferramentas comerciais

## Objetivos Específicos do Projeto

1. **Componentes Básicos**: Desenvolvimento de uma arquitetura React/TypeScript que permita reutilização dos componentes fundamentais da bpmn-js

2. **Componentes de Interligação**: Implementação de interfaces que conectem diferentes módulos do sistema

3. **Persistência**: Funcionalidades completas de save/load de diagramas

4. **Interface Declarativa**: Sistema que permita definição de diagramas através de especificações de alto nível

5. **Interpretação Automática**: Motor capaz de interpretar definições declarativas e gerar automaticamente os componentes visuais correspondentes

6. **Colaboração**: Funcionalidades de modelação colaborativa para múltiplos utilizadores

7. **Documentação**: Elaboração completa da documentação do projeto

## Vantagens Competitivas

### Em relação a ferramentas comerciais:
- **Custo zero** para estudantes e instituição
- **Personalização** específica para necessidades educacionais
- **Autonomia tecnológica** da instituição

### Em relação a ferramentas gratuitas existentes:
- **Interface unificada** para múltiplos tipos de diagramas
- **Foco educacional** com interface otimizada para aprendizagem
- **Arquitetura moderna** com tecnologias web atuais
- **Extensibilidade** para futuras necessidades

## Contribuições Esperadas

- **Técnica**: Demonstração de como bibliotecas especializadas podem ser estendidas para criar soluções mais abrangentes
- **Educacional**: Ferramenta gratuita específica para contexto académico
- **Metodológica**: Documentação detalhada do processo de desenvolvimento como referência para projetos similares

## Tecnologias Utilizadas

- **React**: Framework para interface de utilizador
- **TypeScript**: Linguagem com tipagem estática para maior robustez
- **bpmn-js**: Biblioteca base para renderização e edição de diagramas
- **SVG**: Tecnologia de renderização gráfica vetorial
- **Arquitetura modular**: Para facilitar extensão e manutenção

O Diagrammer representa uma solução inovadora que combina tecnologias modernas com foco específico nas necessidades educacionais, oferecendo uma alternativa viável e acessível às ferramentas comerciais de modelação de diagramas.