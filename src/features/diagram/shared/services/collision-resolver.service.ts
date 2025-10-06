/**
 * CollisionResolverService
 * 
 * Serviço para resolver colisões entre elementos após layout ELK
 * Usa algoritmo push-apart ponderado por peso para separação determinística
 */

export interface Node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  weight?: number;
  fixed?: boolean;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionMetrics {
  totalCollisions: number;
  resolvedCollisions: number;
  iterations: number;
  maxDisplacement: number;
}

export class CollisionResolverService {
  private readonly DEFAULT_WEIGHT = 1;
  private readonly DEFAULT_PADDING = 16;
  private readonly MAX_MOVE_PER_ITER = 20;

  /**
   * Resolve colisões entre nodes usando algoritmo push-apart
   */
  public resolveCollisions(
    nodes: Node[], 
    maxIter: number = 50,
    padding: number = this.DEFAULT_PADDING
  ): CollisionMetrics {
    console.log(`🚧 [Collision Resolver] Starting collision resolution for ${nodes.length} nodes`);
    
    let totalCollisions = 0;
    let resolvedCollisions = 0;
    let maxDisplacement = 0;
    let iteration = 0;

    for (iteration = 0; iteration < maxIter; iteration++) {
      let moved = 0;
      let iterationCollisions = 0;
      let iterationMaxMove = 0;

      // Detectar e resolver colisões
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        if (nodeA.fixed) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          
          const overlapVector = this.getMinimalSeparationVector(nodeA, nodeB, padding);
          if (!overlapVector) continue;

          iterationCollisions++;
          if (iteration === 0) totalCollisions++;

          // Aplicar separação ponderada por peso
          const displacement = this.calculateWeightedDisplacement(nodeA, nodeB, overlapVector);
          
          // Limitar movimento por iteração
          const cappedDisplacement = this.capDisplacement(displacement, this.MAX_MOVE_PER_ITER);
          
          // Aplicar movimento
          if (!nodeA.fixed) {
            nodeA.x += cappedDisplacement.a.x;
            nodeA.y += cappedDisplacement.a.y;
            iterationMaxMove = Math.max(iterationMaxMove, 
              Math.sqrt(cappedDisplacement.a.x ** 2 + cappedDisplacement.a.y ** 2));
          }
          
          if (!nodeB.fixed) {
            nodeB.x += cappedDisplacement.b.x;
            nodeB.y += cappedDisplacement.b.y;
            iterationMaxMove = Math.max(iterationMaxMove,
              Math.sqrt(cappedDisplacement.b.x ** 2 + cappedDisplacement.b.y ** 2));
          }

          moved++;
        }
      }

      maxDisplacement = Math.max(maxDisplacement, iterationMaxMove);
      
      console.log(`🔄 [Collision Resolver] Iteration ${iteration + 1}: ${iterationCollisions} collisions, ${moved} moves, max displacement: ${iterationMaxMove.toFixed(2)}px`);

