<script lang="ts">
  import { writable, derived, type Writable } from "svelte/store";
  import { Button, Input, Card, Heading } from "@lib/cubicdbKit";

  let activeTab = "input";

  // ==========================================
  // CASOS DE USO: RECONSTRUCCIONES
  // ==========================================
  // 1. Cargar una reconstrucción desde string
  // 2. Validar sintaxis de la reconstrucción
  // 3. Reproducir movimientos paso a paso
  // 4. Ir adelante/atrás en la reconstrucción
  // 5. Obtener posición del cubo en cualquier momento
  // 6. Calcular estadísticas de la reconstrucción (# movimientos, HTM, STM)
  // 7. Comparar reconstrucciones (similitud)
  // 8. Exportar reconstrucción con análisis
  // ==========================================

  interface ReconstructionAnalysis {
    valid: boolean;
    moves: string[];
    moveCount: number;
    htm: number; // Half Turn Metric
    stm: number; // Slice Turn Metric
    errors: string[];
    currentIndex: number;
  }

  let reconstructionInput: Writable<string> = writable("");
  let currentIndex: Writable<number> = writable(0);
  let analysis: Writable<ReconstructionAnalysis | null> = writable(null);
  let comparisonInput: Writable<string> = writable("");

  // Moves válidos en 3x3
  const VALID_MOVES = /^[RLUDFBrludfbMESxyz]w?['2]?$/;
  const MOVE_GROUPS = {
    rotations: ["x", "y", "z", "x'", "y'", "z'", "x2", "y2", "z2"],
    wideMoves: ["Rw", "Lw", "Uw", "Dw", "Fw", "Bw"],
    sliceMoves: ["M", "E", "S", "M'", "E'", "S'", "M2", "E2", "S2"],
  };

  // ==========================================
  // CASO 1: VALIDAR SINTAXIS
  // ==========================================
  function validateReconstruction(input: string): ReconstructionAnalysis {
    const errors: string[] = [];
    const moves: string[] = input
      .trim()
      .split(/\s+/)
      .filter((m) => m.length > 0);

    moves.forEach((move, idx) => {
      if (!VALID_MOVES.test(move)) {
        errors.push(`Invalid move at position ${idx}: "${move}"`);
      }
    });

    const moveCount = moves.length;
    const htm = calculateHTM(moves);
    const stm = calculateSTM(moves);

    return {
      valid: errors.length === 0,
      moves,
      moveCount,
      htm,
      stm,
      errors,
      currentIndex: 0,
    };
  }

  // ==========================================
  // CASO 2: CALCULAR MÉTRICAS
  // ==========================================
  function calculateHTM(moves: string[]): number {
    return moves.reduce((sum, move) => {
      // X' o Y = 1, X2 = 2
      if (move.includes("'") || (move[move.length - 1] >= "a" && move[move.length - 1] <= "z")) {
        return sum + 1;
      }
      if (move.includes("2")) {
        return sum + 2;
      }
      return sum + 1;
    }, 0);
  }

  function calculateSTM(moves: string[]): number {
    return moves.reduce((sum, move) => {
      const baseMove = move.replace(/[w'2]/g, "");
      const isSlice = MOVE_GROUPS.sliceMoves.includes(move);
      const isWide = move.includes("w");

      let cost = 1;
      if (move.includes("2")) {
        cost = 2;
      }

      // Rotations y slices cuentan como 2 en STM (excepto en algunas reglas)
      if (MOVE_GROUPS.rotations.includes(move)) {
        cost *= 2; // Las rotaciones del cubo cuentan como 2
      }
      if (isSlice && !isWide) {
        cost *= 2; // Los slices cuentan como 2
      }

      return sum + cost;
    }, 0);
  }

  // ==========================================
  // CASO 3 & 4: NAVEGACIÓN
  // ==========================================
  function parseReconstruction() {
    const result = validateReconstruction($reconstructionInput);
    analysis.set(result);
    currentIndex.set(0);
  }

  function nextMove() {
    const $analysis = $analysis;
    if ($analysis && $currentIndex < $analysis.moves.length - 1) {
      currentIndex.set($currentIndex + 1);
    }
  }

  function previousMove() {
    if ($currentIndex > 0) {
      currentIndex.set($currentIndex - 1);
    }
  }

  function goToMove(idx: number) {
    const $analysis = $analysis;
    if ($analysis && idx >= 0 && idx < $analysis.moves.length) {
      currentIndex.set(idx);
    }
  }

  // ==========================================
  // CASO 5: OBTENER ESTADO DEL CUBO
  // ==========================================
  function getCubeState(upToIndex: number): string {
    const $analysis = $analysis;
    if (!$analysis) return "No reconstruction loaded";

    const executedMoves = $analysis.moves.slice(0, upToIndex + 1);
    return executedMoves.join(" ");
  }

  // ==========================================
  // CASO 7: COMPARAR RECONSTRUCCIONES
  // ==========================================
  function compareReconstructions(): {
    similarity: number;
    commonMoves: number;
    differences: string[];
  } {
    const main = validateReconstruction($reconstructionInput);
    const comparison = validateReconstruction($comparisonInput);

    const mainSet = new Set(main.moves);
    const compSet = new Set(comparison.moves);

    const commonMoves = Array.from(mainSet).filter((m) => compSet.has(m)).length;
    const totalMoves = Math.max(main.moves.length, comparison.moves.length);
    const similarity = totalMoves > 0 ? (commonMoves / totalMoves) * 100 : 0;

    const differences: string[] = [];
    Math.max(main.moves.length, comparison.moves.length) < 100 &&
      main.moves.forEach((m, i) => {
        if (comparison.moves[i] !== m) {
          differences.push(`Position ${i}: "${m}" vs "${comparison.moves[i] || "missing"}"`);
        }
      });

    return { similarity, commonMoves, differences };
  }

  // ==========================================
  // CASO 8: EXPORTAR
  // ==========================================
  function exportAnalysis() {
    if (!$analysis) return;

    const data = {
      reconstruction: $reconstructionInput,
      analysis: {
        valid: $analysis.valid,
        moveCount: $analysis.moveCount,
        htm: $analysis.htm,
        stm: $analysis.stm,
        moves: $analysis.moves,
        errors: $analysis.errors,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconstruction-${Date.now()}.json`;
    a.click();
  }

  // Reactive variable
  $: currentAnalysis = $analysis
    ? {
        ...$analysis,
        currentIndex: $currentIndex,
      }
    : null;

  let comparisonResult: any = null;
  $: if ($reconstructionInput || $comparisonInput) {
    try {
      comparisonResult = compareReconstructions();
    } catch (e) {
      comparisonResult = null;
    }
  }
</script>

<div class="p-6 space-y-6">
  <Heading tag="h1">Reconstruction Playground - Test Cases</Heading>

  <div class="tabs tabs-bordered">
    <button
      class="tab {activeTab === 'input' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "input")}
    >
      Input & Parse
    </button>
    <button
      class="tab {activeTab === 'analysis' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "analysis")}
    >
      Analysis
    </button>
    <button
      class="tab {activeTab === 'comparison' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "comparison")}
    >
      Comparison
    </button>
    <button
      class="tab {activeTab === 'export' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "export")}
    >
      Export
    </button>
  </div>

  {#if activeTab === "input"}
    <Card title="Load Reconstruction">
        <div class="space-y-4">
          <textarea
            class="textarea textarea-bordered w-full h-32"
            placeholder="Enter scramble/reconstruction sequence (e.g., R U R' U' R U R' U' y R U' R U R U' R U')"
            bind:value={$reconstructionInput}
          />

          <div class="alert alert-info">
            <p class="text-sm">
              <strong>Tip:</strong> Enter moves separated by spaces. Supported: R,L,U,D,F,B, rotations (x,y,z),
              slices (M,E,S), and modifiers (', 2, w)
            </p>
          </div>

          <Button onclick={parseReconstruction} class="w-full">Parse Reconstruction</Button>

          {#if currentAnalysis}
            <div class="divider">Parsing Results</div>

            {#if !currentAnalysis.valid}
              <div class="alert alert-error">
                <p class="font-bold">Invalid Reconstruction</p>
                <ul class="list-disc pl-5 mt-2">
                  {#each currentAnalysis.errors as error}
                    <li class="text-sm">{error}</li>
                  {/each}
                </ul>
              </div>
            {:else}
              <div class="alert alert-success">
                <p class="font-bold">✓ Valid Reconstruction</p>
              </div>
            {/if}
          {/if}
        </div>
      </Card>
  {:else if activeTab === "analysis"}
    <Card title="Reconstruction Analysis">
        {#if currentAnalysis}
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div class="stat">
              <div class="stat-title">Moves</div>
              <div class="stat-value">{currentAnalysis.moveCount}</div>
            </div>

            <div class="stat">
              <div class="stat-title">HTM</div>
              <div class="stat-value text-primary">{currentAnalysis.htm}</div>
            </div>

            <div class="stat">
              <div class="stat-title">STM</div>
              <div class="stat-value text-info">{currentAnalysis.stm}</div>
            </div>

            <div class="stat">
              <div class="stat-title">Efficiency</div>
              <div class="stat-value text-success">
                {((currentAnalysis.htm / currentAnalysis.stm) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div class="divider">Move Sequence Navigation</div>

          <div class="flex gap-2 mb-4 flex-wrap">
            <Button onclick={previousMove} class="btn-sm">← Previous</Button>
            <Button onclick={nextMove} class="btn-sm">Next →</Button>
          </div>

          <div class="bg-gray-100 p-4 rounded-lg mb-4 min-h-12">
            <p class="font-mono text-sm">
              <strong>Current State (0 to {$currentIndex}):</strong>
              <br />
              {getCubeState($currentIndex)}
            </p>
          </div>

          <!-- Move timeline -->
          <div class="overflow-x-auto">
            <div class="flex gap-1 py-2 pb-4">
              {#each currentAnalysis.moves as move, idx}
                <button
                  class="btn btn-sm {idx === $currentIndex
                    ? 'btn-primary'
                    : idx < $currentIndex
                      ? 'btn-success'
                      : 'btn-outline'}"
                  onclick={() => goToMove(idx)}
                >
                  {move}
                </button>
              {/each}
            </div>
          </div>

          <!-- Move groups -->
          <div class="divider">Move Analysis</div>

          <div class="grid grid-cols-3 gap-2">
            <div class="stat">
              <div class="stat-title">Rotations</div>
              <div class="stat-value">
                {currentAnalysis.moves.filter((m) =>
                  MOVE_GROUPS.rotations.includes(m)
                ).length}
              </div>
            </div>

            <div class="stat">
              <div class="stat-title">Slices</div>
              <div class="stat-value">
                {currentAnalysis.moves.filter((m) =>
                  MOVE_GROUPS.sliceMoves.includes(m)
                ).length}
              </div>
            </div>

            <div class="stat">
              <div class="stat-title">Wide Moves</div>
              <div class="stat-value">
                {currentAnalysis.moves.filter((m) => m.includes("w")).length}
              </div>
            </div>
          </div>
        {:else}
          <p class="text-gray-500 text-center py-8">Parse a reconstruction to see analysis</p>
        {/if}
      </Card>
  {:else if activeTab === "comparison"}
    <Card title="Compare Reconstructions">
        <div class="space-y-4">
          <div>
            <label class="label">
              <span class="label-text">Second Reconstruction</span>
            </label>
            <textarea
              class="textarea textarea-bordered w-full h-24"
              placeholder="Enter another reconstruction to compare"
              bind:value={$comparisonInput}
            />
          </div>

          {#if comparisonResult && $reconstructionInput && $comparisonInput}
            <div class="grid grid-cols-2 gap-4">
              <div class="stat">
                <div class="stat-title">Similarity</div>
                <div class="stat-value text-lg">
                  {comparisonResult.similarity.toFixed(1)}%
                </div>
              </div>

              <div class="stat">
                <div class="stat-title">Common Moves</div>
                <div class="stat-value text-lg">
                  {comparisonResult.commonMoves}
                </div>
              </div>
            </div>

            {#if comparisonResult.differences.length > 0 && comparisonResult.differences.length <= 10}
              <div class="alert alert-warning">
                <p class="font-bold">Differences ({comparisonResult.differences.length})</p>
                <ul class="list-disc pl-5 mt-2 text-sm">
                  {#each comparisonResult.differences as diff}
                    <li>{diff}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          {/if}
        </div>
      </Card>
  {:else if activeTab === "export"}
    <Card title="Export Analysis">
        <p class="text-sm text-gray-600 mb-4">
          Export the reconstruction analysis as JSON for later review
        </p>
        <Button
          onclick={exportAnalysis}
          disabled={!currentAnalysis}
          class="w-full"
        >
          Download Analysis
        </Button>
      </Card>
  {/if}
</div>