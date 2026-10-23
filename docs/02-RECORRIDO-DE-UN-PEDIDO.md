# Recorrido de un pedido

## 1. El cliente inicia

El navegador ejecuta `sendMessage()` desde `app/page.tsx`.

```text
"Quiero un combo clásico"
```

La interfaz envía:

```json
{
  "messages": [
    { "role": "user", "content": "Quiero un combo clásico" }
  ],
  "draft": {
    "lines": [],
    "fulfillment": "Recojo en tienda"
  }
}
```

## 2. La API recibe

`app/api/chat/route.ts` valida el cuerpo y llama a `handleConversation()`.

## 3. Se construye el contexto

`lib/conversation.ts` combina:

- Identidad de Bocado Express.
- Catálogo.
- Promociones.
- Pedido actual.
- Documentos recuperados por RAG.
- Historial de conversación.

## 4. Ollama interpreta

El modelo seleccionado recibe instrucciones para devolver:

```json
{
  "reply": "Perfecto...",
  "readyToConfirm": false,
  "draft": {
    "fulfillment": "Recojo en tienda",
    "lines": []
  }
}
```

## 5. El servidor valida

El servidor calcula el total con `lib/orders.ts`. No confía en un total escrito por el modelo.

## 6. El cliente confirma

Dominga muestra el resumen. El botón de registro aparece únicamente después de una confirmación explícita.

## 7. Se registra

`POST /api/orders` crea un pedido y `lib/store.ts` lo guarda temporalmente.

## Diagrama

```text
Cliente
  ↓
page.tsx
  ↓
POST /api/chat
  ↓
conversation.ts
  ├── business.ts
  ├── catalog.ts
  ├── promotions.ts
  ├── knowledge.ts (RAG)
  └── Ollama
  ↓
Pedido estructurado
  ↓
Confirmación humana
  ↓
POST /api/orders → store.ts
```
