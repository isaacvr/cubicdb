# Migration Plan

## Principio

Migración incremental. En cada fase, la app debe seguir funcionando.
Las fases se pueden hacer en PRs separados.

---

## Fase 0: Infraestructura base

**Objetivo**: tener las piezas fundamentales sin romper nada existente.

1. **Result type** - Crear `src/lib/core/domain/Result.ts` con `Ok`, `Err`, `Result<T, E>`.
2. **Domain events** - Crear `src/lib/events/domain/TimerEvents.ts` con todos los eventos definidos en [events.md](events.md).
3. **TimerState class** - Crear `src/lib/timer/TimerState.ts` con `$state` para todo el estado reactivo del timer (`timerState`, `time`, `ready`, `scramble`, `solves`, `lastSolve`, etc.).
4. **TimerReactor** - Crear `src/lib/timer/TimerReactor.ts` que suscribe al EventBus y actualiza `TimerState`. Inicialmente sin side effects (no guarda solves, no genera scrambles).

**Resultado**: EventBus + eventos + TimerState + TimerReactor existen pero no se usan todavía.

---

## Fase 1: Keyboard device (migración del device principal)

**Objetivo**: el device más usado funciona con el nuevo sistema.

1. **Crear KeyboardDevice nuevo** - `src/lib/devices/KeyboardDevice.ts`. XState interno, emite eventos al EventBus, recibe `onTimeUpdate` callback.
2. **Conectar al TimerReactor** - El reactor actualiza `TimerState` cuando llegan eventos del Keyboard.
3. **Conectar UI** - `Timer.svelte` lee de `TimerState` ($state) en vez de los stores del `TimerController`.
4. **Side effects en reactor** - Agregar guardado de solves, generación de scramble (usando el `TimerController` existente como puente temporal).
5. **Verificar flujos** - CLEAN→PREVENTION→READY→RUNNING→STOPPED, cancel, inspection, penalties, multi-step.

**Resultado**: Keyboard funciona con event-driven. Los demás devices siguen con el sistema viejo.

---

## Fase 2: Manual y Virtual devices

**Objetivo**: migrar los devices simples.

1. **ManualDevice** - Solo emite `DeviceStopped(time)` cuando el usuario ingresa un tiempo.
2. **VirtualDevice** - Emite `DeviceStartedRunning` al primer movimiento, `DeviceStopped` al resolver.

**Resultado**: 3 de los devices principales migrados.

---

## Fase 3: ScrambleService

**Objetivo**: desacoplar la generación de scrambles del TimerController.

1. **Crear ScrambleService** - Con sistema de fallback (ver [scramble.md](scramble.md)).
2. **Registrar CstimerGenerator** como generador global.
3. **Conectar al reactor** - Después de `DeviceStopped`, el reactor pide scramble al ScrambleService.
4. **Mover imagen de preview** - Como side effect separado del scramble.

**Resultado**: scrambles desacoplados. TimerController ya no maneja scrambles.

---

## Fase 4: Stackmat y Bluetooth devices

**Objetivo**: migrar devices de hardware.

1. **StackmatDevice** - Reescribir con XState + EventBus. El audio processing se mantiene igual internamente.
2. **GANDevice** - Reescribir con XState + EventBus. La comunicación BLE se mantiene igual.
3. **QYTimerDevice** - Similar a Stackmat.
4. **IDeviceDiscovery** - Implementar `WebDeviceDiscovery` y `ElectronDeviceDiscovery`.

**Resultado**: todos los devices migrados al nuevo sistema.

---

## Fase 5: Session switching y Solve CRUD via eventos

**Objetivo**: migrar las operaciones de sesión y solves al EventBus.

1. **Session events** - `SessionSwitched`, `SessionCreated`, etc. (ver [sessions.md](sessions.md)).
2. **Solve events** - `SolveUpdated`, `SolvesRemoved`, `PenaltyChanged` (ver [solves.md](solves.md)).
3. **Conectar handlers** - El reactor procesa estos eventos y ejecuta use cases.

**Resultado**: todo el flujo es event-driven.

---

## Fase 6: Limpieza

**Objetivo**: eliminar código legacy.

1. **Eliminar TimerController** - Reemplazado por TimerReactor + TimerState + servicios.
2. **Eliminar InputContext** - Reemplazado por IDevice + EventBus.
3. **Eliminar Emitter** - Reemplazado por EventBus.
4. **Eliminar stores viejos** - Reemplazados por $state.
5. **Eliminar adaptors/** - Reemplazados por devices/.

**Resultado**: codebase limpio, sin código dual.

---

## Fase 7: Data layer via eventos

**Objetivo**: el backend de datos se selecciona por ambiente y se comunica via eventos.

1. **EnvironmentDetector** - Detecta si estamos en Electron, web, o Capacitor.
2. **Data events** - Los repositorios emiten/escuchan eventos para operaciones async.
3. **Adapter selection** - El factory selecciona el adapter correcto según el ambiente detectado.

---

## Diagrama de dependencias entre fases

```mermaid
flowchart TD
    F0[Fase 0: Infraestructura] --> F1[Fase 1: Keyboard]
    F0 --> F2[Fase 2: Manual + Virtual]
    F1 --> F3[Fase 3: ScrambleService]
    F1 --> F4[Fase 4: Stackmat + BLE]
    F3 --> F5[Fase 5: Sessions + Solves]
    F4 --> F5
    F2 --> F5
    F5 --> F6[Fase 6: Limpieza]
    F6 --> F7[Fase 7: Data layer]
```

- Fases 1 y 2 pueden hacerse en paralelo.
- Fases 3 y 4 pueden hacerse en paralelo después de Fase 1.
- Fase 5 requiere que todos los devices estén migrados.
- Fase 6 solo se hace cuando todo funciona.
- Fase 7 es independiente pero se beneficia de la limpieza.

---

## Regla de oro

En cualquier momento entre fases, la app debe funcionar.
Si algo falla, se revierte la fase incompleta, no se fuerza el avance.
