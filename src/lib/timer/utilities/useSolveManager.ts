import { get } from 'svelte/store';
import type { Solve } from '@interfaces';
import type { TimerController } from '$lib/controllers/TimerController';
import { binSearch } from '@helpers/object';
import { INITIAL_STATISTICS } from '@helpers/statistics';

export function useSolveManager(timerController: TimerController) {
  const { solves, allSolves, stats } = timerController;

  function selectSolve(s: Solve) {
    s.selected = !s.selected;
    // Actualizar contador
    let count = 0;
    get(solves).forEach(solve => {
      if (solve.selected) count++;
    });
    // Return count para actualizar en componente si es necesario
    return count;
  }

  function selectSolveById(id: string, n: number) {
    const allSolvesVal = get(allSolves);
    allSolvesVal.forEach(s => (s.selected = false));

    let count = 0;
    for (let i = 0, maxi = allSolvesVal.length; i < maxi; i += 1) {
      if (allSolvesVal[i]._id === id) {
        for (let j = 0; j < n && i + j < maxi; j += 1) {
          allSolvesVal[i + j].selected = true;
          count++;
        }
        break;
      }
    }
    return count;
  }

  function updateStatistics() {
    return timerController.updateStatistics(true);
  }

  function setSolves(rescramble: boolean = true) {
    timerController.sortSolves();
    timerController.updateStatistics(true);
    return rescramble;
  }

  function handleAddSolve(solve: Solve) {
    timerController.lastSolve.set(solve);
    allSolves.update(curr => [...curr, solve]);
    solves.update(curr => [...curr, solve]);
    setSolves();
  }

  function handleUpdateSolve(updatedSolve: Solve) {
    const allSolvesVal = get(allSolves);
    for (let i = 0, maxi = allSolvesVal.length; i < maxi; i += 1) {
      if (allSolvesVal[i]._id === updatedSolve._id) {
        allSolvesVal[i].comments = updatedSolve.comments;
        allSolvesVal[i].penalty = updatedSolve.penalty;
        allSolvesVal[i].time = updatedSolve.time;
        break;
      }
    }
    stats.set(INITIAL_STATISTICS);
    setSolves(false);
  }

  function handleRemoveSolves(ids: Solve[]) {
    const solvesVal = get(solves);
    const allSolvesVal = get(allSolves);
    const sl = solvesVal.length;

    for (let i = 0, maxi = ids.length; i < maxi; i += 1) {
      const pos1 = binSearch<Solve>(ids[i], solvesVal, (a: Solve, b: Solve) => b.date - a.date);
      const pos2 = binSearch<Solve>(ids[i], allSolvesVal, (a: Solve, b: Solve) => b.date - a.date);

      if (pos1 > -1) solvesVal.splice(pos1, 1);
      if (pos2 > -1) allSolvesVal.splice(pos2, 1);
    }

    if (solvesVal.length != sl) {
      stats.set(INITIAL_STATISTICS);
      setSolves();
    }
  }

  return {
    selectSolve,
    selectSolveById,
    updateStatistics,
    setSolves,
    handleAddSolve,
    handleUpdateSolve,
    handleRemoveSolves,
  };
}
