# Bocado Express: Centro de Comando IA para pedidos

Bocado Express es una empresa ficticia de comida rápida y Dominga es su asistente. El proyecto muestra cómo una conversación natural se transforma en un pedido estructurado y cómo un RAG aporta teoría y contexto recuperado al LLM.

## Qué incluye

- Front completo con marca, menú, promociones e ilustraciones SVG locales.
- Chat web con bienvenida y toma de pedidos.
- Catálogo único como fuente de verdad.
- Borrador de pedido que se actualiza durante la conversación.
- Validación de confirmación antes de registrar.
- Centro de Comando con métricas y pedidos recientes.
- **Modo demo** sin API key para que el taller no dependa de una cuenta externa.
- Selector de modelos Ollama para comparar cómo interactúan distintos LLM.
- RAG local para explicar LLM, prompts, validación, privacidad y arquitectura.
- API separada para conversar (`POST /api/chat`), modelos (`GET /api/models`), teoría (`GET /api/knowledge`) y pedidos (`GET|POST /api/orders`).
- Indicador de salud de Ollama (`GET /api/health`) y monitor visual del micrófono.
- Inventario didáctico en el navegador: registra el pedido y descuenta stock sin instalar una base de datos.

La arquitectura sigue el flujo:

```text
UI → API → Orquestador de conversación → Dominio (catálogo/pedido) → Store
```

## Ejecutar

Requiere Node.js 18.17 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Sin configuración adicional se iniciará en **Modo demo**.

## Usar Ollama local (recomendado para el taller)

Instala Ollama desde [ollama.com/download](https://ollama.com/download) y descarga el modelo:

```bash
ollama pull llama3.1:8b
```

Ollama debe estar ejecutándose. En Windows normalmente queda disponible en `http://127.0.0.1:11434`.

1. Copia `.env.example` como `.env.local`.
2. Configura:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.2:latest
```

3. Reinicia `npm run dev`.

Dominga llamará al modelo local mediante la API compatible con OpenAI. No necesitas API key, no se envían conversaciones a la nube y el navegador nunca recibe credenciales. En el front puedes cambiar entre los modelos instalados para comparar respuestas.

Para descargar otros modelos:

```bash
ollama pull llama3:8b
ollama pull llama3.2:3b
```

## Probar la voz

Usa Chrome o Edge y abre la aplicación en `http://localhost:3000`. Pulsa el botón 🎙️, acepta el permiso del micrófono y habla. El navegador convierte tu voz en texto; Ollama interpreta el pedido y Dominga responde por texto y voz. Si no aparece el permiso, revisa el icono de candado de la barra del navegador y permite el micrófono.

## Otros proveedores

Para NVIDIA API Catalog:

```env
AI_PROVIDER=nvidia
NVIDIA_API_KEY=tu_clave_nueva
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
```

La clave se obtiene en [NVIDIA API Catalog](https://build.nvidia.com/meta/llama-3_1-8b-instruct), usando **Get API Key**.

Para OpenAI, usa `AI_PROVIDER=openai`, `OPENAI_API_KEY` y `OPENAI_MODEL`.
Si no existe la configuración del proveedor seleccionado, la aplicación usa el motor demo determinista.

## Flujo recomendado para el taller

1. Escribe `Quiero un combo clásico`.
2. Agrega `una Inca Kola`.
3. Responde `Sí, confirmo`.
4. Pulsa **Registrar pedido en el Centro de Comando**.
5. Explica cómo la conversación terminó como una fila, total y estado.
6. Cambia el modelo en el selector y compara tono, precisión y velocidad.
7. Pregunta en **Teoría IA**: `¿Qué es un RAG?`.
8. Cambia el catálogo en `lib/catalog.ts` para convertirlo en una pizzería, cafetería o tienda de postres.

## Contenido del negocio y RAG

- `lib/business.ts`: identidad, horarios, delivery y pagos.
- `lib/catalog.ts`: productos y precios.
- `lib/promotions.ts`: promociones con condiciones.
- `lib/knowledge.ts`: documentos breves para recuperación RAG.
- `public/images/`: ilustraciones SVG locales del menú y promociones.

El RAG usa embeddings locales por lote de Ollama (`nomic-embed-text`) y similitud coseno sobre los documentos de `lib/knowledge.ts`. La API devuelve `source: "vector"` para mostrar que se usó recuperación semántica. Los embeddings se mantienen en caché durante la ejecución para que las preguntas siguientes sean rápidas. Si el modelo aún no está descargado, informa el fallback `source: "keyword"` para que el taller no se bloquee.

Descarga el modelo de embeddings:

```bash
ollama pull nomic-embed-text
```

Este modelo es independiente de `llama3.2:latest`: uno recupera contexto por significado y el otro genera la respuesta.

## Material para explicar el proyecto

La carpeta [`docs/`](./docs/) contiene una guía pedagógica que no participa en la ejecución:

- [`01-MAPA-DEL-PROYECTO.md`](./docs/01-MAPA-DEL-PROYECTO.md): carpetas y responsabilidades.
- [`02-RECORRIDO-DE-UN-PEDIDO.md`](./docs/02-RECORRIDO-DE-UN-PEDIDO.md): recorrido técnico de un mensaje.
- [`03-RAG-EXPLICADO.md`](./docs/03-RAG-EXPLICADO.md): explicación visual del RAG.
- [`04-GUIA-DEMO.md`](./docs/04-GUIA-DEMO.md): guion de taller y reto para alumnos.

## Siguiente nivel

El inventario de esta versión usa `localStorage`, por lo que permanece al recargar en el mismo navegador y equipo. Es intencional para el taller: no requiere VS Code, Copilot, SQLite ni un servidor de base de datos. Para producción, reemplaza `lib/store.ts` y el inventario del navegador por PostgreSQL/Supabase y añade autenticación, pagos y un canal como WhatsApp.
