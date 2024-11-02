export async function handle({ event, resolve }) {
  try {
    return await resolve(event);
  } catch (error) {
    console.error("Error en el servidor:", error);

    return {
      status: error.status || 500,
      body: {
        message: error.message,
        stack: error.stack, // Incluye la pila de errores para detalles adicionales
      },
    };
  }
}

export async function handleError({ event, error }) {
  return error.stack;
}
