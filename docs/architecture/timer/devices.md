# Devices

## Device Binding

Cómo se conecta un device al Timer.

```ts
import type { Readable } from 'svelte/store';

/**
 * Vista de solo lectura que el Timer provee al device.
 * El device puede leer estos valores pero no modificarlos.
 */
interface TimerReadonlyView {
  readonly scramble: Readable<string>;
  readonly state: Readable<TimerState>;
  readonly session: Readable<Session>;
}

/**
 * Contexto que recibe el device al inicializarse.
 * Reemplaza al actual InputContext.
 */
interface DeviceContext {
  /** Vista de solo lectura del Timer */
  timer: TimerReadonlyView;

  /** EventBus para emitir notificaciones al Timer */
  eventBus: IEventBus;

  /** Callback para actualizaciones de tiempo de alta frecuencia */
  onTimeUpdate: TimeUpdateCallback;

  /** ID único del device */
  deviceId: string;
}
```

## Interfaz base del Device

```ts
interface ITimerDevice {
  readonly type: string;
  readonly id: string;
  name: string;
  enabled: boolean;

  /** Inicializa el device con el contexto del Timer */
  init(context: DeviceContext): void;

  /** Desconecta el device y limpia recursos */
  disconnect(): void;

  /** Serialización para persistencia */
  toJSON(): Record<string, any>;
  fromJSON(config: Record<string, any>): void;
}

/** Devices que responden a eventos de teclado */
interface IKeyboardDevice extends ITimerDevice {
  keyUpHandler(ev: KeyboardEvent): void;
  keyDownHandler(ev: KeyboardEvent): void;
}

/** Devices que se conectan por Bluetooth */
interface IBluetoothDevice extends ITimerDevice {
  isConnected: boolean;
  connect(): Promise<void>;
}

/** Devices que usan audio (stackmat) */
interface IAudioDevice extends ITimerDevice {
  isConnected: boolean;
}
```

## Filtrado de devices por sesión

La lista de devices disponibles para una sesión se filtra por compatibilidad
entre el device y el tipo de puzzle/mode de la sesión.

```ts
/**
 * Determina si un device es compatible con una sesión.
 * Ejemplo: GAN iCarry solo es compatible con sesiones de 3x3.
 */
function isDeviceCompatible(device: ITimerDevice, session: Session): boolean {
  // Keyboard y Manual siempre son compatibles
  if (device.type === 'timer_keyboard' || device.type === 'manual_entry') return true;

  // Stackmat siempre compatible (mide tiempo, no el puzzle)
  if (device.type === 'stackmat') return true;

  // GAN iCarry: solo 3x3
  if (device.type === 'gan_icarry') {
    return session.settings.mode === '333' || session.settings.sessionType === 'mixed';
  }

  // Virtual keyboard: depende del puzzle soportado
  if (device.type === 'virtual_cube_keyboard') {
    return true; // por ahora
  }

  return true;
}
```

## Diagrama de estado: Keyboard Device (XState)

```mermaid
stateDiagram-v2
    [*] --> CLEAR

    CLEAR --> PREVENTION: Space keydown

    PREVENTION --> CLEAR: keyup (soltó antes de tiempo)
    PREVENTION --> CLEAR: Escape
    PREVENTION --> READY: 200ms / withoutPrevention

    state "has_inspection?" <<choice>>

    READY --> CLEAR: Escape
    READY --> has_inspection?: Space keyup ⬆
    has_inspection? --> INSPECTION: sí (hasInspection)
    has_inspection? --> RUNNING: no (emit GreenLight antes)

    INSPECTION --> CLEAR: Escape
    INSPECTION --> RUNNING: Space keydown ⬇ (emit GreenLight) + keyup ⬆
    INSPECTION --> DNF_STOP: countdown < -2s

    RUNNING --> STOPPED: Space keydown ⬇ (endedSteps)
    RUNNING --> PAUSE: P keydown
    RUNNING --> CLEAR: Escape

    PAUSE --> RUNNING: Space keydown ⬇
    PAUSE --> CLEAR: Escape

    DNF_STOP --> STOPPED: [auto]

    STOPPED --> PREVENTION: Space keydown ⬇
    STOPPED --> CLEAR: Escape
```

### Flag `ready` (green light) en el diagrama

