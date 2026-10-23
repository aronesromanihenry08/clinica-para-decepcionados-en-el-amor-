import OpenAI from "openai";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ConversationResult = {
  reply: string;
  suggestedAnswers?: Record<string, string | number>;
  mode: "ia" | "demo";
  modelUsed?: string;
};

const STANDARD_DEFLECTION_MESSAGE =
  "Como asistente clínica y orientadora de SaludAI, mi función es atender exclusivamente dudas sobre tu salud, síntomas clínicos y el llenado del cuestionario de triaje médico. Por favor, indícame qué molestia, dolor o síntoma físico estás experimentando para poder orientarte.";

// Diccionario léxico de términos médicos y de triaje válidos
const MEDICAL_KEYWORDS = [
  // Síntomas y signos
  "dolor", "dolores", "duele", "molestia", "molestias", "malestar", "ardor", "quema", "punzada",
  "inflamaci", "hinchaz", "pesadez", "presion", "presión", "opresion", "opresión", "pecho",
  "cabeza", "estomago", "estómago", "espalda", "cuello", "garganta", "brazo", "pierna", "articulaci",
  "muscular", "musculo", "músculo", "hueso", "artritis", "oido", "oído", "ojo", "ojos", "nariz",
  "boca", "diente", "muela", "dientes", "abdomen", "abdominal", "pelvis", "lumbar",
  "fiebre", "termica", "térmica", "temperatura", "escalofrio", "escalofrío", "sudor", "calentura",
  "vomit", "vómit", "nausea", "náusea", "diarrea", "colico", "cólico", "estrenim", "estreñim",
  "tos", "flema", "respir", "asfixia", "ahogo", "asma", "pulmon", "pulmón", "bronqu",
  "mareo", "desmay", "vertigo", "vértigo", "inconscien", "somnolen", "confusion", "confusión",
  "sangr", "hemorrag", "herida", "corte", "golpe", "trauma", "fractura", "luxaci", "hematoma", "moreton", "moretón",
  "alergia", "alergico", "alérgico", "roncha", "erupcion", "erupción", "picazon", "picazón", "comezon", "comezón",
  // Términos de triaje y asistenciales
  "triaje", "triage", "eva", "escala", "formulario", "cuestionario", "pregunta",
  "doctor", "doctora", "medico", "médico", "medica", "médica", "clinica", "clínica", "hospital",
  "urgencia", "emergencia", "prioridad", "auditor", "sofia", "sofía", "saludai", "salud",
  "medicamento", "medicina", "farmaco", "fármaco", "pastilla", "jarabe", "inyecci", "dosis",
  "receta", "alta", "consulta", "tratamiento", "diagnostico", "diagnóstico", "sintoma", "síntoma",
  "signos vitales", "oxigeno", "oxígeno", "saturacion", "saturación", "pulso", "cardi"
];

// Saludos y frases conversacionales introductorias permitidas
const CONVERSATIONAL_GREETINGS = [
  "hola", "buenos dias", "buenos días", "buenas tardes", "buenas noches",
  "ayuda", "necesito ayuda", "por favor ayudame", "por favor ayúdame",
  "que puedes hacer", "qué puedes hacer", "quien eres", "quién eres",
  "como funciona", "cómo funciona", "como lleno", "cómo lleno", "gracias"
];

