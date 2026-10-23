export type QuestionType = "text" | "number" | "select" | "scale" | "boolean";

export type SurveyQuestion = {
  id: string;
  category: "Datos Generales" | "Motivo de Consulta" | "Sintomatología" | "Antecedentes" | "Signos de Alarma";
  question: string;
  description?: string;
  type: QuestionType;
  options?: string[];
  min?: number;
  max?: number;
  required: boolean;
};

export const legalConsentText = `DECLARACIÓN JURADA Y CONSENTIMIENTO INFORMADO EN SALUD (Norma Técnica de Salud y Ley N° 29733 de Protección de Datos Personales):
1. Declaro bajo juramento que los datos y síntomas consignados en esta evaluación son fidedignos y verídicos.
2. Autorizo al centro médico y a los profesionales tratantes al tratamiento de mis datos de salud con fines exclusivos de triaje, auditoría médica y atención clínica.
3. Entiendo que esta autoevaluación y la asistencia de IA constituyen una herramienta preliminar de orientación y triaje, no reemplazando la consulta presencial de emergencia.
4. Todo intento de alteración o falsedad en las respuestas será registrado mediante hash de trazabilidad y sometido a verificación por el comité de auditoría médica.`;

export const clinicalQuestions: SurveyQuestion[] = [
  {
    id: "patient_name",
    category: "Datos Generales",
    question: "Nombres y Apellidos completos del paciente",
    description: "Tal como figuran en su documento de identidad",
    type: "text",
    required: true
  },
  {
    id: "patient_id",
    category: "Datos Generales",
    question: "Documento de Identidad (DNI / Pasaporte)",
    description: "Requerido para la trazabilidad y validez legal de la ficha clínica",
    type: "text",
    required: true
  },
  {
    id: "patient_age",
    category: "Datos Generales",
    question: "Edad del paciente",
    type: "number",
    min: 1,
    max: 120,
    required: true
  },
  {
    id: "patient_gender",
    category: "Datos Generales",
    question: "Sexo biológico",
    type: "select",
    options: ["Masculino", "Femenino", "Otro"],
    required: true
  },
  {
    id: "main_complaint",
    category: "Motivo de Consulta",
    question: "¿Cuál es el motivo principal de su consulta o malestar actual?",
    description: "Describa brevemente qué siente o qué le preocupa (puede ayudarse de la IA)",
    type: "text",
    required: true
  },
  {
    id: "symptom_duration",
    category: "Motivo de Consulta",
    question: "Tiempo de evolución de los síntomas",
    type: "select",
    options: ["Menos de 6 horas", "Entre 6 y 24 horas", "Entre 1 y 3 días", "Entre 4 y 7 días", "Más de 1 semana", "Más de 1 mes"],
    required: true
  },
  {
    id: "pain_scale",
    category: "Sintomatología",
    question: "Nivel de dolor actual en escala EVA (1 = leve, 10 = dolor insoportable)",
    type: "scale",
    min: 0,
    max: 10,
    required: true
  },
  {
    id: "fever_present",
    category: "Sintomatología",
    question: "¿Presenta fiebre o sensación febril comprobada?",
    type: "select",
    options: ["No presenta fiebre", "Fiebre leve (37.5°C - 38°C)", "Fiebre alta (más de 38.5°C)"],
    required: true
  },
  {
    id: "breathing_difficulty",
    category: "Signos de Alarma",
    question: "¿Tiene dificultad para respirar o sensación de falta de aire?",
    type: "select",
    options: ["No, respiración normal", "Leve al hacer esfuerzo", "Sí, incluso en reposo (ALERTA)"],
    required: true
  },
  {
    id: "chest_pain",
    category: "Signos de Alarma",
    question: "¿Presenta dolor u opresión en el pecho, cuello o brazo izquierdo?",
    type: "select",
    options: ["No", "Molestia leve ocasional", "Dolor opresivo intenso continuo (ALERTA)"],
    required: true
  },
  {
    id: "consciousness_loss",
    category: "Signos de Alarma",
    question: "¿Ha presentado desmayos, pérdida de conocimiento o desorientación?",
    type: "select",
    options: ["No", "Mareo o inestabilidad leve", "Sí, pérdida de conciencia o confusión (ALERTA)"],
    required: true
  },
  {
    id: "chronic_diseases",
    category: "Antecedentes",
    question: "¿Padece enfermedades crónicas preexistentes?",
    description: "Hipertensión, Diabetes, Asma, Cardiopatías, etc. (Especifique o marque 'Ninguna')",
    type: "text",
    required: true
  },
  {
    id: "current_medications",
    category: "Antecedentes",
    question: "¿Toma actualmente algún medicamento recetado o automedicado?",
    description: "Indique nombres o responda 'Ninguno'",
    type: "text",
    required: true
  },
  {
    id: "known_allergies",
    category: "Antecedentes",
    question: "¿Tiene alergias a medicamentos (penicilina, AINEs, etc.) o alimentos?",
    type: "text",
    required: true
  }
];