El flag `ready=true` se activa por `DeviceGreenLight`, que se emite:
- **Sin inspección**: al entrar a READY (justo antes de RUNNING). El Space sigue presionado desde PREVENTION.
- **Con inspección**: al presionar Space keydown ⬇ **durante** INSPECTION. El usuario sostiene Space y al soltar (keyup ⬆) pasa a RUNNING.

En ambos casos, `ready=false` se desactiva al entrar a RUNNING o al cancelar con Escape.

## Diagramas de flujo por device

### Keyboard (sin inspección)

```mermaid
sequenceDiagram
    participant U as User
    participant KB as Keyboard (XState)
    participant EB as EventBus
    participant T as Timer
    participant UI

    U->>KB: Space keydown ⬇
    KB->>KB: CLEAR → PREVENTION
    KB->>EB: DeviceEnteredPrevention
    EB->>T: → timerState = PREVENTION
    T->>UI: muestra PREVENTION

    Note over KB: 200ms hold / withoutPrevention
    KB->>KB: PREVENTION → READY
    KB->>EB: DeviceReady
    EB->>T: crea solve

    Note over KB,T: Space sigue presionado (keydown) → green light
    KB->>EB: DeviceGreenLight
    EB->>T: → ready = true (green light)
    T->>UI: muestra green light

    U->>KB: Space keyup ⬆
    KB->>KB: READY → RUNNING
    KB->>KB: inicia performance.now() interno
    KB->>EB: DeviceStartedRunning
    KB-->>T: onTimeUpdate(t) [directo, ~100/s]
    EB->>T: → timerState = RUNNING, ready = false
    T->>UI: muestra cronómetro

    U->>KB: Space keydown ⬇
    KB->>KB: RUNNING → STOPPED
    KB->>KB: calcula tiempo final
    KB->>EB: DeviceStopped(time=12340)
    EB->>T: guarda solve, stats, scramble
    T->>EB: SolveAdded, ScrambleGenerated
    T->>UI: muestra resultado

    alt Escape en cualquier momento
        U->>KB: Escape keydown
        KB->>KB: → CLEAR
        KB->>EB: DeviceCancelled
        EB->>T: timerState = CLEAN, time = 0, ready = false
        T->>UI: tiempo = 0, estado inicial
    end
```

### Keyboard (con inspección)

```mermaid
sequenceDiagram
    participant U as User
    participant KB as Keyboard (XState)
    participant EB as EventBus
    participant T as Timer
    participant UI

    U->>KB: Space keydown ⬇
    KB->>KB: CLEAR → PREVENTION
    KB->>EB: DeviceEnteredPrevention
    EB->>T: → timerState = PREVENTION

    Note over KB: 200ms hold / withoutPrevention
    KB->>KB: PREVENTION → READY
    KB->>EB: DeviceReady
    EB->>T: crea solve

    U->>KB: Space keyup ⬆
    KB->>KB: READY → INSPECTION
    KB->>KB: inicia countdown 15s
    KB->>EB: DeviceStartedInspection
    KB-->>T: onTimeUpdate(countdown) [directo]
    T->>UI: muestra countdown

    Note over KB: Si countdown < 0
    KB->>EB: DevicePenaltyApplied(P2)

    Note over KB: Si countdown < -2s
    KB->>EB: DeviceDNF(fromInspection=true)
    KB->>KB: → STOPPED

    U->>KB: Space keydown ⬇ (durante inspección)
    Note over KB,T: El keydown activa green light
    KB->>EB: DeviceGreenLight
    EB->>T: → ready = true (green light)
    T->>UI: muestra green light

    U->>KB: Space keyup ⬆
    KB->>KB: INSPECTION → RUNNING
    KB->>EB: DeviceStartedRunning
    EB->>T: → ready = false
    KB-->>T: onTimeUpdate(t) [directo]
    T->>UI: muestra cronómetro

    U->>KB: Space keydown ⬇
    KB->>KB: RUNNING → STOPPED
    KB->>EB: DeviceStopped(time)

    alt Escape en cualquier momento
        U->>KB: Escape keydown
        KB->>KB: → CLEAR
        KB->>EB: DeviceCancelled
        EB->>T: timerState = CLEAN, time = 0, ready = false
        T->>UI: tiempo = 0, estado inicial
    end
```

### Stackmat

