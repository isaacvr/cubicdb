# Migration Order

1. Crear `TimerEvents.ts` con todos los eventos definidos en [events.md](events.md).
2. Crear `TimerReactor` que suscriba el Timer a los eventos de input.
3. Migrar **Keyboard** device: reemplazar manipulación directa de stores por emisión de eventos + onTimeUpdate callback.
4. Migrar **Manual** device.
5. Migrar **Stackmat** device.
6. Migrar **Virtual** device.
7. Migrar **GAN** device.
8. Eliminar `InputContext` viejo.
9. Eliminar `Emitter` viejo.
10. Separar TimerController en sub-servicios si se desea (ScrambleService, StatsService, CelebrationService).
