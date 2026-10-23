"use client";

import React from "react";
import type { PatientEvaluation, JourneyStage } from "@/lib/clinical-evaluations";

interface TraceabilityTimelineProps {
  evaluation: PatientEvaluation;
  onOpenSatisfaction?: () => void;
  isAdminView?: boolean;
}

const STAGES: { key: JourneyStage; label: string; icon: string; description: string }[] = [
  { key: "triage", label: "Triaje Digital IA", icon: "📋", description: "Evaluación clínica inicial y hash SHA-256" },
  { key: "consultation", label: "Consulta Médica", icon: "🩺", description: "Atención presencial y anamnesis médica" },
  { key: "treatment", label: "Tratamiento", icon: "💊", description: "Prescripción de medicamentos e indicaciones" },
  { key: "discharge", label: "Alta Médica", icon: "🏥", description: "Egreso del hospital con epicrisis formal" },
];

const STAGE_ORDER: Record<JourneyStage, number> = {
  triage: 1,
  consultation: 2,
  treatment: 3,
  discharge: 4,
};

export default function TraceabilityTimeline({
  evaluation,
  onOpenSatisfaction,
  isAdminView = false,
}: TraceabilityTimelineProps) {
  const currentStageNum = STAGE_ORDER[evaluation.currentStage] || 1;
  const isDischarged = evaluation.currentStage === "discharge";
  const hasSatisfaction = !!evaluation.satisfaction;

  const stageBadgeColors: Record<JourneyStage, { bg: string; text: string; border: string }> = {
    triage: { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
    consultation: { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
    treatment: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    discharge: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  };

  const currentBadge = stageBadgeColors[evaluation.currentStage] || stageBadgeColors.triage;

  return (
    <div className="traceability-container">
      {/* Encabezado de Trazabilidad */}
      <div className="traceability-header">
        <div>
          <span className="traceability-kicker">Línea de Trazabilidad Hospitalaria en Tiempo Real</span>
          <h3>Recorrido Clínico del Paciente</h3>
          <small style={{ color: "var(--slate)" }}>
            Paciente: <b>{evaluation.patientName}</b> (DNI: {evaluation.patientId}) · Expediente: <b>{evaluation.id}</b>
          </small>
        </div>

        <div className="traceability-status-box" style={{ background: currentBadge.bg, borderColor: currentBadge.border }}>
          <small style={{ color: currentBadge.text, textTransform: "uppercase", fontWeight: 700 }}>
            Estado del Proceso
          </small>
          <strong style={{ color: currentBadge.text }}>
            {evaluation.currentStage === "triage" && "1. En Triaje / Espera"}
            {evaluation.currentStage === "consultation" && "2. En Consulta Médica"}
            {evaluation.currentStage === "treatment" && "3. En Tratamiento"}
            {evaluation.currentStage === "discharge" && "4. Alta Médica Otorgada"}
          </strong>
        </div>
      </div>

      {/* Stepper Visual de 4 Fases */}
      <div className="stepper-track">
        {STAGES.map((s, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStageNum;
          const isCurrent = stepNum === currentStageNum;
          const isFuture = stepNum > currentStageNum;

          return (
            <div
              key={s.key}
              className={`stepper-node ${isDone ? "completed" : ""} ${isCurrent ? "current" : ""} ${
                isFuture ? "future" : ""
              }`}
            >
              <div className="stepper-circle">
                {isDone ? "✓" : s.icon}
              </div>
              <div className="stepper-info">
                <span className="stepper-title">{s.label}</span>
                <span className="stepper-desc">{s.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner de Alta y Encuesta de Satisfacción (si aplica) */}
      {isDischarged && (
        <div className="discharge-banner-box">
          <div className="discharge-banner-content">
            <div className="discharge-icon">🎉</div>
            <div>
              <h4>¡Alta Médica Autorizada con Éxito!</h4>
              <p>
                {evaluation.dischargeDetails?.epicrisisSummary ||
                  "El paciente ha completado su proceso hospitalario y cuenta con el alta médica favorable."}
              </p>
              {evaluation.dischargeDetails?.followUpInstructions && (
                <small style={{ display: "block", marginTop: "4px", color: "#065f46" }}>
                  <b>Indicaciones de Egreso:</b> {evaluation.dischargeDetails.followUpInstructions}
                </small>
              )}
            </div>
          </div>

          {!isAdminView && onOpenSatisfaction && !hasSatisfaction && (
            <button className="satisfaction-cta-btn" onClick={onOpenSatisfaction}>
              ⭐ Dejar Comentarios y Calificar mi Atención
            </button>
          )}

          {hasSatisfaction && (
            <div className="satisfaction-completed-pill">
              <span>✓ Encuesta Completada ({evaluation.satisfaction?.overallRating}/5 ★)</span>
            </div>
          )}
        </div>
      )}

      {/* Timeline Cronológico de Eventos */}
      <div className="timeline-events-wrapper">
        <h4 className="timeline-section-title">
          <span>⏱️</span> Bitácora Cronológica de Eventos Auditados
        </h4>

        <div className="timeline-list">
          {evaluation.timeline && evaluation.timeline.length > 0 ? (
            evaluation.timeline.map((evt, idx) => {
              const actorColors: Record<string, string> = {
                "Sistema IA": "#0284c7",
                "Médico Auditor": "#6366f1",
                "Paciente": "#10b981",
                "Enfermería / Farmacia": "#f59e0b",
              };
              const actorColor = actorColors[evt.actor] || "#475569";

              return (
                <div className="timeline-item" key={evt.id || idx}>
                  <div className="timeline-marker" style={{ borderColor: actorColor }} />
                  <div className="timeline-card">
                    <div className="timeline-card-header">
                      <div className="timeline-actor-row">
                        <span className="actor-badge" style={{ backgroundColor: `${actorColor}15`, color: actorColor }}>
                          {evt.actor}
                        </span>
                        <strong className="timeline-event-title">{evt.title}</strong>
                      </div>
                      <span className="timeline-timestamp">
                        {new Date(evt.timestamp).toLocaleString("es-PE", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="timeline-description">{evt.description}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ color: "var(--slate)", fontSize: "13px" }}>No hay eventos de trazabilidad registrados.</p>
          )}
        </div>
      </div>
    </div>
  );
}