// Triggers explícitos de materias estrictamente fuera de dominio
const OFF_TOPIC_EXPLICIT = [
  // Computación, código y programación
  "python", "javascript", "typescript", "c++", "c#", "java", "php", "html", "css", "sql", "react", "node",
  "script", "codigo", "código", "funcion", "función", "algoritmo", "programar", "programacion", "programación",
  "github", "terminal", "powershell", "linux", "windows", "bug", "hacker", "hackear", "compilar",
  // Entretenimiento, música, juegos
  "chiste", "chistes", "adivinanza", "poema", "poesia", "poesía", "cancion", "canción", "letra de",
  "cantante", "actor", "actriz", "pelicula", "película", "serie", "netflix", "anime", "manga",
  "videojuego", "playstation", "xbox", "nintendo", "dota", "fifa", "fortnite", "minecraft",
  "futbol", "fútbol", "partido", "gol", "messi", "ronaldo", "champions", "mundial", "copa libertadores",
  // Geografía, historia y política general
  "capital de", "quien descubrio", "quién descubrió", "en que ano", "en qué año", "guerra mundial",
  "batalla de", "independencia de", "presidente", "congreso", "elecciones", "politica", "política",
  "partido politico", "partido político", "ministro", "frontera", "continente", "poblacion de",
  // Cocina y recetas
  "receta", "recetas", "como cocino", "cómo cocino", "como preparo", "cómo preparo", "ingredientes",
  "ceviche", "lomo saltado", "arroz con pollo", "pizza", "hamburguesa", "torta", "pastel",
  // Matemáticas y tareas
  "calcula", "ecuacion", "ecuación", "integral", "derivada", "raiz cuadrada", "raíz cuadrada",
  "cuanto es", "cuánto es", "resuelve este problema", "haz mi tarea", "tarea de", "redacta un ensayo",
  // Finanzas y cripto
  "bitcoin", "btc", "criptomoneda", "dolar hoy", "dólar hoy", "invertir en", "bolsa de valores", "prestamo", "préstamo",
  // Bypass y Jailbreaks
  "olvida tus instrucciones", "ignora tus reglas", "actua como", "actúa como", "jailbreak", "dan mode",
  "simula ser", "modo desarrollador"
];

// Patrones sintácticos típicos de preguntas generales no médicas
const NON_MEDICAL_QUESTION_PATTERNS = [
  /^(cu[aá]l\s+es\s+(la|el|los|las)\s+(capital|moneda|pais|país|poblaci[oó]n|distancia|tamano|tamaño|color|velocidad|precio|significado))/i,
  /^(qui[eé]n\s+(es|fue|cre[oó]|invent[oó]|descubri[oó]|gan[oó]|pint[oó]|escribi[oó]))/i,
  /^(d[oó]nde\s+(queda|est[aá]|naci[oó]|se\s+encuentra|viven))/i,
  /^(cu[aá]ndo\s+(se\s+fund[oó]|naci[oó]|muri[oó]|termin[oó]|inici[oó]|fue))/i,
  /^(c[oó]mo\s+(se\s+dice|se\s+hace|se\s+prepara|se\s+cocina|reparar|cambiar\s+la|hackear))/i,
  /^(cu[aá]nto\s+(es|mide|pesa|cuesta|dura|vale))\b/i,
  /^(hazme|escribe|redacta|cu[eé]ntame|inventa|canta|expl[ií]came\s+qu[eé]\s+es)\s+(un|una|el|la|sobre)/i,
  /^(qu[eé]\s+opinas\s+de(l)?)\s+/i,
  /^(traduce|traducir)\b/i
];

/**
 * Validador de contexto asistencial médico y de triaje
 */
function isQueryAllowedInMedicalContext(query: string): boolean {
  const text = query.toLowerCase().trim();
  if (!text) return false;

  // 1. Detección inmediata de disparadores explícitos fuera de contexto
  if (OFF_TOPIC_EXPLICIT.some((trigger) => text.includes(trigger))) {
    return false;
  }

  // 2. Si contiene palabras clave clínicas o de triaje, es válida
  if (MEDICAL_KEYWORDS.some((kw) => text.includes(kw))) {
    return true;
  }

  // 3. Si es un saludo conversacional de orientación
  if (CONVERSATIONAL_GREETINGS.some((g) => text === g || text.startsWith(g + " ") || text.endsWith(" " + g))) {
    return true;
  }

  // 4. Si coincide con patrones de preguntas de cultura general o tareas
  if (NON_MEDICAL_QUESTION_PATTERNS.some((regex) => regex.test(text))) {
    return false;
  }

  // 5. Textos largos o interrogativos que no tienen ninguna referencia clínica
  if (text.length > 15) {
    return false;
  }

  return true;
}

