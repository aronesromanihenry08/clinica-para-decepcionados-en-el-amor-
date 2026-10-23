import crypto from "crypto";
import fs from "fs";
import path from "path";

export type TriageLevel = "NIVEL 1 - EMERGENCIA" | "NIVEL 2 - URGENCIA ALTA" | "NIVEL 3 - URGENCIA MEDIA" | "NIVEL 4 - ATENCIÓN GENERAL";
export type TriageColor = "red" | "orange" | "yellow" | "green";

export type JourneyStage = "triage" | "consultation" | "treatment" | "discharge";

export type TimelineEvent = {
  id: string;
  stage: JourneyStage;
  timestamp: string;
  actor: "Sistema IA" | "Médico Auditor" | "Paciente" | "Enfermería / Farmacia";
  title: string;
  description: string;
  badge?: string;
};

export type PatientSatisfaction = {
  overallRating: number; // 1 - 5
  medicalCareRating: number; // 1 - 5
  waitingTimeRating: number; // 1 - 5
  clarityRating: number; // 1 - 5
  comment: string;
  wouldRecommend: "SI" | "TAL_VEZ" | "NO";
  submittedAt: string;
};

export type AIAuditReport = {
  isConsistent: boolean;
  fraudSuspicion: "BAJA" | "MEDIA" | "ALTA";
  coherenceScore: number; // 0 - 100%
  detectedContradictions: string[];
  redFlags: string[];
  presumptiveDiagnosis: string;
  clinicalSummary: string;
  doctorRecommendations: string;
  auditedByModel: string;
  auditTimestamp: string;
};

export type PatientEvaluation = {
  id: string;
  patientName: string;
  patientId: string;
  patientAge: number;
  patientGender: string;
  createdAt: string;
  answers: Record<string, string | number>;
  legalConsentAccepted: boolean;
  integrityHash: string;
  triageLevel: TriageLevel;
  triageColor: TriageColor;
  aiAudit: AIAuditReport;
  doctorReviewed?: boolean;
  doctorNotes?: string;

  // ─── Proceso Completo del Paciente (Vida Real) ───────────────────────────
  currentStage: JourneyStage;
  consultationDetails?: {
    consultationDate?: string;
    doctorName?: string;
    physicalExam?: string;
    clinicalNotes?: string;
  };
  treatmentDetails?: {
    prescriptions?: string[];
    instructions?: string;
    restDays?: number;
    orderedBy?: string;
  };
  dischargeDetails?: {
    dischargeDate?: string;
    dischargeCondition?: "Alta Médica Favorable" | "Alta en Observación" | "Referido a Especialista";
    epicrisisSummary?: string;
    followUpInstructions?: string;
    dischargedBy?: string;
  };
  satisfaction?: PatientSatisfaction;
  timeline: TimelineEvent[];
};