```mermaid
sequenceDiagram
    participant HW as Hardware
    participant SM as Stackmat (XState)
    participant EB as EventBus
    participant T as Timer

    HW->>SM: audio: on=true, running=true
    SM->>SM: DISCONNECTED → RUNNING
    SM->>EB: DeviceStartedRunning
    SM-->>T: onTimeUpdate(time_milli) [directo]

    HW->>SM: audio: running=false, time=12340
    SM->>SM: RUNNING → STOPPED
    SM->>EB: DeviceStopped(time=12340)

    HW->>SM: audio: time=0 (reset)
    SM->>SM: STOPPED → CLEAN
    SM->>EB: DeviceCancelled
    EB->>T: timerState = CLEAN, time = 0, ready = false
    SM->>EB: ScrambleRequested
```

### Manual entry

```mermaid
sequenceDiagram
    participant U as User
    participant MI as Manual Input
    participant EB as EventBus
    participant T as Timer

    U->>MI: escribe "12.34", presiona Enter
    MI->>MI: parsea → 12340ms
    MI->>EB: DeviceStopped(time=12340)
    EB->>T: guarda solve, stats, scramble
```

### Virtual cube

```mermaid
sequenceDiagram
    participant U as User
    participant VC as Virtual (XState)
    participant EB as EventBus
    participant T as Timer

    U->>VC: primer movimiento del cubo
    VC->>VC: CLEAR → RUNNING
    VC->>EB: DeviceStartedRunning
    VC-->>T: onTimeUpdate(t) [directo]

    U->>VC: cubo resuelto
    VC->>VC: RUNNING → STOPPED
    VC->>EB: DeviceStopped(time)

    alt Escape en cualquier momento
        U->>VC: Escape keydown
        VC->>VC: → CLEAR
        VC->>EB: DeviceCancelled
        EB->>T: timerState = CLEAN, time = 0, ready = false
        T->>UI: tiempo = 0, estado inicial
    end
```

### Cancel (cualquier device con teclado)

```mermaid
sequenceDiagram
    participant U as User
    participant D as Device
    participant EB as EventBus
    participant T as Timer
    participant UI

    Note over D: En cualquier estado (PREVENTION, INSPECTION, RUNNING, etc.)
    U->>D: Escape keydown
    D->>D: cualquier estado → CLEAR
    D->>EB: DeviceCancelled
    EB->>T: timerState = CLEAN, time = 0, ready = false, lastSolve = null
    T->>UI: muestra tiempo 0, sin solve activo
```

### Multi-step (n pasos)

```mermaid
sequenceDiagram
    participant U as User
    participant KB as Keyboard (XState)
    participant EB as EventBus
    participant T as Timer
    participant UI

    Note over KB,T: session.settings.sessionType = "multi-step", steps = n

    Note over KB: (prevención, ready, etc. igual que flujo normal)
    KB->>EB: DeviceStartedRunning
    EB->>T: → timerState = RUNNING
    T->>UI: muestra cronómetro (step 1 de n)

    U->>KB: Space keydown ⬇ (step 1 completado)
    KB->>KB: currentStep = 1, registra stepTime
    KB->>EB: DeviceStepCompleted(stepTime=3200, step=1)
    EB->>T: registra step 1
    T->>UI: muestra step 2 de n
    Note over KB: currentStep < n → sigue en RUNNING

    U->>KB: Space keydown ⬇ (step 2 completado)
    KB->>KB: currentStep = 2, registra stepTime
    KB->>EB: DeviceStepCompleted(stepTime=7450, step=2)
    EB->>T: registra step 2
    T->>UI: muestra step 3 de n
    Note over KB: currentStep < n → sigue en RUNNING

    Note over KB: ... (steps intermedios 3..n-1)

    U->>KB: Space keydown ⬇ (step n, último)
    KB->>KB: currentStep = n, endedSteps = true
    KB->>KB: RUNNING → STOPPED
    KB->>EB: DeviceStopped(time=15680, steps=[3200, 4250, ...])
    EB->>T: guarda solve con todos los steps, calcula stats, genera scramble
    T->>EB: SolveAdded, ScrambleGenerated
    T->>UI: muestra resultado con desglose por steps

    alt Escape en cualquier momento (durante steps)
        U->>KB: Escape keydown
        KB->>KB: → CLEAR
        KB->>EB: DeviceCancelled
        EB->>T: timerState = CLEAN, time = 0, ready = false
        T->>UI: tiempo = 0, estado inicial, descarta steps parciales
    end
```
