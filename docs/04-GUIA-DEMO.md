# Guion de demo para 90 minutos

## Antes del taller

```powershell
ollama list
ollama pull nomic-embed-text
cd C:\Users\Cesar\Documents\IC_2
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Demo 1: negocio

Mostrar el hero, el menú y las promociones. Preguntar:

```text
¿Qué tienen en el menú?
¿Qué promoción tienen para el domingo?
¿Qué me recomiendas para dos personas?
```

## Demo 2: comparar modelos

1. Cambiar el modelo en el selector.
2. Hacer la misma pregunta.
3. Comparar velocidad, claridad y seguimiento de instrucciones.

No presentar un modelo como "correcto" solo por responder más largo. Evaluar precisión y utilidad.

## Demo 3: crear un pedido

```text
Quiero el combo universitario.
Agrega una Inca Kola.
Sí, confirmo.
```

Mostrar que:

- El pedido se construye progresivamente.
- El total se calcula en la aplicación.
- El registro requiere confirmación.

## Demo 4: teoría RAG

Preguntar:

```text
¿Qué es un RAG?
¿Qué es un LLM?
¿Por qué validar con código?
```

Explicar que el modelo no responde desde una memoria mágica: primero recibe contexto recuperado.

## Reto de 15 minutos

Cada grupo debe:

1. Agregar un producto al catálogo.
2. Crear una promoción.
3. Agregar una explicación a `lib/knowledge.ts`.
4. Preguntarle a Dominga por el nuevo contenido.

## Mensaje final

```text
La IA conversa.
El RAG aporta contexto.
El código protege las reglas del negocio.
La persona confirma las acciones importantes.
```