// Generación de Hash Criptográfico para trazabilidad legal y anti-fraude
export function generateIntegrityHash(patientId: string, timestamp: string, answers: Record<string, unknown>): string {
  const payload = `${patientId}::${timestamp}::${JSON.stringify(answers)}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// ─── Persistencia en archivo JSON ───────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "evaluations.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Normalizar evaluaciones antiguas para asegurar compatibilidad con la nueva trazabilidad
function normalizeEvaluation(ev: PatientEvaluation): PatientEvaluation {
  if (!ev.currentStage) {
    ev.currentStage = ev.doctorReviewed ? "consultation" : "triage";
  }
  if (!ev.timeline || ev.timeline.length === 0) {
    ev.timeline = [
      {
        id: `evt-${Date.now()}-1`,
        stage: "triage",
        timestamp: ev.createdAt,
        actor: "Sistema IA",
        title: "Ingreso a Triaje Inteligente & Hash Legal",
        description: `Triaje clasificado como ${ev.triageLevel}. Validación anti-fraude y hash SHA-256 generado con Ollama (${ev.aiAudit?.auditedByModel || "qwen2.5:3b"}).`
      }
    ];
    if (ev.doctorReviewed) {
      ev.timeline.push({
        id: `evt-${Date.now()}-2`,
        stage: "consultation",
        timestamp: new Date().toISOString(),
        actor: "Médico Auditor",
        title: "Atención y Revisión Médica",
        description: ev.doctorNotes || "Evaluado clínicamente por el Dr. Valdivia."
      });
    }
  }
  return ev;
}

function readEvaluationsFromDisk(): PatientEvaluation[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(DATA_FILE)) {
      const initial = getInitialSampleEvaluations();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as PatientEvaluation[];
    const normalized = parsed.map(normalizeEvaluation);
    return normalized;
  } catch (err) {
    console.error("Error leyendo evaluaciones desde disco:", err);
    return getInitialSampleEvaluations();
  }
}

function writeEvaluationsToDisk(evaluations: PatientEvaluation[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(evaluations, null, 2), "utf-8");
  } catch (err) {
    console.error("Error guardando evaluaciones en disco:", err);
  }
}

function getInitialSampleEvaluations(): PatientEvaluation[] {
  return [
    {
      id: "MED-2026-0814",
      patientName: "Carlos Mendoza Ramos",
      patientId: "47891234",
      patientAge: 58,
      patientGender: "Masculino",
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      legalConsentAccepted: true,
      answers: {
        patient_name: "Carlos Mendoza Ramos",
        patient_id: "47891234",
        patient_age: 58,
        patient_gender: "Masculino",
        main_complaint: "Dolor intenso en el centro del pecho que se va hacia el brazo izquierdo",
        symptom_duration: "Menos de 6 horas",
        pain_scale: 9,
        fever_present: "No presenta fiebre",
        breathing_difficulty: "Sí, incluso en reposo (ALERTA)",
        chest_pain: "Dolor opresivo intenso continuo (ALERTA)",
        consciousness_loss: "Mareo o inestabilidad leve",
        chronic_diseases: "Hipertensión arterial diagnosticada hace 8 años",
        current_medications: "Losartán 50mg diario",
        known_allergies: "Ninguna conocida"
      },
      integrityHash: "a7f9c2e401b3d88e6a4b1c9028ef37184291849a9b0c2e3f4a5d6e7f8a9b0c1d",
      triageLevel: "NIVEL 1 - EMERGENCIA",
      triageColor: "red",
      aiAudit: {
        isConsistent: true,
        fraudSuspicion: "BAJA",
        coherenceScore: 98,
        detectedContradictions: [],
        redFlags: ["Dolor opresivo retroesternal irradiado a extremidad superior", "Disnea de reposo", "Antecedente de hipertensión con dolor EVA 9/10"],
        presumptiveDiagnosis: "Sospecha de Síndrome Coronario Agudo (SCA) / Angina inestable vs IAM",
        clinicalSummary: "Varón de 58 años con antecedente de hipertensión arterial. Cuadro de 3 horas de evolución con dolor precordial opresivo irradiado y disnea moderada en reposo. Escala EVA 9/10.",
        doctorRecommendations: "Prioridad 1 inmediata. Derivación inmediata a sala de reanimación/shock trauma. Realizar ECG de 12 derivaciones en <10 minutos y perfil de enzimas cardíacas (troponina).",
        auditedByModel: "qwen2.5:3b",
        auditTimestamp: new Date(Date.now() - 1000 * 60 * 178).toISOString()
      },
      doctorReviewed: true,
      doctorNotes: "Paciente ingresado a shock trauma. Se estabilizó hemodinámicamente. Enzimas negativas iniciales.",
      currentStage: "treatment",
      consultationDetails: {
        consultationDate: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
        doctorName: "Dr. Alejandro Valdivia (CMP 48291)",
        physicalExam: "PA: 155/95 mmHg, FC: 98 lpm, SatO2: 94%. Ruidos cardíacos rítmicos sin soplos.",
        clinicalNotes: "Se realiza electrocardiograma sin elevación del segmento ST. Se indica observación cardiológica."
      },
      treatmentDetails: {
        prescriptions: ["Aspirina 100mg VO", "Clopidogrel 75mg VO", "Atorvastatina 40mg VO", "Oxígeno por cánula binasal 2L/min"],
        instructions: "Monitoreo continuo de signos vitales cada 30 minutos y repetición de troponinas en 3 horas.",
        restDays: 7,
        orderedBy: "Dr. Alejandro Valdivia"
      },
      timeline: [
        {
          id: "evt-814-1",
          stage: "triage",
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          actor: "Sistema IA",
          title: "Triaje Clínico de Emergencia (Ollama qwen2.5:3b)",
          description: "Clasificación como NIVEL 1 - EMERGENCIA. Sello criptográfico SHA-256 registrado en sistema."
        },
        {
          id: "evt-814-2",
          stage: "consultation",
          timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
          actor: "Médico Auditor",
          title: "Consulta Médica Inmediata",
          description: "Atendido por Dr. Valdivia en Shock Trauma. ECG completado y sospecha de SCA manejada según protocolo."
        },
        {
          id: "evt-814-3",
          stage: "treatment",
          timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
          actor: "Enfermería / Farmacia",
          title: "Inicio de Tratamiento y Farmacoterapia",
          description: "Administración de antiagregantes y monitoreo continuo de parámetros hemodinámicos."
        }
      ]
    },
    {
      id: "MED-2026-0815",
      patientName: "Lucía Paredes Silva",
      patientId: "72654321",
      patientAge: 29,
      patientGender: "Femenino",
      createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      legalConsentAccepted: true,
      answers: {
        patient_name: "Lucía Paredes Silva",
        patient_id: "72654321",
        patient_age: 29,
        patient_gender: "Femenino",
        main_complaint: "Dolor punzante de garganta y malestar general",
        symptom_duration: "Entre 1 y 3 días",
        pain_scale: 4,
        fever_present: "Fiebre leve (37.5°C - 38°C)",
        breathing_difficulty: "No, respiración normal",
        chest_pain: "No",
        consciousness_loss: "No",
        chronic_diseases: "Ninguna",
        current_medications: "Paracetamol 500mg cada 8 horas",
        known_allergies: "Alergia a la penicilina (produce urticaria)"
      },
      integrityHash: "c4b182ef38910a74d9e201b48f91048291a7c3b29401e8471b0294e7201b948a",
      triageLevel: "NIVEL 4 - ATENCIÓN GENERAL",
      triageColor: "green",
      aiAudit: {
        isConsistent: true,
        fraudSuspicion: "BAJA",
        coherenceScore: 95,
        detectedContradictions: [],
        redFlags: [],
        presumptiveDiagnosis: "Faringoamigdalitis aguda no complicada / Infección de vías respiratorias superiores",
        clinicalSummary: "Paciente femenina de 29 años con odinofagia de 48 horas de evolución, febrícula y dolor moderado EVA 4/10. Sin signos de compromiso respiratorio ni banderas rojas.",
        doctorRecommendations: "Atención ambulatoria estándar. Inspección orofaríngea. Recordar contraindicación estricta de betalactámicos por alergia confirmada a penicilina.",
        auditedByModel: "qwen2.5:3b",
        auditTimestamp: new Date(Date.now() - 1000 * 60 * 298).toISOString()
      },
      doctorReviewed: true,
      doctorNotes: "Evaluada por Dr. Valdivia. Faringitis viral. Se prescribió hidratación y analgésico no betalactámico.",
      currentStage: "discharge",
      consultationDetails: {
        consultationDate: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        doctorName: "Dr. Alejandro Valdivia (CMP 48291)",
        physicalExam: "Faringe hiperémica sin exudados purulentos. Cuello sin adenopatías dolorosas.",
        clinicalNotes: "Cuadro viral autolimitado. Se recalca no usar penicilinas ni derivados."
      },
      treatmentDetails: {
        prescriptions: ["Ibuprofeno 400mg cada 8 horas por 3 días", "Gárgaras con solución salina tibia"],
        instructions: "Reposo relativo por 48 horas e hidratación abundante (2.5L/día).",
        restDays: 2,
        orderedBy: "Dr. Alejandro Valdivia"
      },
      dischargeDetails: {
        dischargeDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        dischargeCondition: "Alta Médica Favorable",
        epicrisisSummary: "Paciente egresa con resolución favorable del cuadro febril y control del dolor.",
        followUpInstructions: "Signos de alarma explicados. Retornar si fiebre > 38.5°C o dificultad para deglutir.",
        dischargedBy: "Dr. Alejandro Valdivia"
      },
      satisfaction: {
        overallRating: 5,
        medicalCareRating: 5,
        waitingTimeRating: 4,
        clarityRating: 5,
        comment: "Excelente atención médica y rapidez. La Dra. Sofía me orientó perfectamente antes de entrar al consultorio y el doctor revisó mi alergia a la penicilina.",
        wouldRecommend: "SI",
        submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
      },
      timeline: [
        {
          id: "evt-815-1",
          stage: "triage",
          timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
          actor: "Sistema IA",
          title: "Triaje Asistido con IA",
          description: "Cuestionario completado y certificado con SHA-256. Alerta de alergia a Penicilina registrada."
        },
        {
          id: "evt-815-2",
          stage: "consultation",
          timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
          actor: "Médico Auditor",
          title: "Consulta Médica General",
          description: "Inspección orofaríngea realizada por Dr. Valdivia. Descarte de etiología bacteriana."
        },
        {
          id: "evt-815-3",
          stage: "treatment",
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          actor: "Enfermería / Farmacia",
          title: "Entrega de Medicación y Receta",
          description: "Dispensación de AINEs con advertencia de alergias verificada."
        },
        {
          id: "evt-815-4",
          stage: "discharge",
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          actor: "Médico Auditor",
          title: "Alta Médica y Salida del Consultorio",
          description: "Epicrisis emitida con indicación de descanso de 48 horas y recomendaciones."
        },
        {
          id: "evt-815-5",
          stage: "discharge",
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          actor: "Paciente",
          title: "Encuesta de Satisfacción Registrada",
          description: "Calificación 5/5 estrellas. Paciente recomienda el servicio ampliamente."
        }
      ]
    },
    {
      id: "MED-2026-0816",
      patientName: "Manuel Quispe Huamán",
      patientId: "10839201",
      patientAge: 44,
      patientGender: "Masculino",
      createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
      legalConsentAccepted: true,
      answers: {
        patient_name: "Manuel Quispe Huamán",
        patient_id: "10839201",
        patient_age: 44,
        patient_gender: "Masculino",
        main_complaint: "Dice no tener ningún dolor pero afirma que necesita descanso médico urgente por dolor insoportable",
        symptom_duration: "Menos de 6 horas",
        pain_scale: 10,
        fever_present: "No presenta fiebre",
        breathing_difficulty: "No, respiración normal",
        chest_pain: "No",
        consciousness_loss: "No",
        chronic_diseases: "Ninguna",
        current_medications: "Ninguno",
        known_allergies: "Ninguna"
      },
      integrityHash: "f1a8c9038b472e01a9471b29481029e8471b0928374019283740192837401928",
      triageLevel: "NIVEL 3 - URGENCIA MEDIA",
      triageColor: "yellow",
      aiAudit: {
        isConsistent: false,
        fraudSuspicion: "ALTA",
        coherenceScore: 42,
        detectedContradictions: [
          "Inconsistencia narrativa: Describe no sentir malestar pero marca escala máxima EVA 10/10.",
          "Solicitud explícita de descanso médico desproporcionada con la ausencia de signos objetivos reportados."
        ],
        redFlags: ["Posible simulación o inconsistencia en la anamnesis para obtención de licencia"],
        presumptiveDiagnosis: "Cuadro clínico indeterminado / Sospecha de inconsistencia o simulación de síntomas",
        clinicalSummary: "Paciente refiere requerimiento de justificación laboral. Discordancia severa entre motivo de consulta y escala de dolor declarada sin hallazgos objetivos.",
        doctorRecommendations: "Auditoría médica requerida. Examen físico presencial minucioso antes de emitir cualquier certificación legal o médica.",
        auditedByModel: "qwen2.5:3b",
        auditTimestamp: new Date(Date.now() - 1000 * 60 * 199).toISOString()
      },
      doctorReviewed: false,
      currentStage: "triage",
      timeline: [
        {
          id: "evt-816-1",
          stage: "triage",
          timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
          actor: "Sistema IA",
          title: "Triaje con Alerta de Inconsistencia (Ollama qwen2.5:3b)",
          description: "Discrepancia entre motivo y EVA 10/10. Marcado con bandera de auditoría médica prioritaria."
        }
      ]
    }
  ];
}

export function getEvaluations(): PatientEvaluation[] {
  return readEvaluationsFromDisk();
}

export function addEvaluation(evaluation: PatientEvaluation): PatientEvaluation {
  const evaluations = readEvaluationsFromDisk();
  // Asegurar que tenga stage y timeline inicial
  if (!evaluation.currentStage) evaluation.currentStage = "triage";
  if (!evaluation.timeline || evaluation.timeline.length === 0) {
    evaluation.timeline = [
      {
        id: `evt-${Date.now()}`,
        stage: "triage",
        timestamp: evaluation.createdAt,
        actor: "Sistema IA",
        title: "Ingreso a Triaje & Certificación Legal",
        description: `Triaje ${evaluation.triageLevel}. Validación anti-fraude completada por IA (${evaluation.aiAudit.auditedByModel}). Hash SHA-256 generado.`
      }
    ];
  }
  evaluations.unshift(evaluation);
  writeEvaluationsToDisk(evaluations);
  return evaluation;
}

export function updateEvaluationReview(id: string, notes?: string): PatientEvaluation | null {
  const evaluations = readEvaluationsFromDisk();
  const item = evaluations.find((e) => e.id === id);
  if (!item) return null;
  item.doctorReviewed = true;
  if (notes) item.doctorNotes = notes;
  writeEvaluationsToDisk(evaluations);
  return item;
}

// ─── Avanzar Etapa del Paciente (Trazabilidad Hospitalaria en Tiempo Real) ──
export function advancePatientStage(
  id: string,
  newStage: JourneyStage,
  data: {
    doctorName?: string;
    clinicalNotes?: string;
    physicalExam?: string;
    prescriptions?: string[];
    instructions?: string;
    restDays?: number;
    dischargeCondition?: "Alta Médica Favorable" | "Alta en Observación" | "Referido a Especialista";
    epicrisisSummary?: string;
    followUpInstructions?: string;
  }
): PatientEvaluation | null {
  const evaluations = readEvaluationsFromDisk();
  const item = evaluations.find((e) => e.id === id);
  if (!item) return null;

  const now = new Date().toISOString();
  item.currentStage = newStage;

  if (newStage === "consultation") {
    item.doctorReviewed = true;
    item.consultationDetails = {
      consultationDate: now,
      doctorName: data.doctorName || "Dr. Alejandro Valdivia (CMP 48291)",
      physicalExam: data.physicalExam || "Examen físico realizado. Signos vitales estables.",
      clinicalNotes: data.clinicalNotes || item.doctorNotes || "Consulta médica completada con anamnesis y evaluación."
    };
    if (data.clinicalNotes) item.doctorNotes = data.clinicalNotes;

    item.timeline.push({
      id: `evt-${Date.now()}`,
      stage: "consultation",
      timestamp: now,
      actor: "Médico Auditor",
      title: "Consulta Médica Presencial / Evaluación",
      description: item.consultationDetails.clinicalNotes || "Evaluación clínica realizada por el médico de turno."
    });
  } else if (newStage === "treatment") {
    item.treatmentDetails = {
      prescriptions: data.prescriptions || ["Medicación sintomática según protocolo institucional"],
      instructions: data.instructions || "Seguir indicaciones terapéuticas y reposo.",
      restDays: data.restDays || 1,
      orderedBy: data.doctorName || "Dr. Alejandro Valdivia"
    };

    item.timeline.push({
      id: `evt-${Date.now()}`,
      stage: "treatment",
      timestamp: now,
      actor: "Enfermería / Farmacia",
      title: "Prescripción de Tratamiento & Medicación",
      description: `Plan terapéutico indicado: ${(data.prescriptions || []).join(", ") || "Fármacos indicados"}. Reposo de ${item.treatmentDetails.restDays} días.`
    });
  } else if (newStage === "discharge") {
    item.dischargeDetails = {
      dischargeDate: now,
      dischargeCondition: data.dischargeCondition || "Alta Médica Favorable",
      epicrisisSummary: data.epicrisisSummary || "Paciente con evolución favorable, sin signos de alarma al egreso.",
      followUpInstructions: data.followUpInstructions || "Control por consultorio externo si reaparecen síntomas.",
      dischargedBy: data.doctorName || "Dr. Alejandro Valdivia"
    };

    item.timeline.push({
      id: `evt-${Date.now()}`,
      stage: "discharge",
      timestamp: now,
      actor: "Médico Auditor",
      title: "Alta Médica & Egreso del Hospital / Consultorio",
      description: `Epicrisis emitida: ${item.dischargeDetails.dischargeCondition}. Paciente autorizado para egreso seguro.`
    });
  }

  writeEvaluationsToDisk(evaluations);
  return item;
}

// ─── Registrar Encuesta de Satisfacción del Paciente ────────────────────────
export function addPatientSatisfaction(
  id: string,
  satisfaction: Omit<PatientSatisfaction, "submittedAt">
): PatientEvaluation | null {
  const evaluations = readEvaluationsFromDisk();
  const item = evaluations.find((e) => e.id === id);
  if (!item) return null;

  const now = new Date().toISOString();
  item.satisfaction = {
    ...satisfaction,
    submittedAt: now
  };

  item.timeline.push({
    id: `evt-${Date.now()}`,
    stage: item.currentStage,
    timestamp: now,
    actor: "Paciente",
    title: "Encuesta de Satisfacción y Feedback Registrada",
    description: `Calificación: ${satisfaction.overallRating}/5 estrellas. Comentario: "${satisfaction.comment || "Sin comentarios"}". Recomienda: ${satisfaction.wouldRecommend}.`
  });

  writeEvaluationsToDisk(evaluations);
  return item;
}

