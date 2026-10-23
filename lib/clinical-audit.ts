import OpenAI from "openai";
import { AIAuditReport, TriageLevel, TriageColor } from "./clinical-evaluations";

export async function runClinicalAuditWithAI(
  patientData: Record<string, string | number>,
  selectedModel?: string
): Promise<{ audit: AIAuditReport; triageLevel: TriageLevel; triageColor: TriageColor }> {
  const model = selectedModel || process.env.OLLAMA_MODEL || "qwen2.5:3b";
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";

  // Evaluación determinista rápida para banderas rojas
  const pain = Number(patientData.pain_scale || 0);
  const chestPain = String(patientData.chest_pain || "").toLowerCase();
  const breathing = String(patientData.breathing_difficulty || "").toLowerCase();
  const consciousness = String(patientData.consciousness_loss || "").toLowerCase();
  const fever = String(patientData.fever_present || "").toLowerCase();
  const complaint = String(patientData.main_complaint || "").toLowerCase();

  const isEmergency =
    chestPain.includes("alerta") ||
    breathing.includes("alerta") ||
    consciousness.includes("alerta") ||
    pain >= 9;

  const isUrgent =
    pain >= 6 ||
    fever.includes("alta") ||
    breathing.includes("esfuerzo") ||
    chestPain.includes("molestia");

  let defaultTriage: TriageLevel = "NIVEL 4 - ATENCIÓN GENERAL";
  let defaultColor: TriageColor = "green";

  if (isEmergency) {
    defaultTriage = "NIVEL 1 - EMERGENCIA";
    defaultColor = "red";
  } else if (isUrgent) {
    defaultTriage = "NIVEL 2 - URGENCIA ALTA";
    defaultColor = "orange";
  } else if (pain >= 3 || fever.includes("leve")) {
    defaultTriage = "NIVEL 3 - URGENCIA MEDIA";
    defaultColor = "yellow";
  }

  // Detección heurística de contradicciones
  const heuristicContradictions: string[] = [];
  if (pain >= 8 && complaint.includes("no siento dolor")) {
    heuristicContradictions.push("Paciente declara no sentir dolor en el texto pero califica EVA 8-10.");
  }
  if (fever.includes("no presenta") && (complaint.includes("fiebre de 39") || complaint.includes("fiebre alta"))) {
    heuristicContradictions.push("Inconsistencia en registro térmico: reporta fiebre alta en narrativa pero selecciona 'No presenta fiebre'.");
  }

  // Si Ollama está disponible, ejecutamos la auditoría con IA
  try {
    const client = new OpenAI({
      apiKey: "ollama-local",
      baseURL: baseUrl
    });

    const systemPrompt = `Eres un Médico Auditor y Especialista en Triaje Clínico Forense.
Tu misión es auditar un cuestionario de salud completado por un paciente para un centro de salud.
Debes:
1. Analizar la coherencia clínica de las respuestas y detectar contradicciones o indicios de simulación/fraude.
2. Identificar Banderas Rojas (Red Flags) que pongan en riesgo vital al paciente.
3. Clasificar el nivel de triaje: "NIVEL 1 - EMERGENCIA", "NIVEL 2 - URGENCIA ALTA", "NIVEL 3 - URGENCIA MEDIA", o "NIVEL 4 - ATENCIÓN GENERAL".
4. Redactar un resumen clínico para el médico auditor, diagnóstico presuntivo y recomendaciones asistenciales.

DEBES responder EXCLUSIVAMENTE un objeto JSON válido con estas claves:
{
  "isConsistent": boolean,
  "fraudSuspicion": "BAJA" | "MEDIA" | "ALTA",
  "coherenceScore": number (0 a 100),
  "detectedContradictions": string[],
  "redFlags": string[],
  "presumptiveDiagnosis": string,
  "clinicalSummary": string,
  "doctorRecommendations": string,
  "suggestedTriageLevel": "NIVEL 1 - EMERGENCIA" | "NIVEL 2 - URGENCIA ALTA" | "NIVEL 3 - URGENCIA MEDIA" | "NIVEL 4 - ATENCIÓN GENERAL"
}`;

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Datos de la evaluación médica del paciente:\n${JSON.stringify(patientData, null, 2)}`
        }
      ]
    });

    const raw = completion.choices[0]?.message.content?.trim() ?? "{}";
    const cleanJson = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleanJson);

    let triageLevel: TriageLevel = parsed.suggestedTriageLevel || defaultTriage;
    let triageColor: TriageColor = defaultColor;
    if (triageLevel.includes("NIVEL 1")) triageColor = "red";
    else if (triageLevel.includes("NIVEL 2")) triageColor = "orange";
    else if (triageLevel.includes("NIVEL 3")) triageColor = "yellow";
    else triageColor = "green";

    const audit: AIAuditReport = {
      isConsistent: Boolean(parsed.isConsistent ?? (heuristicContradictions.length === 0)),
      fraudSuspicion: parsed.fraudSuspicion || (heuristicContradictions.length > 0 ? "ALTA" : "BAJA"),
      coherenceScore: typeof parsed.coherenceScore === "number" ? parsed.coherenceScore : (heuristicContradictions.length > 0 ? 50 : 95),
      detectedContradictions: Array.isArray(parsed.detectedContradictions) ? parsed.detectedContradictions : heuristicContradictions,
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : (isEmergency ? ["Signos clínicos de alta urgencia detectados"] : []),
      presumptiveDiagnosis: parsed.presumptiveDiagnosis || "Cuadro clínico a evaluar por médico tratante.",
      clinicalSummary: parsed.clinicalSummary || `Paciente de ${patientData.patient_age} años refiere: ${patientData.main_complaint}.`,
      doctorRecommendations: parsed.doctorRecommendations || "Realizar anamnesis presencial completa y examen físico.",
      auditedByModel: model,
      auditTimestamp: new Date().toISOString()
    };

    return { audit, triageLevel, triageColor };
  } catch (error) {
    console.warn("Auditoría con Ollama no disponible; usando motor de reglas clínicas.", error);

    const audit: AIAuditReport = {
      isConsistent: heuristicContradictions.length === 0,
      fraudSuspicion: heuristicContradictions.length > 0 ? "ALTA" : "BAJA",
      coherenceScore: heuristicContradictions.length > 0 ? 50 : 96,
      detectedContradictions: heuristicContradictions,
      redFlags: isEmergency ? ["Signos de alarma reportados en cuestionario"] : [],
      presumptiveDiagnosis: isEmergency ? "Cuadro urgente en estudio" : "Sintomatología clínica general",
      clinicalSummary: `Paciente de ${patientData.patient_age} años refiere: ${patientData.main_complaint}. Dolor EVA: ${pain}/10.`,
      doctorRecommendations: isEmergency ? "Prioridad inmediata para evaluación en tópico de urgencia." : "Atención médica regular.",
      auditedByModel: `${model} (reglas clínicas de respaldo)`,
      auditTimestamp: new Date().toISOString()
    };

    return { audit, triageLevel: defaultTriage, triageColor: defaultColor };
  }
}