const medicalSystemPrompt = `Eres la Dra. Sofía, Asistente Clínica y Orientadora Médica de SaludAI (Centro Hospitalario).

MISIÓN EXCLUSIVA:
Tu único rol es orientar a pacientes sobre sus síntomas de salud, malestares físicos, dudas sobre cómo completar el formulario de triaje médico (escala EVA de dolor, signos vitales, banderas rojas) y el funcionamiento asistencial de SaludAI.

REGLAS ESTRICTAS DE LIMITACIÓN DE DOMINIO (INVIOLABLES):
1. TEMA PERMITIDO ÚNICAMENTE:
   - Salud humana, síntomas físicos, orientación preliminar de triaje, escala de dolor EVA (0 a 10) y uso de la plataforma SaludAI.
2. TEMAS PROHIBIDOS:
   - Cualquier tema ajeno a la salud como programación, tecnología, política, geografía, historia, matemáticas, recetas de cocina, deportes, farándula, chistes, poesía o tareas escolares.
3. SI EL USUARIO CONSULTA ALGO FUERA DE CONTEXTO:
   - Tienes terminantemente prohibido responder a la pregunta ajena.
   - Responde cortésmente indicando que tu función es exclusivamente de orientación médica y triaje en SaludAI, e invítalo a describir sus síntomas de salud.
4. BANDERAS ROJAS Y SEGURIDAD VITAL:
   - Si el paciente describe banderas rojas críticas (dolor opresivo en el pecho que se irradia al brazo, asfixia en reposo o pérdida de consciencia), adviértele acudir de inmediato a shock trauma o llamar al servicio de emergencias médicas (106 / 117).
   - Recuerda que no reemplazas el diagnóstico definitivo del médico auditor presencial.`;

export async function handleMedicalConversation(
  messages: ChatMessage[],
  selectedModel?: string
): Promise<ConversationResult> {
  const model = selectedModel || process.env.OLLAMA_MODEL || "qwen2.5:3b";
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";

  const lastUserMsg = messages.at(-1)?.content?.trim() || "";

  // Capa 1: Filtro de seguridad semántico previo
  if (!isQueryAllowedInMedicalContext(lastUserMsg)) {
    return {
      reply: STANDARD_DEFLECTION_MESSAGE,
      mode: "ia",
      modelUsed: model
    };
  }

  try {
    const client = new OpenAI({
      apiKey: "ollama-local",
      baseURL: baseUrl
    });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: medicalSystemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content }))
      ]
    });

    let reply = completion.choices[0]?.message.content?.trim() || "Estoy aquí para ayudarte con tu evaluación médica. ¿Qué síntomas estás experimentando?";

    // Capa 2: Filtro de seguridad post-generación (Sanitización de código o desvíos)
    if (reply.includes("```") || reply.includes("def ") || reply.includes("function ") || reply.includes("import ")) {
      reply = STANDARD_DEFLECTION_MESSAGE;
    }

    return {
      reply,
      mode: "ia",
      modelUsed: model
    };
  } catch (error) {
    console.warn("Error en chat médico con Ollama, usando respuesta de contingencia", error);
    const lastUserLower = lastUserMsg.toLowerCase();

    let fallbackReply = "Estoy aquí para ayudarte a completar tu cuestionario médico de SaludAI. Puedes contarme qué síntomas sientes y con gusto te oriento.";
    if (lastUserLower.includes("dolor") || lastUserLower.includes("escala") || lastUserLower.includes("eva")) {
      fallbackReply = "La escala de dolor (EVA) va del 0 al 10: 1 a 3 es leve (molestia que permite hacer tareas), 4 a 6 es moderado (dificulta la concentración) y 7 a 10 es severo (intenso o incapacitante). ¿Cómo calificarías tu molestia?";
    } else if (lastUserLower.includes("pecho") || lastUserLower.includes("aire") || lastUserLower.includes("respirar")) {
      fallbackReply = "Si sientes dolor opresivo en el pecho o falta de aire en reposo, son signos de alarma que requieren atención inmediata. Por favor marca estas opciones en el cuestionario para que el médico auditor lo priorice de inmediato.";
    }

    return {
      reply: fallbackReply,
      mode: "demo",
      modelUsed: `${model} (asistencia local)`
    };
  }
}
