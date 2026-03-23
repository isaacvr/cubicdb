# Solve CRUD

## Reglas de edición de penalties

Las reglas de edición dependen del **origen** del penalty:

| Origen | Penalty actual | Puede cambiar a |
|---|---|---|
| Sin penalty | NONE | P2, DNF |
| +2 manual | P2 | NONE, DNF |
| DNF manual | DNF | NONE, P2 |
| +2 por inspección | P2 | DNF (quitar solo si fue accidente) |
| DNF por inspección | DNF | **No editable** |

Nota: el solve debe registrar el origen del penalty para poder aplicar estas reglas.

```ts
/**
 * Información del penalty para determinar reglas de edición.
 */
interface PenaltyInfo {
  penalty: Penalty;
  source: 'none' | 'manual' | 'inspection';
}
```

## Reglas generales

- **Tiempo no es editable** después de guardar. Solo se puede añadir manualmente (Manual device).
- **Comentarios** son editables siempre.
- **Eliminación en batch**: se pueden seleccionar y eliminar múltiples solves. Requiere confirmación.
- **Eliminar lastSolve**: si el timer no está en CLEAN, forzar transición a CLEAN
  (emitir `DeviceCancelled` si hay un solve en progreso).
- **Solve pertenece a una única sesión.** No se comparten entre sesiones.

## Flujo: editar penalty

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant DB

    U->>UI: cambia penalty del solve (e.g., NONE → P2)
    UI->>EB: SolvePenaltyChangeRequested(solve, P2)

    EB->>T: valida reglas de edición
    alt penalty editable
        T->>T: actualiza solve.penalty = P2
        T->>DB: SolveRepository.updateSolve(solve)
        T->>T: recalcula stats (incremental desde el solve afectado)
        T->>EB: SolveUpdated(prev, updated)
        EB->>UI: actualiza lista y stats
    else penalty no editable (DNF por inspección)
        T->>EB: emite error/notificación
        EB->>UI: muestra mensaje "penalty no editable"
    end
```

## Flujo: eliminar solves

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant D as Device
    participant DB

    U->>UI: selecciona solves, presiona eliminar
    UI->>EB: SolveRemovalRequested(solves[])
    EB->>UI: muestra diálogo de confirmación

    alt usuario confirma
        UI->>EB: SolveRemovalConfirmed(solves[])
        EB->>T: procesa eliminación

        alt algún solve es el lastSolve Y timerState !== CLEAN
            T->>D: fuerza cancelación
            D->>EB: DeviceCancelled
            EB->>T: timerState = CLEAN, time = 0
        end

        T->>DB: SolveRepository.removeSolves(solves)
        T->>T: elimina de allSolves[] y solves[]
        T->>T: stats = INITIAL, recalcula desde cero
        T->>EB: SolvesRemoved(solves)
        EB->>UI: actualiza lista y stats
    else usuario cancela
        Note over UI: no hace nada
    end
```

## Flujo: editar comentarios

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant DB

    U->>UI: edita comentario del solve
    UI->>T: handleUpdateSolve(solve con nuevo comments)
    T->>DB: SolveRepository.updateSolve(solve)
    T->>EB: SolveUpdated(prev, updated)
    Note over T: No recalcula stats (comments no afecta stats)
```

## Recálculo de estadísticas

```
Cuándo se recalcula:
├── SolveAdded       → incremental (solo el nuevo solve)
├── SolveUpdated     → desde el punto del solve afectado (si cambió penalty/time)
├── SolvesRemoved    → desde cero (INITIAL_STATISTICS)
└── SessionSwitched  → desde cero (nueva sesión, nuevos solves)

Optimización futura:
  En vez de recalcular todo desde INITIAL_STATISTICS al eliminar,
  recalcular desde el solve más antiguo afectado.
  Esto requiere que las estadísticas sean indexables por posición.
```
