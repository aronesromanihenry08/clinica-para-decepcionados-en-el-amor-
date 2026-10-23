import { NextResponse } from "next/server";
import {
  getEvaluations,
  addEvaluation,
  updateEvaluationReview,
  advancePatientStage,
  addPatientSatisfaction,
  generateIntegrityHash,
  PatientEvaluation,
  JourneyStage,
  PatientSatisfaction
} from "@/lib/clinical-evaluations";
import { runClinicalAuditWithAI } from "@/lib/clinical-audit";

export async function GET() {
  return NextResponse.json({ evaluations: getEvaluations() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      answers: Record<string, string | number>;
      legalConsentAccepted: boolean;
      model?: string;
    };

    if (!body.answers || !body.legalConsentAccepted) {
      return NextResponse.json({ error: "Debe completar las preguntas requeridas y aceptar el consentimiento informado de ley." }, { status: 400 });
    }

    const patientName = String(body.answers.patient_name || "Paciente Anónimo");
    const patientId = String(body.answers.patient_id || "S/D");
    const patientAge = Number(body.answers.patient_age || 30);
    const patientGender = String(body.answers.patient_gender || "No especificado");
    const timestamp = new Date().toISOString();

    // Generar Hash criptográfico anti-fraude y trazabilidad legal
    const integrityHash = generateIntegrityHash(patientId, timestamp, body.answers);

    // Ejecutar Auditoría Clínica y validación de coherencia con Ollama
    const { audit, triageLevel, triageColor } = await runClinicalAuditWithAI(body.answers, body.model);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newEvaluation: PatientEvaluation = {
      id: `MED-2026-${randomSuffix}`,
      patientName,
      patientId,
      patientAge,
      patientGender,
      createdAt: timestamp,
      answers: body.answers,
      legalConsentAccepted: body.legalConsentAccepted,
      integrityHash,
      triageLevel,
      triageColor,
      aiAudit: audit,
      doctorReviewed: false,
      currentStage: "triage",
      timeline: [
        {
          id: `evt-${Date.now()}`,
          stage: "triage",
          timestamp,
          actor: "Sistema IA",
          title: "Ingreso a Triaje Digital & Certificado SHA-256",
          description: `Evaluado bajo normativa legal con motor IA (${audit.auditedByModel}). Clasificación: ${triageLevel}.`
        }
      ]
    };

    addEvaluation(newEvaluation);

    return NextResponse.json({
      success: true,
      evaluation: newEvaluation,
      message: "Cuestionario clínico validado y registrado con éxito bajo normativa de auditoría médica."
    });
  } catch (error) {
    console.error("Error al registrar evaluación clínica", error);
    return NextResponse.json({ error: "Ocurrió un error al procesar y auditar la evaluación clínica." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      id: string;
      action?: "advanceStage" | "satisfaction" | "reviewNotes";
      newStage?: JourneyStage;
      stageData?: {
        doctorName?: string;
        clinicalNotes?: string;
        physicalExam?: string;
        prescriptions?: string[];
        instructions?: string;
        restDays?: number;
        dischargeCondition?: "Alta Médica Favorable" | "Alta en Observación" | "Referido a Especialista";
        epicrisisSummary?: string;
        followUpInstructions?: string;
      };
      satisfaction?: Omit<PatientSatisfaction, "submittedAt">;
      doctorNotes?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "ID de evaluación requerido" }, { status: 400 });
    }

    if (body.action === "advanceStage" && body.newStage) {
      const updated = advancePatientStage(body.id, body.newStage, body.stageData || {});
      if (!updated) {
        return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }
      return NextResponse.json({ success: true, evaluation: updated, message: `Etapa avanzada a: ${body.newStage}` });
    }

    if (body.action === "satisfaction" && body.satisfaction) {
      const updated = addPatientSatisfaction(body.id, body.satisfaction);
      if (!updated) {
        return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }
      return NextResponse.json({ success: true, evaluation: updated, message: "Encuesta de satisfacción registrada con éxito." });
    }

    // Default: actualización de notas del médico auditor
    const updated = updateEvaluationReview(body.id, body.doctorNotes);
    if (!updated) {
      return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true, evaluation: updated });
  } catch (error) {
    console.error("Error en PATCH /api/evaluations", error);
    return NextResponse.json({ error: "Error al actualizar la evaluación clínica" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { id: string; model?: string };
    const evals = getEvaluations();
    const item = evals.find((e) => e.id === body.id);
    if (!item) {
      return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
    }
    const modelToUse = body.model || "qwen2.5:3b";
    const { audit, triageLevel, triageColor } = await runClinicalAuditWithAI(item.answers, modelToUse);
    item.aiAudit = audit;
    item.triageLevel = triageLevel;
    item.triageColor = triageColor;
    return NextResponse.json({ success: true, evaluation: item });
  } catch (error) {
    console.error("Error al re-auditar", error);
    return NextResponse.json({ error: "Error al re-auditar la evaluación con IA" }, { status: 500 });
  }
}


