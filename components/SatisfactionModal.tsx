"use client";

import React, { useState } from "react";
import type { PatientEvaluation } from "@/lib/clinical-evaluations";

interface SatisfactionModalProps {
  evaluation: PatientEvaluation;
  onClose: () => void;
  onSuccess: (updated: PatientEvaluation) => void;
}

export default function SatisfactionModal({
  evaluation,
  onClose,
  onSuccess,
}: SatisfactionModalProps) {
  const [overallRating, setOverallRating] = useState(5);
  const [medicalCareRating, setMedicalCareRating] = useState(5);
  const [waitingTimeRating, setWaitingTimeRating] = useState(4);
  const [clarityRating, setClarityRating] = useState(5);
  const [comment, setComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<"SI" | "TAL_VEZ" | "NO">("SI");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/evaluations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: evaluation.id,
          action: "satisfaction",
          satisfaction: {
            overallRating,
            medicalCareRating,
            waitingTimeRating,
            clarityRating,
            comment,
            wouldRecommend,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar la evaluación");

      onSuccess(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la encuesta");
    } finally {
      setSubmitting(false);
    }
  }

  function renderStars(current: number, onChange: (v: number) => void) {
    return (
      <div className="star-rating-selector">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= current ? "active" : ""}`}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        ))}
        <span className="star-score-text">{current} / 5</span>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="satisfaction-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="satisfaction-modal-header">
          <div className="satisfaction-header-badge">⭐ Encuesta de Calidad & Egreso</div>
          <h3>Satisfacción de Atención Médica</h3>
          <p>
            Estimado(a) <b>{evaluation.patientName}</b>, su opinión nos ayuda a mejorar continuamente el servicio
            hospitalario y auditar el trato de nuestro equipo médico.
          </p>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="modal-error-box">{error}</div>}

        <form onSubmit={handleSubmit} className="satisfaction-form">
          {/* Calificación General */}
          <div className="satisfaction-question-row">
            <label>
              <strong>1. Calificación General de su Atención *</strong>
              <small>¿Cómo califica su experiencia integral en el hospital?</small>
            </label>
            {renderStars(overallRating, setOverallRating)}
          </div>

          {/* Criterios específicos */}
          <div className="criteria-grid">
            <div className="criteria-card">
              <label>Atención del Personal Médico</label>
              {renderStars(medicalCareRating, setMedicalCareRating)}
            </div>

            <div className="criteria-card">
              <label>Tiempo de Espera y Celeridad</label>
              {renderStars(waitingTimeRating, setWaitingTimeRating)}
            </div>

            <div className="criteria-card">
              <label>Claridad de Explicaciones y Receta</label>
              {renderStars(clarityRating, setClarityRating)}
            </div>
          </div>

          {/* Comentarios y sugerencias */}
          <div className="form-group" style={{ marginTop: "16px" }}>
            <label>
              <strong>2. Comentarios, Testimonio o Sugerencias de Mejora</strong>
              <small>Escriba aquí sus observaciones sobre los médicos, enfermería o la orientación de la IA:</small>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Ej. Me sentí muy bien atendido, la Dra. Sofía me orientó oportunamente y el Dr. Valdivia resolvió todas mis dudas..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Recomendación */}
          <div className="form-group">
            <label>
              <strong>3. ¿Recomendaría nuestro servicio de salud a familiares o amigos?</strong>
            </label>
            <div className="recommend-toggle-row">
              <button
                type="button"
                className={`recommend-btn ${wouldRecommend === "SI" ? "selected-yes" : ""}`}
                onClick={() => setWouldRecommend("SI")}
              >
                ✓ Sí, totalmente
              </button>
              <button
                type="button"
                className={`recommend-btn ${wouldRecommend === "TAL_VEZ" ? "selected-maybe" : ""}`}
                onClick={() => setWouldRecommend("TAL_VEZ")}
              >
                〰 Tal vez
              </button>
              <button
                type="button"
                className={`recommend-btn ${wouldRecommend === "NO" ? "selected-no" : ""}`}
                onClick={() => setWouldRecommend("NO")}
              >
                ✗ No por ahora
              </button>
            </div>
          </div>

          <div className="satisfaction-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="submit-survey-btn" disabled={submitting}>
              {submitting ? "Guardando opinión..." : "Enviar Comentarios de Satisfacción ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
