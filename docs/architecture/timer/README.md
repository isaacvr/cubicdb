# Timer & Devices: Event-Driven Architecture

## Principio fundamental

```
Device (XState) ── notifica ──▶ EventBus ──▶ Timer (reacciona, muestra, guarda)
```

- El **device** es la autoridad del flujo. Controla transiciones, inspection, prevention, timing.
- El **Timer** es un reactor. Escucha notificaciones y ejecuta side effects.
- El **EventBus** transporta eventos de dominio tipados. No transporta datos de alta frecuencia.
- El **time** (cronómetro/countdown) viaja por un canal directo (callback), no por EventBus.

## Flujo de estados

```
CLEAN → PREVENTION → READY → INSPECTION → RUNNING → STOPPED
                                                 ↕
                                               PAUSE
```

- **CLEAN**: estado inicial, sin actividad.
- **PREVENTION**: el usuario mantiene presionado (hold). Detalle del device, el Timer solo muestra.
- **READY**: la prevención terminó. El device puede proceder al siguiente paso.
- **INSPECTION**: countdown de inspección (si aplica). El device lo controla.
- **RUNNING**: cronómetro corriendo.
- **PAUSE**: cronómetro congelado (solo algunos devices lo soportan).
- **STOPPED**: resolución finalizada. El Timer guarda, calcula, genera scramble.

### Flag `ready` vs estado READY

Son conceptos distintos:

- **READY (estado)**: estado de la máquina XState del device, entre PREVENTION e INSPECTION.
  Indica que la prevención terminó y se puede avanzar.
- **`ready` (flag)**: indicador visual ("green light") que se activa **justo antes de RUNNING**.
  La UI lo usa para mostrar el color verde. Se desactiva al entrar a RUNNING o al cancelar.
  - Sin inspección: se activa al salir de READY (inmediatamente antes de RUNNING).
  - Con inspección: se activa cuando el usuario presiona space durante INSPECTION
    (indicando que va a arrancar). No se activa en el estado READY.

### Flujo por device

No todos los devices pasan por todos los estados:
- **Keyboard**: CLEAN → PREVENTION → READY → [INSPECTION →] RUNNING → STOPPED
- **Stackmat**: CLEAN → RUNNING → STOPPED (el hardware controla todo)
- **Manual**: CLEAN → STOPPED (entrada directa de tiempo)
- **Virtual**: CLEAN → RUNNING → STOPPED (primer movimiento inicia)
- **GAN**: CLEAN → RUNNING → STOPPED (similar a virtual)

## Responsabilidades

| Componente | Hace | NO hace |
|---|---|---|
| **Device** | Controla el flujo de estados. Mide el tiempo. Maneja inspection/prevention. Emite eventos al EventBus. | Guardar solves. Modificar scramble. Calcular stats. Escribir en stores del Timer (excepto time via callback). |
| **Timer** | Reacciona a eventos. Actualiza la UI. Guarda solves en DB. Calcula estadísticas. Genera scrambles. Emite celebrations. | Decidir transiciones de estado. Controlar el flujo del solve. Conocer detalles del hardware. |
| **EventBus** | Transporta eventos tipados entre componentes. | Lógica de negocio. Almacenar estado. Transportar datos de alta frecuencia. |

## Acceso a datos

```
Device puede LEER (via TimerReadonlyView):
  ├── scramble         → para mostrar o enviar al hardware
  ├── session.settings → para saber si hay inspection, prevention, steps, etc.
  └── state            → para sincronizar si es necesario

Device puede ESCRIBIR (via canales directos):
  └── time             → via onTimeUpdate callback (alta frecuencia)

Device EMITE (via EventBus):
  └── Eventos de dominio (DeviceStopped, DeviceReady, etc.)

Timer REACCIONA (via EventBus subscriptions):
  ├── Actualiza stores internos (timerState, ready, solves, stats, etc.)
  ├── Guarda en DB
  ├── Genera scrambles
  └── Emite eventos de salida (SolveAdded, NewRecord, etc.)
```

## Documents

- [events.md](events.md) - All event definitions
- [devices.md](devices.md) - Device binding, interfaces, XState, sequence diagrams
- [reactor.md](reactor.md) - Timer reactor pseudocode
- [sessions.md](sessions.md) - Session switching
- [solves.md](solves.md) - Solve CRUD
- [scramble.md](scramble.md) - ScrambleService, fallback system, preview images
- [settings.md](settings.md) - Session settings vs app config
- [state.md](state.md) - State management: EventBus vs $state vs context
- [migration.md](migration.md) - Migration order
