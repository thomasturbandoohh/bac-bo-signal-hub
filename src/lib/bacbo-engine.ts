import { summarizeRoundFrequencies } from "./round-statistics";

/**
 * Bac Bo pattern engine — Expanded 59-Strategy Analytical Matrix (Modo Deus).
 * Operates purely internally to detect confluences, table rhythms, bead road geometry,
 * run sequence models, and dice parity dynamics with 0 forced entries.
 * Entries are strictly Player or Banker with 1 gale (no G2); ties are covered as protection.
 */

export type Outcome = "P" | "B" | "T";
export type Side = "player" | "banker";
export type SignalResult = "green_g0" | "green_g1" | "red";

export interface Round {
  p: [number, number];
  b: [number, number];
  outcome: Outcome;
}

export interface Run {
  side: "P" | "B";
  len: number;
}

export interface PatternMatch {
  side: Side;
  pattern: string;
  confidence: number;
}

const die = (rng: () => number) => 1 + Math.floor(rng() * 6);

export function rollRound(rng: () => number = Math.random): Round {
  const p: [number, number] = [die(rng), die(rng)];
  const b: [number, number] = [die(rng), die(rng)];
  const ps = p[0] + p[1];
  const bs = b[0] + b[1];
  return { p, b, outcome: ps > bs ? "P" : bs > ps ? "B" : "T" };
}

export function seedHistory(n = 40, rng: () => number = Math.random): Round[] {
  return Array.from({ length: n }, () => rollRound(rng));
}

const toSide = (o: "P" | "B"): Side => (o === "P" ? "player" : "banker");
const opposite = (o: "P" | "B"): "P" | "B" => (o === "P" ? "B" : "P");

export function toRuns(outcomes: Outcome[]): Run[] {
  const runs: Run[] = [];
  for (const o of outcomes) {
    if (o === "T") continue;
    const last = runs[runs.length - 1];
    if (last && last.side === o) last.len += 1;
    else runs.push({ side: o, len: 1 });
  }
  return runs;
}

/**
 * Evaluates the full suite of 59 Bac Bo analytical strategies across:
 * - Run sequences (Big Road / sequence dynamics)
 * - Bead Road matrix (6-row grid geometry, diagonals, horizontals, triangles, rectangles)
 * - Frequency divergence, rhythm breaks, and multi-factor confluences.
 */
