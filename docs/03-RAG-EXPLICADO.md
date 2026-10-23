# RAG explicado para el taller

## ¿Qué problema resuelve?

Un modelo general no conoce automáticamente la teoría específica del taller. El RAG le entrega los fragmentos relevantes antes de responder.

## Las tres etapas

```text
Retrieve  → recuperar documentos relevantes
Augment   → agregar esos documentos al contexto
Generate  → generar la respuesta con el LLM
```

## En este proyecto

1. `lib/knowledge.ts` contiene documentos pequeños y controlados.
2. `nomic-embed-text` convierte la pregunta y los documentos en vectores.
3. Se calcula similitud coseno.
4. Se seleccionan los tres documentos más cercanos.
5. `conversation.ts` entrega esos documentos a `llama3.2:latest`.

```text
Pregunta: ¿Qué es un RAG?
        ↓
Embedding de la pregunta
        ↓
Comparación con documentos
        ↓
Documento: ¿Qué es RAG?
        ↓
Respuesta de Dominga
```

## Dos modelos, dos trabajos

| Modelo | Responsabilidad |
|---|---|
| `nomic-embed-text` | Buscar contexto por significado |
| `llama3.2:latest` | Conversar y redactar la respuesta |

## Actividad para alumnos

1. Abrir `lib/knowledge.ts`.
2. Agregar una entrada sobre privacidad.
3. Preguntar por esa teoría en el front.
4. Observar que el contexto recuperado cambia.

## Qué no es RAG

RAG no entrena ni modifica el modelo. Solo le proporciona información relevante en el momento de responder.
