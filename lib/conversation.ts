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

const medicalSystemPrompt = `Eres la Dra. Sofía, Asistente Clínica y Orientadora de Salud de SaludAI.
Tu labor es acompañar, orientar y asistir a pacientes y personas con problemas de salud mientras completan su Cuestionario de Triaje y Evaluación Médica.

Directrices éticas y legales:
1. Explica de forma empática, clara y comprensible los términos médicos y preguntas del cuestionario (ej. escala de dolor EVA del 1 al 10, banderas rojas, tiempo de evolución).
2. Si el paciente describe síntomas graves (dolor opresivo en el pecho, dificultad severa para respirar, desmayos, parálisis repentina), recomiéndale con urgencia acudir de inmediato al área de emergencias o marcar al número de urgencias médicas (106 / 117).
3. Ayuda al paciente a estructurar y describir sus síntomas con precisión para que el médico auditor pueda comprender claramente su cuadro.
4. Recuerda que esta interacción es un triaje preliminar y apoyo clínico regulado por la Ley de Salud y protección de datos, no un reemplazo de la consulta presencial definitiva.
5. Mantén un tono cálido, profesional, tranquilizador y riguroso. Responde siempre en español.`;

export async function handleMedicalConversation(
  messages: ChatMessage[],
  selectedModel?: string
): Promise<ConversationResult> {
  const model = selectedModel || process.env.OLLAMA_MODEL || "qwen2.5:3b";
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";

  try {
    const client = new OpenAI({
      apiKey: "ollama-local",
      baseURL: baseUrl
    });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: medicalSystemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content }))
      ]
    });

    const reply = completion.choices[0]?.message.content?.trim() || "Estoy aquí para ayudarte a completar tu evaluación médica. ¿Qué síntomas estás sintiendo?";
    return {
      reply,
      mode: "ia",
      modelUsed: model
    };
  } catch (error) {
    console.warn("Error en chat médico con Ollama, usando respuesta de contingencia", error);
    const lastUserMessage = messages.at(-1)?.content?.toLowerCase() ?? "";

    let fallbackReply = "Estoy aquí para ayudarte a completar tu cuestionario médico con precisión. Puedes contarme cómo te sientes y con gusto te oriento.";
    if (lastUserMessage.includes("dolor") || lastUserMessage.includes("escala") || lastUserMessage.includes("eva")) {
      fallbackReply = "La escala de dolor (EVA) va del 1 al 10: 1 a 3 es leve (molestia que permite hacer tareas), 4 a 6 es moderado (dificulta la concentración) y 7 a 10 es severo (intenso o incapacitante). ¿Cómo calificarías tu molestia?";
    } else if (lastUserMessage.includes("pecho") || lastUserMessage.includes("aire") || lastUserMessage.includes("respirar")) {
      fallbackReply = "Si sientes dolor opresivo en el pecho o falta de aire en reposo, son signos de alarma que requieren atención inmediata. Por favor marca estas opciones en el cuestionario para que el médico auditor lo priorice de inmediato.";
    }

    return {
      reply: fallbackReply,
      mode: "demo",
      modelUsed: `${model} (asistencia local)`
    };
  }
}
