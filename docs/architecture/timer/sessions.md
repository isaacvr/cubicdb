# Session Switching

## Reglas

1. **No se puede cambiar de sesión mientras el timer no esté en CLEAN.**
   La UI debe bloquear el selector de sesiones cuando `timerState !== CLEAN`.
   Si por alguna razón se fuerza el cambio, el solve se cancela (`DeviceCancelled`).

2. **El device activo depende de la sesión.**
   Cada sesión tiene `settings.input` que indica el device preferido.
   Por defecto es Keyboard. La lista de devices disponibles para una sesión
   se filtra por compatibilidad (e.g., GAN iCarry no tiene sentido para 4x4).
   Al cambiar de sesión:
   - Si el device de la nueva sesión es **el mismo** que el actual → no se desconecta.
   - Si es **diferente** → desconectar el actual, conectar el nuevo.

3. **En sesiones "mixed", la configuración se persiste automáticamente.**
   Cuando el usuario cambia group/mode/filter en una sesión mixed,
   se guarda inmediatamente en `session.settings`.

4. **Eliminar la sesión activa**: ir a la primera sesión de la lista.
   Si no queda ninguna, crear una nueva vacía. (Preferiblemente, la eliminación
   ocurre desde la lista de sesiones, no desde el timer activo.)

5. **El scramble se mantiene si las configuraciones coinciden.**
   El scramble depende de: `mode`, `prob`, y potencialmente `group`.
   Si al cambiar de sesión todas estas configuraciones son idénticas,
   el scramble actual se conserva (no tiene sentido regenerar uno no usado).
   Si alguna difiere, se genera uno nuevo.

## Flujo: cambiar de sesión

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant D as Device
    participant DB

    U->>UI: selecciona sesión B

    alt timerState !== CLEAN
        UI->>UI: bloquea acción (botón deshabilitado)
    else timerState === CLEAN
        UI->>EB: SessionSwitched(prev=A, new=B)

        EB->>T: procesa SessionSwitched
        T->>T: guarda session A._id en config

        T->>DB: carga solves de sesión B
        DB-->>T: solves[]

        T->>T: allSolves = solves[], filtra por session B
        T->>T: stats = recalcula desde cero

        T->>T: resuelve mode/group/prob desde B.settings

        alt scramble config cambió (mode, prob, group)
            T->>T: genera nuevo scramble
            T->>EB: ScrambleGenerated
        else scramble config igual
            Note over T: mantiene scramble actual
        end

        alt device de sesión B !== device actual
            T->>D: disconnect() device actual
            T->>D: init(deviceContext) nuevo device
        else device es el mismo
            Note over T,D: mantiene device conectado
        end

        T->>EB: TimerStateChanged(CLEAN)
        T->>UI: actualiza todo
    end
```

## Flujo: crear nueva sesión

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant DB

    U->>UI: nombre, tipo, mode, steps
    UI->>DB: SessionController.addSession(...)
    DB-->>UI: nueva sesión con _id

    UI->>EB: SessionSwitched(prev=actual, new=nueva)
    Note over T: mismo flujo que cambiar de sesión
    Note over T: solves = [] (vacío), stats = inicial
```

## Flujo: eliminar sesión activa

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant EB as EventBus
    participant T as Timer
    participant DB

    U->>UI: eliminar sesión activa
    UI->>UI: confirmación (pendiente de implementar)
    UI->>DB: SessionController.removeSession(session)

    alt quedan sesiones
        UI->>EB: SessionSwitched(prev=eliminada, new=primera de la lista)
    else no quedan sesiones
        UI->>DB: SessionController.addSession(sesión vacía por defecto)
        UI->>EB: SessionSwitched(prev=eliminada, new=sesión nueva)
    end
```
