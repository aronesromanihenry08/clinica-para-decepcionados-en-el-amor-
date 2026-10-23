# Mapa de Bocado Express

## La idea en una frase

Bocado Express es una tienda de comida rápida. Dominga conversa con el cliente, consulta el contexto del negocio, construye un pedido y solo lo registra cuando el cliente lo confirma.

## Estructura por responsabilidad

```text
IC_2/
├── app/                 # Interfaz web y endpoints HTTP de Next.js
│   ├── page.tsx         # Página completa del taller
│   ├── globals.css      # Diseño visual
│   └── api/             # Puertas de entrada del backend
│       ├── chat/        # Conversación con el LLM
│       ├── health/      # Estado de Ollama
│       ├── knowledge/   # Consulta del RAG
│       ├── models/      # Modelos instalados en Ollama
│       └── orders/      # Crear y listar pedidos
├── lib/                 # Reglas y datos del negocio
│   ├── business.ts      # Identidad, horario, delivery y pagos
│   ├── catalog.ts       # Productos y precios
│   ├── promotions.ts    # Promociones
│   ├── knowledge.ts     # Documentos y recuperación RAG
│   ├── conversation.ts  # Orquestación del LLM
│   ├── orders.ts        # Tipos y cálculos de pedidos
│   └── store.ts         # Persistencia temporal en memoria
├── public/images/       # Imágenes locales del negocio
├── .env.local           # Configuración local; nunca se comparte
└── README.md            # Instalación y operación
```

## Cómo leerlo en clase

Explica las carpetas en este orden:

1. `lib/business.ts`: quién es la empresa.
2. `lib/catalog.ts`: qué vende y cuánto cuesta.
3. `lib/promotions.ts`: qué ofertas conoce.
4. `app/page.tsx`: qué ve y hace el cliente.
5. `app/api/chat/route.ts`: cómo llega un mensaje al servidor.
6. `lib/conversation.ts`: cómo se arma el contexto y se llama al LLM.
7. `lib/orders.ts`: cómo una conversación se convierte en datos.
8. `app/api/orders/route.ts`: cómo se registra el pedido.
9. `lib/knowledge.ts`: cómo funciona el RAG de teoría.

## Regla de diseño

```text
El LLM interpreta lenguaje.
El código valida precios, productos, promociones y confirmaciones.
```

El modelo nunca debe ser la fuente final de precios ni registrar un pedido por sí solo.