export function matchPatterns(outcomes: Outcome[], rounds?: Round[]): PatternMatch[] {
  const runs = toRuns(outcomes);
  const n = runs.length;
  const matches: PatternMatch[] = [];
  if (n === 0) return matches;
  const cur = runs[n - 1]!;
  const at = (i: number) => runs[n - 1 - i]!;

  /* ------------------------------------------------------------------ */
  /* Category 1: Classic Core & Foundational Runs                        */
  /* ------------------------------------------------------------------ */

  // 11. Surf (Surf de tendência) & 55. Sequência de Cor
  if (cur.len >= 3) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Surf de tendência",
      confidence: Math.min(90, 64 + (cur.len - 3) * 5),
    });
    if (cur.len >= 4) {
      matches.push({
        side: toSide(cur.side),
        pattern: "Sequência de Cor",
        confidence: Math.min(88, 65 + (cur.len - 4) * 4),
      });
    }
  }

  // 1. Quinta Casa (Run approaching or entering 5th house)
  if (cur.len === 4) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Quinta Casa",
      confidence: 63,
    });
  }

  // 15. Alternância & Xadrez 1-1-1
  let singles = 0;
  for (let i = 0; i < n && at(i).len === 1; i++) singles++;
  if (singles >= 4) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Xadrez 1-1-1",
      confidence: Math.min(88, 66 + (singles - 4) * 4),
    });
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Alternância",
      confidence: Math.min(86, 65 + (singles - 4) * 4),
    });
  }

  // 7. Parzinho, 21. Dupla ou 2x2, 58. Padrão 2-2
  if (n >= 3 && at(1).len === 2 && at(2).len === 2) {
    if (cur.len === 1) {
      matches.push({ side: toSide(cur.side), pattern: "Parzinho 2-2", confidence: 74 });
      matches.push({ side: toSide(cur.side), pattern: "Padrão 2-2", confidence: 73 });
    } else if (cur.len === 2) {
      matches.push({ side: toSide(opposite(cur.side)), pattern: "Parzinho 2-2", confidence: 72 });
      matches.push({ side: toSide(opposite(cur.side)), pattern: "Dupla ou 2x2", confidence: 72 });
    }
  }

  // 18. Padrão 2-1-2
  if (n >= 4 && at(1).len === 1 && at(2).len === 2 && at(3).len === 2) {
    matches.push({ side: toSide(cur.side), pattern: "Parzinho 2-1-2", confidence: 71 });
  }

  // 10. Padrão V (3-1-3)
  if (
    n >= 3 &&
    at(2).len === 3 &&
    at(1).len === 1 &&
    cur.side === at(2).side &&
    cur.len >= 2 &&
    cur.len < 3
  ) {
    matches.push({
      side: toSide(cur.side),
      pattern: "3-1-3",
      confidence: cur.len === 2 ? 80 : 76,
    });
    matches.push({
      side: toSide(cur.side),
      pattern: "Padrão V",
      confidence: cur.len === 2 ? 78 : 74,
    });
  }

  // 6. Padrão 3x2 & 3-2-3
  if (
    n >= 3 &&
    at(2).len === 3 &&
    at(1).len === 2 &&
    cur.side === at(2).side &&
    cur.len >= 2 &&
    cur.len < 3
  ) {
    matches.push({
      side: toSide(cur.side),
      pattern: "3-2-3",
      confidence: cur.len === 2 ? 78 : 74,
    });
    matches.push({
      side: toSide(cur.side),
      pattern: "Padrão 3x2",
      confidence: cur.len === 2 ? 76 : 72,
    });
  }

  // 2. Rampa & 3. Rampa Alongada & 4. Rampa Invertida
  if (n >= 4) {
    const a = at(3).len;
    if (at(2).len === a + 1 && at(1).len === a + 2 && cur.len < a + 3) {
      matches.push({ side: toSide(cur.side), pattern: "Rampa", confidence: 73 });
      if (a >= 2) {
        matches.push({ side: toSide(cur.side), pattern: "Rampa Alongada", confidence: 72 });
      }
    }
    // 4. Rampa Invertida & 22. Escada Inversa
    if (
      at(3).len >= 4 &&
      at(2).len === at(3).len - 1 &&
      at(1).len === at(2).len - 1 &&
      cur.len === 1
    ) {
      matches.push({
        side: toSide(opposite(cur.side)),
        pattern: "Rampa Invertida",
        confidence: 73,
      });
      matches.push({ side: toSide(opposite(cur.side)), pattern: "Escada Inversa", confidence: 72 });
    }
  }

  // 8. Perninhas
  if (n >= 4 && at(0).len <= 2 && at(1).len <= 2 && at(2).len <= 2 && at(3).len <= 2) {
    const alternating = at(0).side !== at(1).side && at(1).side !== at(2).side;
    if (alternating) {
      matches.push({
        side: toSide(opposite(cur.side)),
        pattern: "Perninhas",
        confidence: 68,
      });
    }
  }

  // Espelho & 24. Quebra de Sequência
  if (n >= 6) {
    const recent = runs.slice(-6);
    const firstHalf = recent
      .slice(0, 3)
      .map((r) => r.side + r.len)
      .join("");
    const secondHalf = recent
      .slice(3)
      .map((r) => r.side + r.len)
      .join("");
    if (firstHalf === secondHalf) {
      matches.push({
        side: toSide(cur.side),
        pattern: "Espelho",
        confidence: 75,
      });
    }
  }

  // 13. Retorno do Surf & Inversão & 54. O Retorno
  if (n >= 2 && at(1).len >= 4 && cur.len === 1) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Inversão",
      confidence: 69,
    });
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Retorno do Surf",
      confidence: 68,
    });
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "O Retorno",
      confidence: 67,
    });
  }

  // 5. Barreira (Resistance wall at identical run length)
  if (n >= 3 && at(2).len >= 3 && at(1).len === at(2).len && cur.len === at(1).len) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Barreira",
      confidence: 72,
    });
  }

  // 9. Torres Gémeas & 17. Padrão 3/3
  if (n >= 3 && at(1).len >= 3 && at(2).len >= 3 && cur.len < at(1).len) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Torres Gémeas",
      confidence: 71,
    });
    if (at(1).len === 3 && at(2).len === 3) {
      matches.push({
        side: toSide(cur.side),
        pattern: "Padrão 3/3",
        confidence: 72,
      });
    }
  }

  // 12. Quebra de Surf & 51. Anti-Surf
  if (cur.len >= 6) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Quebra de Surf",
      confidence: 71,
    });
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Anti-Surf",
      confidence: 70,
    });
  }

  // 19. Padrão 3-2-1 & 27. Padrão 3-2-1 com Saltos
  if (n >= 4 && at(3).len >= 3 && at(2).len === 2 && at(1).len === 1 && cur.len === 1) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Padrão 3-2-1",
      confidence: 73,
    });
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Padrão 3-2-1 com Saltos",
      confidence: 71,
    });
  }

  // 23. Padrão 2321
  if (n >= 4 && at(3).len === 2 && at(2).len === 3 && at(1).len === 2 && cur.len === 1) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Padrão 2321",
      confidence: 74,
    });
  }

  // 25. Padrão 1-2-3-1-1
  if (
    n >= 5 &&
    at(4).len === 1 &&
    at(3).len === 2 &&
    at(2).len === 3 &&
    at(1).len === 1 &&
    cur.len === 1
  ) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Padrão 1-2-3-1-1",
      confidence: 74,
    });
  }

  // 26. Padrão 1-2-3 Contínuo & 29. Padrão 1-2-4
  if (n >= 3 && at(2).len === 1 && at(1).len === 2 && cur.len >= 2 && cur.len < 3) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Padrão 1-2-3 Contínuo",
      confidence: 66,
    });
  }
  if (n >= 3 && at(2).len === 1 && at(1).len === 2 && cur.len >= 2 && cur.len < 4) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Padrão 1-2-4",
      confidence: 65,
    });
  }

  // 28. Padrão 4-2-1
  if (n >= 3 && at(2).len === 4 && at(1).len === 2 && cur.len === 1) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Padrão 4-2-1",
      confidence: 73,
    });
  }

  // 30. Padrão 1-4-2-2-1-1
  if (
    n >= 6 &&
    at(5).len === 1 &&
    at(4).len === 4 &&
    at(3).len === 2 &&
    at(2).len === 2 &&
    at(1).len === 1 &&
    cur.len === 1
  ) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Padrão 1-4-2-2-1-1",
      confidence: 75,
    });
  }

  // 31. Padrão 3-3-1-1 & 32. Padrão 4-4-1-1
  if (n >= 4 && at(1).len === 1 && cur.len === 1) {
    if (at(3).len === 3 && at(2).len === 3) {
      matches.push({ side: toSide(opposite(cur.side)), pattern: "Padrão 3-3-1-1", confidence: 73 });
    }
    if (at(3).len === 4 && at(2).len === 4) {
      matches.push({ side: toSide(opposite(cur.side)), pattern: "Padrão 4-4-1-1", confidence: 73 });
    }
  }

  // 53. Pirâmide (1-2-3-2-1)
  if (
    n >= 5 &&
    at(4).len === 1 &&
    at(3).len === 2 &&
    at(2).len === 3 &&
    at(1).len === 2 &&
    cur.len === 1
  ) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Pirâmide",
      confidence: 75,
    });
  }

  // 56. Padrão 1-1-2-2
  if (n >= 4 && at(3).len === 1 && at(2).len === 1 && at(1).len === 2 && cur.len === 1) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Padrão 1-1-2-2",
      confidence: 66,
    });
  }

  // 57. Padrão 3-1-2
  if (n >= 3 && at(2).len === 3 && at(1).len === 1 && cur.len === 1) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Padrão 3-1-2",
      confidence: 72,
    });
  }

  // 59. Padrão 1-2
  if (n >= 3 && at(2).len === 1 && at(1).len === 2 && cur.len === 1) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Padrão 1-2",
      confidence: 65,
    });
  }

  // 16. Percentual (Statistical divergence mean reversion)
  const nonTies = outcomes.filter((o) => o !== "T");
  if (nonTies.length >= 30) {
    const recentSample = nonTies.slice(-30);
    const pCount = recentSample.filter((o) => o === "P").length;
    const bCount = recentSample.filter((o) => o === "B").length;
    if (pCount >= 21) {
      matches.push({ side: "banker", pattern: "Percentual", confidence: 66 });
    } else if (bCount >= 21) {
      matches.push({ side: "player", pattern: "Percentual", confidence: 66 });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Category 2: Bead Road Geometry (6-row grid coordinates)             */
  /* ------------------------------------------------------------------ */
  const totalRounds = outcomes.length;
  if (totalRounds >= 20) {
    const grid: (Outcome | null)[][] = Array.from({ length: 6 }, () => []);
    for (let i = 0; i < totalRounds; i++) {
      const r = i % 6;
      const c = Math.floor(i / 6);
      const row = grid[r];
      if (row) row[c] = outcomes[i] ?? null;
    }
    const nextIdx = totalRounds;
    const nextR = nextIdx % 6;
    const nextC = Math.floor(nextIdx / 6);
    const atGrid = (r: number, c: number): Outcome | null | undefined => grid[r]?.[c];

    // 50. Retângulo (2x2 grid cell completion)
    if (nextR >= 1 && nextC >= 1) {
      const tl = atGrid(nextR - 1, nextC - 1);
      const bl = atGrid(nextR, nextC - 1);
      const tr = atGrid(nextR - 1, nextC);
      if (tl && bl && tr && tl !== "T" && bl !== "T" && tr !== "T") {
        if (tl === tr) {
          matches.push({ side: toSide(bl), pattern: "Retângulo", confidence: 73 });
        }
      }
    }

    // 37. Duplo Casado Horizontal & 36. Duplo Casado Vertical
    if (nextC >= 1 && nextR >= 1) {
      const prevColAbove = atGrid(nextR - 1, nextC - 1);
      const curColAbove = atGrid(nextR - 1, nextC);
      const prevColCurrent = atGrid(nextR, nextC - 1);
      if (
        prevColAbove &&
        curColAbove &&
        prevColCurrent &&
        prevColAbove === curColAbove &&
        prevColCurrent !== "T"
      ) {
        matches.push({
          side: toSide(prevColCurrent),
          pattern: "Duplo Casado Horizontal",
          confidence: 72,
        });
      }
    }
    if (nextR >= 3) {
      const c1 = atGrid(nextR - 1, nextC);
      const c2 = atGrid(nextR - 2, nextC);
      const c3 = atGrid(nextR - 3, nextC);
      if (c1 && c2 && c3 && c1 !== "T" && c1 === c2) {
        matches.push({
          side: toSide(opposite(c1)),
          pattern: "Duplo Casado Vertical",
          confidence: 71,
        });
      }
    }

    // 38. Triângulo Mineiro
    if (nextR >= 1 && nextC >= 1) {
      const a1 = atGrid(nextR - 1, nextC - 1);
      const a2 = atGrid(nextR, nextC - 1);
      const a3 = atGrid(nextR - 1, nextC);
      if (a1 && a2 && a3 && a1 !== "T" && a2 !== "T" && a3 !== "T" && a1 === a2 && a2 === a3) {
        matches.push({ side: toSide(a1), pattern: "Triângulo Mineiro", confidence: 72 });
      }
    }

    // 42. Repetição Horizontal de Cores Alternadas
    if (nextC >= 3) {
      const h1 = atGrid(nextR, nextC - 1);
      const h2 = atGrid(nextR, nextC - 2);
      const h3 = atGrid(nextR, nextC - 3);
      if (h1 && h2 && h3 && h1 !== "T" && h2 !== "T" && h3 !== "T") {
        if (h1 !== h2 && h2 !== h3) {
          matches.push({
            side: toSide(opposite(h1)),
            pattern: "Repetição Horizontal de Cores Alternadas",
            confidence: 73,
          });
        }
      }
    }

    // 39. Padrão Espaçado & 40. Padrão Horizontal Vertical
    if (nextC >= 2) {
      const p1 = atGrid(nextR, nextC - 1);
      const p2 = atGrid(nextR, nextC - 2);
      if (p1 && p2 && p1 !== "T" && p1 === p2) {
        matches.push({ side: toSide(p1), pattern: "Padrão Espaçado", confidence: 70 });
        matches.push({ side: toSide(p1), pattern: "Padrão Horizontal Vertical", confidence: 70 });
      }
    }

    // 41. Sequência Crescente Horizontal & 44. Sequência Decrescente Horizontal
    if (nextC >= 2) {
      const col1 = atGrid(nextR, nextC - 1);
      const col2 = atGrid(nextR, nextC - 2);
      if (col1 && col2 && col1 !== "T" && col1 === col2) {
        matches.push({
          side: toSide(col1),
          pattern: "Sequência Crescente Horizontal",
          confidence: 69,
        });
      } else if (col1 && col2 && col1 !== "T" && col1 !== col2) {
        matches.push({
          side: toSide(opposite(col1)),
          pattern: "Sequência Decrescente Horizontal",
          confidence: 69,
        });
      }
    }

    // 47. Formação Cruzada
    if (nextR >= 1 && nextC >= 1) {
      const top = atGrid(nextR - 1, nextC);
      const left = atGrid(nextR, nextC - 1);
      if (top && left && top !== "T" && top === left) {
        matches.push({ side: toSide(top), pattern: "Formação Cruzada", confidence: 71 });
      }
    }

    // 48. Repetição Horizontal da Paridade 1 & 49. Paridade 2
    if (rounds && rounds.length >= totalRounds && nextC >= 2) {
      const sumRound = (idx: number) => {
        const rnd = rounds[idx];
        if (!rnd) return 0;
        return rnd.p[0] + rnd.p[1] + rnd.b[0] + rnd.b[1];
      };
      const idx1 = nextR + (nextC - 1) * 6;
      const idx2 = nextR + (nextC - 2) * 6;
      if (idx1 < rounds.length && idx2 < rounds.length) {
        const par1 = sumRound(idx1) % 2;
        const par2 = sumRound(idx2) % 2;
        if (par1 === par2) {
          const sideVote = par1 === 0 ? "player" : "banker";
          matches.push({
            side: sideVote,
            pattern: "Repetição Horizontal da Paridade 1",
            confidence: 68,
          });
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Category 3: 52. Xeque-Mate (Confluence Engine Boost)                */
  /* ------------------------------------------------------------------ */
  const pMatches = matches.filter((m) => m.side === "player");
  const bMatches = matches.filter((m) => m.side === "banker");
  if (pMatches.length >= 4 && bMatches.length <= 1) {
    matches.push({ side: "player", pattern: "Xeque-Mate", confidence: 85 });
  } else if (bMatches.length >= 4 && pMatches.length <= 1) {
    matches.push({ side: "banker", pattern: "Xeque-Mate", confidence: 85 });
  }

  return matches.sort((x, y) => y.confidence - x.confidence);
}

export const PATTERN_EXPLANATION: Record<string, string> = {
  "Surf de tendência": "Surf: 3 ou mais vitórias seguidas do mesmo lado — seguir a tendência",
  "Xadrez 1-1-1": "Xadrez 1-1-1: alternância perfeita de lados há 4+ rodadas — quebrar",
  "Parzinho 2-2": "Parzinho 2-2: pares de 2 seguidos",
  "Parzinho 2-1-2": "Parzinho 2-1-2: estrutura de pares com um isolado",
  "3-1-3": "3-1-3: bloco de 3, um oposto e completando o próximo",
  "3-2-3": "3-2-3: bloco de 3, dois opostos e completando",
  Rampa: "Rampa: sequências crescentes de comprimento — continuar subindo",
  Perninhas: "Perninhas: sequências curtas alternadas — quebrar o ritmo",
  Espelho: "Espelho: o padrão recente está a repetir-se",
  Inversão: "Inversão: sequência longa quebrada — seguir o novo lado",
  "Quinta Casa": "Quinta Casa: sequência atingindo o quinto ponto",
  "Rampa Alongada": "Rampa Alongada: extensão de degraus crescentes",
  "Rampa Invertida": "Rampa Invertida: sequência decrescente de degraus",
  Barreira: "Barreira: teto de resistência alcançado em colunas anteriores",
  "Padrão 3x2": "Padrão 3x2: ritmo 3 para 2",
  "Torres Gémeas": "Torres Gémeas: construção de colunas simétricas de mesma altura",
  "Padrão V": "Padrão V: formação em V simétrica",
  "Quebra de Surf": "Quebra de Surf: exaustão de tendência longa",
  "Retorno do Surf": "Retorno do Surf: retomada imediata da tendência principal",
  Alternância: "Alternância: ritmo contínuo de troca de lados",
  Percentual: "Percentual: convergência estatística para o lado deficitário",
  "Padrão 3/3": "Padrão 3/3: blocos de 3 seguidos",
  "Padrão 3-2-1": "Padrão 3-2-1: contagem regressiva de blocos",
  "Dupla ou 2x2": "Dupla ou 2x2: repetição rítmica de pares",
  "Escada Inversa": "Escada Inversa: degraus decrescentes contínuos",
  "Padrão 2321": "Padrão 2321: estrutura de blocos 2-3-2-1",
  "Quebra de Sequência": "Quebra de Sequência: ruptura de ritmo repetitivo",
  "Padrão 1-2-3-1-1": "Padrão 1-2-3-1-1: formação de blocos harmônicos",
  "Padrão 1-2-3 Contínuo": "Padrão 1-2-3 Contínuo: progressão contínua",
  "Padrão 3-2-1 com Saltos": "Padrão 3-2-1 com Saltos: regressão com intervalos",
  "Padrão 4-2-1": "Padrão 4-2-1: redução proporcional pela metade",
  "Padrão 1-2-4": "Padrão 1-2-4: expansão proporcional dobrada",
  "Padrão 1-4-2-2-1-1": "Padrão 1-4-2-2-1-1: ciclo harmônico completo",
  "Padrão 3-3-1-1": "Padrão 3-3-1-1: estrutura simétrica 3-3 com finais simples",
  "Padrão 4-4-1-1": "Padrão 4-4-1-1: estrutura pesada 4-4 com finais simples",
  "Duplo Casado Vertical": "Duplo Casado Vertical: alinhamento de pares na coluna",
  "Duplo Casado Horizontal": "Duplo Casado Horizontal: espelhamento horizontal de pares",
  "Triângulo Mineiro": "Triângulo Mineiro: vértice triangular na placa de contas",
  "Padrão Espaçado": "Padrão Espaçado: intervalos periódicos constantes",
  "Padrão Horizontal Vertical": "Padrão Horizontal Vertical: formação em esquadro",
  "Sequência Crescente Horizontal": "Sequência Crescente Horizontal: progressão horizontal",
  "Repetição Horizontal de Cores Alternadas":
    "Repetição Horizontal de Cores Alternadas: xadrez horizontal",
  "Sequência Decrescente Horizontal": "Sequência Decrescente Horizontal: regressão horizontal",
  "Formação Cruzada": "Formação Cruzada: convergência em cruz na placa",
  "Repetição Horizontal da Paridade 1":
    "Repetição Horizontal da Paridade: harmonia da soma dos dados",
  "Repetição Horizontal da Paridade 2":
    "Repetição Horizontal da Paridade 2: alternância de paridade",
  Retângulo: "Retângulo: fechamento de bloco 2x2 na placa",
  "Anti-Surf": "Anti-Surf: contra-tendência em estiramento extremo",
  "Xeque-Mate": "Xeque-Mate: confluência massiva de múltiplos indicadores",
  Pirâmide: "Pirâmide: formação harmônica 1-2-3-2-1",
  "O Retorno": "O Retorno: rebote rápido para a cor predominante",
  "Sequência de Cor": "Sequência de Cor: continuidade de fluxo cromático",
  "Padrão 1-1-2-2": "Padrão 1-1-2-2: ritmo 1-1 seguido de 2-2",
  "Padrão 3-1-2": "Padrão 3-1-2: estrutura 3-1-2",
  "Padrão 2-2": "Padrão 2-2: repetição constante de pares",
  "Padrão 1-2": "Padrão 1-2: alternância 1 para 2",
  "Empate Seco": "Empate Seco: margem crítica de 0 pontos nos dados",
  "Empate Vizinho": "Empate Vizinho: proximidade de empate recente no ciclo",
  "Empate Diagonal": "Empate Diagonal: alinhamento diagonal de empates na placa",
  "Empate em V": "Empate em V: formação em V de empates na placa",
  "Empate em V Espaçado": "Empate em V Espaçado: formação em V aberta de empates",
  "Empate Diagonal 1": "Empate Diagonal 1: diagonal descendente de empates",
  "Empate Horizontal": "Empate Horizontal: repetição de empates na mesma linha",
  "Empate Diagonal 2": "Empate Diagonal 2: diagonal ascendente de empates",
};

export const TREND_WINDOW = 8;

/* ------------------------------------------------------------------ */
/* Math of the table                                                   */
/* ------------------------------------------------------------------ */

/** Exact Bac Bo odds with two fair dice per side: 146 of the 1296 throws are a tie. */
export const P_TIE = 146 / 1296;
/** Chance that Player (or Banker) wins one round. */
export const P_SIDE = (1 - P_TIE) / 2;
/** Chance that one entry is green when the tie is covered (side wins or tie) ≈ 55.6%. */
export const BASE_GREEN = P_SIDE + P_TIE;

/** How many past rounds each pattern is replayed over to measure how it is doing at this table. */
export const BACKTEST_ROUNDS = 40;
/** Weight of the table's base odds in the estimate (like 6 imaginary past entries). */
const PRIOR_WEIGHT = 6;
/** A pattern that has been tried 4+ times here and hits less than this is ignored. */
export const MIN_PATTERN_RATE = 0.45;
const MIN_PATTERN_SAMPLES = 4;
/** The robot's own last readings that, if all red, mark the table as cold. */
export const COLD_STREAK = 2;

export interface PatternRecord {
  n: number;
  hits: number;
}

/* ------------------------------------------------------------------ */
/* Table cycle: trend (surf) vs. alternation (xadrez / picotada)        */
/* ------------------------------------------------------------------ */

export type TableCycle = "trend" | "chop" | "mixed";
/** Recent non-tie rounds read to tell a trending table from a choppy one. */
export const CYCLE_WINDOW = 12;
/** Share of side switches at or above which the table is choppy (picotada). */
export const CHOP_SWITCH_RATE = 0.65;
/** Share of side switches at or below which the table is trending (surf). */
export const TREND_SWITCH_RATE = 0.35;

export interface CycleReading {
  cycle: TableCycle;
  /** Fraction of consecutive rounds that changed side (0 = one long run, 1 = perfect alternation). */
  switchRate: number;
  /** Average run length in the window. */
  avgRun: number;
}

export function tableCycle(outcomes: Outcome[]): CycleReading {
  const seq = outcomes.filter((o) => o !== "T").slice(-CYCLE_WINDOW);
  if (seq.length < 4) return { cycle: "mixed", switchRate: 0.5, avgRun: 2 };
  let switches = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) switches++;
  const switchRate = switches / (seq.length - 1);
  const avgRun = seq.length / (switches + 1);
  const cycle: TableCycle =
    switchRate >= CHOP_SWITCH_RATE ? "chop" : switchRate <= TREND_SWITCH_RATE ? "trend" : "mixed";
  return { cycle, switchRate, avgRun };
}

/** Patterns that follow a trend (bad on a choppy table). */
export const TREND_PATTERNS = new Set([
  "Surf de tendência",
  "Rampa",
  "Rampa Alongada",
  "Torres Gémeas",
  "Padrão 3/3",
  "Quinta Casa",
  "Sequência de Cor",
  "Padrão 1-2-3 Contínuo",
  "Padrão 1-2-4",
  "O Retorno",
  "Retorno do Surf",
]);

/** Patterns that bet on alternation (bad on a trending table). */
export const CHOP_PATTERNS = new Set([
  "Xadrez 1-1-1",
  "Alternância",
  "Perninhas",
  "Quebra de Surf",
  "Anti-Surf",
  "Repetição Horizontal de Cores Alternadas",
  "Barreira",
  "Quebra de Sequência",
]);

/** -1 = pattern goes against the table cycle (blocked), 1 = fits it, 0 = neutral. */
export function cycleFit(pattern: string, cycle: TableCycle): -1 | 0 | 1 {
  if (TREND_PATTERNS.has(pattern)) return cycle === "chop" ? -1 : cycle === "trend" ? 1 : 0;
  if (CHOP_PATTERNS.has(pattern)) return cycle === "trend" ? -1 : cycle === "chop" ? 1 : 0;
  return 0;
}

export const CYCLE_LABEL: Record<TableCycle, string> = {
  trend: "tendência (surf)",
  chop: "alternância (picotada)",
  mixed: "mista",
};

/* ------------------------------------------------------------------ */
/* Tie reading from the point margin of the 4 dice                      */
/* ------------------------------------------------------------------ */

/** Exact chance that the two dice sums differ by 0 or 1 point: 426 of 1296 throws. */
export const P_CLOSE = 426 / 1296;
/** Rounds whose dice margins are read. */
export const TIE_WINDOW = 12;
/** Rounds whose ties are counted (blended with the exact odds). */
const TIE_COUNT_WINDOW = 20;
/** Tie chance from which the robot asks for reinforced tie protection. */
export const TIE_REINFORCE = 0.14;

export interface TieReading {
  /** Estimated tie chance for the next round, 0-100. */
  probability: number;
  /** Average point difference between Player and Banker dice in the recent rounds. */
  avgMargin: number;
  /** Share of recent rounds decided by 0 or 1 point. */
  closeRate: number;
  /** The tie chance is clearly above the normal 11%: reinforce the tie protection. */
  reinforced: boolean;
  patterns?: string[];
}

const diceSum = (d: [number, number]) => d[0] + d[1];

export function tieReading(history: Round[]): TieReading {
  const recent = history.slice(-TIE_WINDOW);
  if (!recent.length) {
    return {
      probability: Math.round(P_TIE * 100),
      avgMargin: 0,
      closeRate: 0,
      reinforced: false,
      patterns: [],
    };
  }
  const margins = recent.map((r) => Math.abs(diceSum(r.p) - diceSum(r.b)));
  const avgMargin = Math.round((margins.reduce((a, m) => a + m, 0) / margins.length) * 10) / 10;
  const closeRate = margins.filter((m) => m <= 1).length / margins.length;
  const counted = history.slice(-TIE_COUNT_WINDOW);
  const ties = counted.filter((r) => r.outcome === "T").length;
  const tieRate = (ties + TIE_COUNT_WINDOW * P_TIE) / (counted.length + TIE_COUNT_WINDOW);
  let p = Math.max(0.06, Math.min(0.25, tieRate * (0.7 + 0.3 * (closeRate / P_CLOSE))));

  const detectedTiePatterns: string[] = [];

  // 14. Empate Seco (extreme close dice margin)
  if (closeRate >= 0.8 && avgMargin <= 1) {
    detectedTiePatterns.push("Empate Seco");
    p = Math.min(0.28, p + 0.02);
  }

  // 20. Empate Vizinho (proximity cluster)
  if (history.length >= 3 && history.slice(-3).some((r) => r.outcome === "T")) {
    detectedTiePatterns.push("Empate Vizinho");
  }

  // Bead Road Tie Geometry (33, 34, 35, 43, 45, 46)
  if (history.length >= 24) {
    const grid: (Outcome | null)[][] = Array.from({ length: 6 }, () => []);
    for (let i = 0; i < history.length; i++) {
      const r = i % 6;
      const c = Math.floor(i / 6);
      const row = grid[r];
      if (row) row[c] = history[i]?.outcome ?? null;
    }
    const nextR = history.length % 6;
    const nextC = Math.floor(history.length / 6);
    const atGrid = (r: number, c: number): Outcome | null | undefined => grid[r]?.[c];

    // 45. Empate Horizontal
    if (nextC >= 2 && atGrid(nextR, nextC - 1) === "T" && atGrid(nextR, nextC - 2) === "T") {
      detectedTiePatterns.push("Empate Horizontal");
      p = Math.min(0.28, p + 0.03);
    }
    // 33 & 43. Empate Diagonal & Empate Diagonal 1
    if (
      nextR >= 2 &&
      nextC >= 2 &&
      atGrid(nextR - 1, nextC - 1) === "T" &&
      atGrid(nextR - 2, nextC - 2) === "T"
    ) {
      detectedTiePatterns.push("Empate Diagonal");
      detectedTiePatterns.push("Empate Diagonal 1");
      p = Math.min(0.28, p + 0.03);
    }
    // 46. Empate Diagonal 2 (ascending)
    if (
      nextR <= 3 &&
      nextC >= 2 &&
      atGrid(nextR + 1, nextC - 1) === "T" &&
      atGrid(nextR + 2, nextC - 2) === "T"
    ) {
      detectedTiePatterns.push("Empate Diagonal 2");
      p = Math.min(0.28, p + 0.03);
    }
    // 34 & 35. Empate em V & Empate em V Espaçado
    if (
      nextR >= 1 &&
      nextC >= 2 &&
      atGrid(nextR - 1, nextC - 1) === "T" &&
      atGrid(nextR, nextC - 2) === "T"
    ) {
      detectedTiePatterns.push("Empate em V");
      detectedTiePatterns.push("Empate em V Espaçado");
    }
  }

  return {
    probability: Math.round(p * 100),
    avgMargin,
    closeRate,
    reinforced: p >= TIE_REINFORCE,
    patterns: detectedTiePatterns,
  };
}

/* ------------------------------------------------------------------ */
/* Signal                                                              */
/* ------------------------------------------------------------------ */

/** Player and Banker readings closer than this are a conflict: no entry. */
export const CONFLICT_MARGIN = 0.03;

export interface Signal extends PatternMatch {
  /** Reinforce the tie protection on this entry. */
  tieAlert: boolean;
  tie: TieReading;
  cycle: TableCycle;
  /** Estimated chance (0-100) that the entry is green, from the table odds and the pattern's record here. */
  probability: number;
  record: PatternRecord;
  /** Other patterns that point to the same side. */
  agree: string[];
  /** Short explanation lines shown with the signal. */
  reasons: string[];
}

export type SkipReason =
  "no_pattern" | "weak_pattern" | "conflict" | "cold_table" | "choppy_table" | "trending_table";

export interface Analysis {
  signal: Signal | null;
  reason: SkipReason | null;
}

export const isGreen = (side: Side, outcome: Outcome) =>
  outcome === "T" || toSide(outcome) === side;

/**
 * Replays the engine over the recent rounds: for every past round, which patterns were formed
 * just before it and whether their side (or a tie) came. Also returns the robot's top reading per round.
 */
export function backtest(outcomes: Outcome[], minConfidence: number, rounds = BACKTEST_ROUNDS) {
  const records = new Map<string, PatternRecord>();
  const picks: boolean[] = [];
  for (let j = Math.max(4, outcomes.length - rounds); j < outcomes.length; j++) {
    const ms = matchPatterns(outcomes.slice(0, j)).filter((m) => m.confidence >= minConfidence);
    if (!ms.length) continue;
    const next = outcomes[j]!;
    for (const m of ms) {
      const rec = records.get(m.pattern) ?? { n: 0, hits: 0 };
      rec.n += 1;
      if (isGreen(m.side, next)) rec.hits += 1;
      records.set(m.pattern, rec);
    }
    picks.push(isGreen(ms[0]!.side, next));
  }
  return { records, picks };
}

/** Bayesian estimate of the green chance: the table odds, corrected by what the pattern did here. */
export function estimateGreen(rec: PatternRecord): number {
  return (rec.hits + PRIOR_WEIGHT * BASE_GREEN) / (rec.n + PRIOR_WEIGHT);
}

/**
 * Confluence confidence (0-95): the pattern's own strength, plus agreeing patterns (+4 each, max +8),
 * plus its hit rate at this table versus the odds (±10, once it has 4+ samples),
 * plus 4 when the pattern fits the table cycle.
 */
export function confluenceConfidence(
  base: number,
  agreeing: number,
  record: PatternRecord,
  fit: -1 | 0 | 1,
): number {
  let c = base + Math.min(8, agreeing * 4);
  if (record.n >= MIN_PATTERN_SAMPLES) {
    c += Math.max(-10, Math.min(10, Math.round((record.hits / record.n - BASE_GREEN) * 40)));
  }
  if (fit === 1) c += 4;
  return Math.max(0, Math.min(95, c));
}

const pct = (x: number) => Math.round(x * 100);

export function analyze(history: Round[], minConfidence: number): Analysis {
  const outcomes = history.map((r) => r.outcome);
  const matches = matchPatterns(outcomes, history).filter((m) => m.confidence >= minConfidence);
  if (!matches.length) return { signal: null, reason: "no_pattern" };

  const { cycle } = tableCycle(outcomes);
  const fitting = matches.filter((m) => cycleFit(m.pattern, cycle) !== -1);
  if (!fitting.length) {
    return { signal: null, reason: cycle === "chop" ? "choppy_table" : "trending_table" };
  }

  const { records, picks } = backtest(outcomes, minConfidence);
  const recent = picks.slice(-COLD_STREAK);
  if (recent.length === COLD_STREAK && recent.every((g) => !g)) {
    return { signal: null, reason: "cold_table" };
  }

  const scored = fitting
    .map((m) => {
      const record = records.get(m.pattern) ?? { n: 0, hits: 0 };
      return { m, record, estimate: estimateGreen(record) };
    })
    .filter(
      ({ record }) => record.n < MIN_PATTERN_SAMPLES || record.hits / record.n >= MIN_PATTERN_RATE,
    );
  if (!scored.length) return { signal: null, reason: "weak_pattern" };

  // Each side's reading: its best pattern plus a small bonus for every other pattern agreeing.
  const sideScore = (side: Side) => {
    const own = scored.filter((x) => x.m.side === side).sort((a, b) => b.estimate - a.estimate);
    if (!own.length) return null;
    const best = own[0]!;
    const bonus = Math.min(0.03, (own.length - 1) * 0.01);
    return { ...best, score: best.estimate + bonus, agree: own.slice(1).map((x) => x.m.pattern) };
  };
  const p = sideScore("player");
  const b = sideScore("banker");
  // Player and Banker readings about equally strong: no clear side, no entry.
  if (p && b && Math.abs(p.score - b.score) < CONFLICT_MARGIN) {
    return { signal: null, reason: "conflict" };
  }
  const pick = !b || (p && p.score > b.score) ? p! : b;

  const { record } = pick;
  const confidence = confluenceConfidence(
    pick.m.confidence,
    pick.agree.length,
    record,
    cycleFit(pick.m.pattern, cycle),
  );

  const tie = tieReading(history);
  const probability = Math.max(50, Math.min(85, pct(pick.score)));
  const reasons = [
    PATTERN_EXPLANATION[pick.m.pattern] ?? pick.m.pattern,
    record.n
      ? `Nesta mesa acertou ${record.hits} de ${record.n} (${pct(record.hits / record.n)}%) nas últimas ${BACKTEST_ROUNDS} rodadas`
      : `Padrão novo nesta mesa · base matemática de ${pct(BASE_GREEN)}% com empate coberto`,
    `Confluência ${confidence}% · mesa em ${CYCLE_LABEL[cycle]}`,
  ];
  if (pick.agree.length) reasons.push(`Confirmado por: ${pick.agree.join(", ")}`);
  reasons.push(
    `Cubra o empate como proteção (chance ${tie.probability}%, margem média dos dados ${tie.avgMargin} pts)`,
  );

  return {
    signal: {
      ...pick.m,
      confidence,
      tieAlert: tie.reinforced,
      tie,
      cycle,
      probability,
      record,
      agree: pick.agree,
      reasons,
    },
    reason: null,
  };
}

export function detectSignal(history: Round[], minConfidence: number): Signal | null {
  return analyze(history, minConfidence).signal;
}

export function resolveAttempt(side: Side, outcome: Outcome): "win" | "tie" | "loss" {
  if (outcome === "T") return "tie";
  return toSide(outcome) === side ? "win" : "loss";
}

export function resultFor(attemptIndex: number, won: boolean): SignalResult {
  if (!won) return "red";
  return (["green_g0", "green_g1"] as const)[attemptIndex] ?? "red";
}

export function resolveSignal(
  side: Side,
  next: Outcome[],
): { result: SignalResult; tieHit: boolean; used: number } {
  // Only entry + 1 gale
  for (let i = 0; i < Math.min(2, next.length); i++) {
    const r = resolveAttempt(side, next[i]!);
    if (r !== "loss") return { result: resultFor(i, true), tieHit: r === "tie", used: i + 1 };
  }
  return { result: "red", tieHit: false, used: Math.min(2, next.length) };
}

export function distribution(history: Round[]) {
  const { player, banker, tie } = summarizeRoundFrequencies(history);
  return { player, banker, tie };
}

export interface DayStats {
  total: number;
  greens: number;
  accuracy: number;
  streak: number;
  g0: number;
  g1: number;
  reds: number;
}

export function computeStats(results: SignalResult[]): DayStats {
  const g0 = results.filter((r) => r === "green_g0").length;
  const g1 = results.filter((r) => r === "green_g1").length;
  const reds = results.filter((r) => r === "red").length;
  const greens = g0 + g1;
  let streak = 0;
  for (const r of results) {
    if (r === "red") break;
    streak++;
  }
  return {
    total: results.length,
    greens,
    accuracy: results.length ? Math.round((greens / results.length) * 100) : 0,
    streak,
    g0,
    g1,
    reds,
  };
}

export const RESULT_LABEL: Record<SignalResult, string> = {
  green_g0: "GREEN DIRETO",
  green_g1: "GREEN G1",
  red: "RED",
};