      // Convergência: se não há mais movimentos significativos
      if (moved === 0 || iterationMaxMove < 1) {
        resolvedCollisions = totalCollisions - iterationCollisions;
        console.log(`✅ [Collision Resolver] Converged after ${iteration + 1} iterations`);
        break;
      }
    }

    const metrics: CollisionMetrics = {
      totalCollisions,
      resolvedCollisions,
      iterations: iteration + 1,
      maxDisplacement
    };

    console.log(`📊 [Collision Resolver] Final metrics:`, metrics);
    return metrics;
  }

  /**
   * Calcula o vetor mínimo de separação entre dois nodes
   */
  private getMinimalSeparationVector(
    nodeA: Node, 
    nodeB: Node, 
    padding: number
  ): Vector | null {
    const boundsA = this.getInflatedBounds(nodeA, padding);
    const boundsB = this.getInflatedBounds(nodeB, padding);

    // Verificar se há sobreposição
    if (!this.boundsOverlap(boundsA, boundsB)) {
      return null;
    }

    // Calcular sobreposição em cada eixo
    const overlapX = Math.min(
      boundsA.x + boundsA.width - boundsB.x,
      boundsB.x + boundsB.width - boundsA.x
    );
    
    const overlapY = Math.min(
      boundsA.y + boundsA.height - boundsB.y,
      boundsB.y + boundsB.height - boundsA.y
    );

    // Escolher o eixo com menor sobreposição para separação mínima
    if (overlapX < overlapY) {
      // Separar horizontalmente
      const direction = boundsA.x < boundsB.x ? -1 : 1;
      return { x: direction * overlapX, y: 0 };
    } else {
      // Separar verticalmente
      const direction = boundsA.y < boundsB.y ? -1 : 1;
      return { x: 0, y: direction * overlapY };
    }
  }

  /**
   * Calcula deslocamento ponderado por peso
   */
  private calculateWeightedDisplacement(
    nodeA: Node, 
    nodeB: Node, 
    separationVector: Vector
  ): { a: Vector; b: Vector } {
    const weightA = nodeA.weight || this.DEFAULT_WEIGHT;
    const weightB = nodeB.weight || this.DEFAULT_WEIGHT;
    const totalWeight = weightA + weightB;

    // Distribuir movimento inversamente proporcional ao peso
    // Node mais leve move mais
    const factorA = nodeB.fixed ? 1 : (weightB / totalWeight);
    const factorB = nodeA.fixed ? 1 : (weightA / totalWeight);

    // Adicionar fator de segurança para garantir separação
    const safetyFactor = 1.05;

    return {
      a: {
        x: separationVector.x * factorA * safetyFactor,
        y: separationVector.y * factorA * safetyFactor
      },
      b: {
        x: -separationVector.x * factorB * safetyFactor,
        y: -separationVector.y * factorB * safetyFactor
      }
    };
  }

  /**
   * Limita o deslocamento máximo por iteração
   */
  private capDisplacement(
    displacement: { a: Vector; b: Vector }, 
    maxMove: number
  ): { a: Vector; b: Vector } {
    const capVector = (vector: Vector): Vector => {
      const magnitude = Math.sqrt(vector.x ** 2 + vector.y ** 2);
      if (magnitude <= maxMove) return vector;
      
      const scale = maxMove / magnitude;
      return {
        x: vector.x * scale,
        y: vector.y * scale
      };
    };

    return {
      a: capVector(displacement.a),
      b: capVector(displacement.b)
    };
  }

  /**
   * Obtém bounds inflados com padding
   */
  private getInflatedBounds(node: Node, padding: number): Bounds {
    return {
      x: node.x - node.width / 2 - padding,
      y: node.y - node.height / 2 - padding,
      width: node.width + 2 * padding,
      height: node.height + 2 * padding
    };
  }

  /**
   * Verifica se dois bounds se sobrepõem
   */
  private boundsOverlap(boundsA: Bounds, boundsB: Bounds): boolean {
    return !(
      boundsA.x + boundsA.width <= boundsB.x ||
      boundsB.x + boundsB.width <= boundsA.x ||
      boundsA.y + boundsA.height <= boundsB.y ||
      boundsB.y + boundsB.height <= boundsA.y
    );
  }

  /**
   * Detecta todas as colisões atuais
   */
  public detectCollisions(nodes: Node[], padding: number = this.DEFAULT_PADDING): Array<{nodeA: Node, nodeB: Node, overlap: Vector}> {
    const collisions: Array<{nodeA: Node, nodeB: Node, overlap: Vector}> = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const overlap = this.getMinimalSeparationVector(nodes[i], nodes[j], padding);
        if (overlap) {
          collisions.push({
            nodeA: nodes[i],
            nodeB: nodes[j],
            overlap
          });
        }
      }
    }

    return collisions;
  }

  /**
   * Calcula área total de sobreposição
   */
  public calculateOverlapArea(nodes: Node[], padding: number = this.DEFAULT_PADDING): number {
    let totalOverlapArea = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const boundsA = this.getInflatedBounds(nodes[i], padding);
        const boundsB = this.getInflatedBounds(nodes[j], padding);

        if (this.boundsOverlap(boundsA, boundsB)) {
          const overlapWidth = Math.min(
            boundsA.x + boundsA.width,
            boundsB.x + boundsB.width
          ) - Math.max(boundsA.x, boundsB.x);

          const overlapHeight = Math.min(
            boundsA.y + boundsA.height,
            boundsB.y + boundsB.height
          ) - Math.max(boundsA.y, boundsB.y);

          totalOverlapArea += overlapWidth * overlapHeight;
        }
      }
    }

    return totalOverlapArea;
  }
}

// Factory para criação do serviço
export function createCollisionResolverService(): CollisionResolverService {
  return new CollisionResolverService();
}