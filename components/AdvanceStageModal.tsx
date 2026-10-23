"use client";

import React, { useState } from "react";
import type { PatientEvaluation, JourneyStage } from "@/lib/clinical-evaluations";

interface AdvanceStageModalProps {
  evaluation: PatientEvaluation;
  doctorName: string;
  onClose: () => void;
  onSuccess: (updated: PatientEvaluation) => void;
}

export default function AdvanceStageModal({
  evaluation,
  doctorName,
  onClose,
  onSuccess,
}: AdvanceStageModalProps) {
  // Próxima etapa sugerida
  const nextStageMap: Record<JourneyStage, JourneyStage> = {
    triage: "consultation",
    consultation: "treatment",
    treatment: "discharge",
    discharge: "discharge",
  };

  const [targetStage, setTargetStage] = useState<JourneyStage>(
    nextStageMap[evaluation.currentStage] || "consultation"
  );

  // Campos para Consulta
  const [physicalExam, setPhysicalExam] = useState(
    evaluation.consultationDetails?.physicalExam ||
      "Paciente consciente, orientado en tiempo y espacio. Signos vitales estables. Ruidos respiratorios normales."
  );
  const [clinicalNotes, setClinicalNotes] = useState(
    evaluation.consultationDetails?.clinicalNotes ||
      evaluation.doctorNotes ||
      `Atención presencial realizada. Diagnóstico confirmado en base a sintomatología.`
  );

  // Campos para Tratamiento
  const [prescriptionInput, setPrescriptionInput] = useState(
    (evaluation.treatmentDetails?.prescriptions || []).join("\n") ||
      "Paracetamol 500mg cada 8 horas por 3 días (si hay dolor o fiebre)\nSales de rehidratación oral"
  );
  const [instructions, setInstructions] = useState(
    evaluation.treatmentDetails?.instructions ||
      "Ingesta abundante de líquidos, reposo y acudir a emergencia si presenta banderas rojas."
  );
  const [restDays, setRestDays] = useState(evaluation.treatmentDetails?.restDays || 2);

  // Campos para Alta Médica
  const [dischargeCondition, setDischargeCondition] = useState<
    "Alta Médica Favorable" | "Alta en Observación" | "Referido a Especialista"
  >(evaluation.dischargeDetails?.dischargeCondition || "Alta Médica Favorable");
  const [epicrisisSummary, setEpicrisisSummary] = useState(
    evaluation.dischargeDetails?.epicrisisSummary ||
      "Paciente evaluado y tratado oportunamente. Cede cuadro agudo, evolución clínica favorable sin signos de alarma al egreso."
  );
  const [followUpInstructions, setFollowUpInstructions] = useState(
    evaluation.dischargeDetails?.followUpInstructions ||
      "Control ambulatorio en 7 días si los síntomas persisten. Cumplir esquema de medicación."
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const prescriptionsArray = prescriptionInput
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const stageData = {
        doctorName,
        physicalExam,
        clinicalNotes,
        prescriptions: prescriptionsArray,
        instructions,
        restDays: Number(restDays),
        dischargeCondition,
        epicrisisSummary,
        followUpInstructions,
      };

      const res = await fetch("/api/evaluations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: evaluation.id,
          action: "advanceStage",
          newStage: targetStage,
          stageData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar la etapa del paciente");

      onSuccess(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el cambio de etapa");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="advance-stage-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="advance-modal-header">
          <div>
            <span className="advance-badge">🩺 Gestión Asistencial en Tiempo Real</span>
            <h3>Avanzar Etapa Hospitalaria</h3>
            <small style={{ color: "var(--slate)" }}>
              Paciente: <b>{evaluation.patientName}</b> (DNI: {evaluation.patientId}) · Expediente: {evaluation.id}
            </small>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="modal-error-box">{error}</div>}

        <form onSubmit={handleSubmit} className="advance-stage-form">
          {/* Selector de Etapa Destino */}
          <div className="stage-selector-block">
            <label>
              <b>Seleccionar Etapa a Avanzar:</b>
            </label>
            <div className="stage-options-grid">
              <button
                type="button"
                className={`stage-opt-btn ${targetStage === "consultation" ? "active" : ""}`}
                onClick={() => setTargetStage("consultation")}
              >
                <span className="opt-icon">🩺</span>
                <strong>2. Consulta Médica</strong>
                <small>Examen clínico y anamnesis</small>
              </button>

              <button
                type="button"
                className={`stage-opt-btn ${targetStage === "treatment" ? "active" : ""}`}
                onClick={() => setTargetStage("treatment")}
              >
                <span className="opt-icon">💊</span>
                <strong>3. Tratamiento</strong>
                <small>Receta y farmacoterapia</small>
              </button>

              <button
                type="button"
                className={`stage-opt-btn ${targetStage === "discharge" ? "active" : ""}`}
                onClick={() => setTargetStage("discharge")}
              >
                <span className="opt-icon">🏥</span>
                <strong>4. Alta Médica</strong>
                <small>Epicrisis y egreso formal</small>
              </button>
            </div>
          </div>

          {/* Formulario condicional según etapa destino */}
          {targetStage === "consultation" && (
            <div className="stage-fields-box">
              <h4 style={{ color: "#4f46e5" }}>Datos de la Consulta Médica</h4>
              <div className="form-group">
                <label>Hallazgos al Examen Físico</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={physicalExam}
                  onChange={(e) => setPhysicalExam(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Notas de Evolución y Diagnóstico Médico</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {targetStage === "treatment" && (
            <div className="stage-fields-box">
              <h4 style={{ color: "#d97706" }}>Plan Terapéutico y Farmacológico</h4>
              <div className="form-group">
                <label>Medicamentos y Dosis Prescritas (uno por línea)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Ej. Paracetamol 500mg cada 8 horas..."
                  value={prescriptionInput}
                  onChange={(e) => setPrescriptionInput(e.target.value)}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "12px" }}>
                <div className="form-group">
                  <label>Instrucciones y Cuidados Generales</label>
                  <input
                    className="form-input"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Descanso Médico</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    className="form-input"
                    value={restDays}
                    onChange={(e) => setRestDays(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {targetStage === "discharge" && (
            <div className="stage-fields-box">
              <h4 style={{ color: "#059669" }}>Epicrisis y Alta Hospitalaria</h4>
              <div className="form-group">
                <label>Condición al Egreso</label>
                <select
                  className="form-select"
                  value={dischargeCondition}
                  onChange={(e) =>
                    setDischargeCondition(
                      e.target.value as "Alta Médica Favorable" | "Alta en Observación" | "Referido a Especialista"
                    )
                  }
                >
                  <option value="Alta Médica Favorable">Alta Médica Favorable (Curado / Controlado)</option>
                  <option value="Alta en Observación">Alta en Observación Domiciliaria</option>
                  <option value="Referido a Especialista">Referido a Especialista / Consulta Externa</option>
                </select>
              </div>
              <div className="form-group">
                <label>Resumen de Epicrisis</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={epicrisisSummary}
                  onChange={(e) => setEpicrisisSummary(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Recomendaciones y Signos de Alarma para Casa</label>
                <input
                  className="form-input"
                  value={followUpInstructions}
                  onChange={(e) => setFollowUpInstructions(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="advance-modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="advance-submit-btn" disabled={submitting}>
              {submitting ? "Actualizando estado..." : `Confirmar y Registrar Avance a ${targetStage.toUpperCase()} ↗`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
