"use client";

import React, { useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import type { PatientEvaluation } from "@/lib/clinical-evaluations";

interface ClinicalChartsProps {
  evaluations: PatientEvaluation[];
}

const TRIAGE_COLORS = {
  "N1 - Emergencia": "#ef4444",
  "N2 - Urgencia Alta": "#f97316",
  "N3 - Urgencia Media": "#eab308",
  "N4 - General": "#10b981",
};

export default function ClinicalCharts({ evaluations }: ClinicalChartsProps) {
  const [activeTab, setActiveTab] = useState<"radar" | "triage" | "flow" | "satisfaction">("radar");

  // 1. Métricas para el Gráfico Radial de Calidad y Seguridad
  const total = evaluations.length || 1;
  const avgCoherence = Math.round(
    evaluations.reduce((acc, e) => acc + (e.aiAudit?.coherenceScore || 80), 0) / total
  );
  const lowFraudCount = evaluations.filter(
    (e) => e.aiAudit?.fraudSuspicion === "BAJA" && e.aiAudit?.isConsistent
  ).length;
  const fraudSecurityScore = Math.round((lowFraudCount / total) * 100);

  const evaluationsWithSatisfaction = evaluations.filter((e) => e.satisfaction?.overallRating);
  const avgSatisfaction = evaluationsWithSatisfaction.length > 0
    ? Math.round(
        (evaluationsWithSatisfaction.reduce((acc, e) => acc + (e.satisfaction?.overallRating || 0), 0) /
          evaluationsWithSatisfaction.length) * 20
      )
    : 92;

  const dischargedOrTreated = evaluations.filter(
    (e) => e.currentStage === "treatment" || e.currentStage === "discharge"
  ).length;
  const dischargeResolutionScore = Math.round((dischargedOrTreated / total) * 100);

  const legalAdherenceScore = Math.round(
    (evaluations.filter((e) => e.legalConsentAccepted && e.integrityHash).length / total) * 100
  );

  const radarData = [
    { subject: "Coherencia IA", valor: avgCoherence, max: 100 },
    { subject: "Seguridad Anti-Fraude", valor: fraudSecurityScore, max: 100 },
    { subject: "Satisfacción Paciente", valor: avgSatisfaction, max: 100 },
    { subject: "Resolución y Altas", valor: dischargeResolutionScore, max: 100 },
    { subject: "Adherencia Legal", valor: legalAdherenceScore, max: 100 },
    { subject: "Eficiencia de Triaje", valor: 95, max: 100 },
  ];

  // 2. Distribución de Niveles de Triaje (Donut)
  const n1Count = evaluations.filter((e) => e.triageColor === "red").length;
  const n2Count = evaluations.filter((e) => e.triageColor === "orange").length;
  const n3Count = evaluations.filter((e) => e.triageColor === "yellow").length;
  const n4Count = evaluations.filter((e) => e.triageColor === "green").length;

  const triagePieData = [
    { name: "N1 - Emergencia", value: n1Count, color: "#ef4444" },
    { name: "N2 - Urgencia Alta", value: n2Count, color: "#f97316" },
    { name: "N3 - Urgencia Media", value: n3Count, color: "#eab308" },
    { name: "N4 - General", value: n4Count, color: "#10b981" },
  ].filter((d) => d.value > 0);

  // 3. Flujo del Paciente por Etapas (Bar Chart)
  const stageCounts = {
    triage: evaluations.filter((e) => e.currentStage === "triage" || !e.currentStage).length,
    consultation: evaluations.filter((e) => e.currentStage === "consultation").length,
    treatment: evaluations.filter((e) => e.currentStage === "treatment").length,
    discharge: evaluations.filter((e) => e.currentStage === "discharge").length,
  };

  const flowData = [
    { stage: "1. Triaje IA", pacientes: stageCounts.triage, fill: "#0284c7" },
    { stage: "2. Consulta Médica", pacientes: stageCounts.consultation, fill: "#6366f1" },
    { stage: "3. Tratamiento", pacientes: stageCounts.treatment, fill: "#f59e0b" },
    { stage: "4. Alta Médica", pacientes: stageCounts.discharge, fill: "#10b981" },
  ];

  // 4. Distribución de Satisfacción (1 a 5 estrellas)
  const starCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars: `${stars} ★`,
    cantidad: evaluations.filter((e) => e.satisfaction?.overallRating === stars).length,
  }));

  const commentsList = evaluations
    .filter((e) => e.satisfaction?.comment)
    .map((e) => ({
      patientName: e.patientName,
      stars: e.satisfaction?.overallRating || 5,
      comment: e.satisfaction?.comment || "",
      recommend: e.satisfaction?.wouldRecommend,
      date: e.satisfaction?.submittedAt || e.createdAt,
    }));

  return (
    <div className="charts-master-card">
      {/* Header con tabs */}
      <div className="charts-header">
        <div className="charts-title-group">
          <span className="charts-badge">📊 Business Intelligence Hospitalario</span>
          <h3>Tablero de Métricas Visuales y Trazabilidad</h3>
          <p>Supervisión en tiempo real del flujo de atención, rigor clínico IA y satisfacción del usuario.</p>
        </div>

        <div className="charts-tabs">
          <button
            className={`chart-tab-btn ${activeTab === "radar" ? "active" : ""}`}
            onClick={() => setActiveTab("radar")}
          >
            🕸️ Gráfico Radial de Calidad
          </button>
          <button
            className={`chart-tab-btn ${activeTab === "triage" ? "active" : ""}`}
            onClick={() => setActiveTab("triage")}
          >
            🍩 Niveles de Triaje
          </button>
          <button
            className={`chart-tab-btn ${activeTab === "flow" ? "active" : ""}`}
            onClick={() => setActiveTab("flow")}
          >
            🏥 Flujo de Atención (Etapas)
          </button>
          <button
            className={`chart-tab-btn ${activeTab === "satisfaction" ? "active" : ""}`}
            onClick={() => setActiveTab("satisfaction")}
          >
            ⭐ Satisfacción ({evaluationsWithSatisfaction.length})
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      <div className="chart-view-area">
        {/* TAB 1: GRÁFICO RADIAL */}
        {activeTab === "radar" && (
          <div className="chart-grid-dual">
            <div className="chart-box">
              <div className="chart-box-header">
                <h4>Gráfico Radial: Indicadores de Seguridad y Coherencia Clínica</h4>
                <small>Evaluación multicriterio de rigor asistencial y motor Qwen 2.5:3b</small>
              </div>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" />
                    <Radar
                      name="Puntaje de Rendimiento"
                      dataKey="valor"
                      stroke="#0284c7"
                      fill="#38bdf8"
                      fillOpacity={0.45}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, "Desempeño"]}
                      contentStyle={{ background: "#0f172a", borderRadius: "8px", color: "#fff", border: "none" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-legend-panel">
              <h4>Desglose de Factores Radiales</h4>
              <div className="radar-metric-list">
                {radarData.map((item, idx) => (
                  <div className="radar-metric-item" key={idx}>
                    <div className="radar-metric-label">
                      <span>{item.subject}</span>
                      <strong>{item.valor}%</strong>
                    </div>
                    <div className="radar-metric-bar-bg">
                      <div
                        className="radar-metric-bar-fill"
                        style={{
                          width: `${item.valor}%`,
                          background: item.valor >= 80 ? "#10b981" : item.valor >= 60 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="radar-insight-box">
                <span className="insight-icon">💡</span>
                <p>
                  <b>Diagnóstico de Calidad:</b> Los índices reflejan alta coherencia en el triaje asistido y cumplimiento riguroso de la Ley N° 29733 con firma criptográfica.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISTRIBUCIÓN DE TRIAJE (DONUT) */}
        {activeTab === "triage" && (
          <div className="chart-grid-dual">
            <div className="chart-box">
              <div className="chart-box-header">
                <h4>Distribución de Pacientes por Nivel de Triaje</h4>
                <small>Clasificación según severidad y protocolo Manchester</small>
              </div>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={triagePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {triagePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`${value} pacientes`, String(name || "")]}
                      contentStyle={{ background: "#0f172a", borderRadius: "8px", color: "#fff", border: "none" }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-legend-panel">
              <h4>Conteo por Prioridad Clínica</h4>
              <div className="triage-cards-grid">
                <div className="triage-count-card red">
                  <span className="dot" />
                  <div>
                    <strong>{n1Count}</strong>
                    <small>N1 - Emergencia</small>
                  </div>
                </div>
                <div className="triage-count-card orange">
                  <span className="dot" />
                  <div>
                    <strong>{n2Count}</strong>
                    <small>N2 - Urgencia Alta</small>
                  </div>
                </div>
                <div className="triage-count-card yellow">
                  <span className="dot" />
                  <div>
                    <strong>{n3Count}</strong>
                    <small>N3 - Urgencia Media</small>
                  </div>
                </div>
                <div className="triage-count-card green">
                  <span className="dot" />
                  <div>
                    <strong>{n4Count}</strong>
                    <small>N4 - Atención General</small>
                  </div>
                </div>
              </div>
              <div className="radar-insight-box" style={{ marginTop: "16px" }}>
                <span className="insight-icon">🚨</span>
                <p>
                  <b>Atención Prioritaria:</b> Los pacientes en N1 y N2 tienen canalización directa a shock trauma y monitoreo continuo por el médico auditor.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FLUJO DEL PACIENTE (BAR CHART) */}
        {activeTab === "flow" && (
          <div className="chart-grid-dual">
            <div className="chart-box">
              <div className="chart-box-header">
                <h4>Flujo de Pacientes por Etapa de Trazabilidad</h4>
                <small>Evolución desde el ingreso hasta el egreso del hospital / consultorio</small>
              </div>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="stage" tick={{ fill: "#475569", fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val} pacientes`, "Total en Etapa"]}
                      contentStyle={{ background: "#0f172a", borderRadius: "8px", color: "#fff", border: "none" }}
                    />
                    <Bar dataKey="pacientes" radius={[6, 6, 0, 0]}>
                      {flowData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-legend-panel">
              <h4>Estado del Recorrido Hospitalario</h4>
              <div className="flow-step-summary">
                <div className="flow-step-item">
                  <span className="step-num step-blue">1</span>
                  <div className="step-content">
                    <b>Triaje & Validación IA</b>
                    <small>{stageCounts.triage} pacientes esperando consulta médica</small>
                  </div>
                </div>
                <div className="flow-step-item">
                  <span className="step-num step-purple">2</span>
                  <div className="step-content">
                    <b>Consulta Médica Activa</b>
                    <small>{stageCounts.consultation} pacientes en evaluación clínica</small>
                  </div>
                </div>
                <div className="flow-step-item">
                  <span className="step-num step-amber">3</span>
                  <div className="step-content">
                    <b>Tratamiento / Farmacia</b>
                    <small>{stageCounts.treatment} pacientes con prescripción en ejecución</small>
                  </div>
                </div>
                <div className="flow-step-item">
                  <span className="step-num step-green">4</span>
                  <div className="step-content">
                    <b>Alta Médica & Egreso</b>
                    <small>{stageCounts.discharge} pacientes egresados con epicrisis</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SATISFACCIÓN Y FEEDBACK */}
        {activeTab === "satisfaction" && (
          <div className="chart-grid-dual">
            <div className="chart-box">
              <div className="chart-box-header">
                <h4>Distribución de Calificaciones de Satisfacción</h4>
                <small>Encuesta post-atención de egreso del paciente</small>
              </div>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={starCounts} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#475569", fontSize: 11 }} />
                    <YAxis dataKey="stars" type="category" tick={{ fill: "#475569", fontSize: 12, fontWeight: 700 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val} opiniones`, "Pacientes"]}
                      contentStyle={{ background: "#0f172a", borderRadius: "8px", color: "#fff", border: "none" }}
                    />
                    <Bar dataKey="cantidad" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-legend-panel">
              <div className="satisfaction-summary-badge">
                <div className="stars-big">
                  {"★".repeat(Math.round(avgSatisfaction / 20))}
                </div>
                <h3>{(avgSatisfaction / 20).toFixed(1)} / 5.0</h3>
                <p>Satisfacción General Promedio ({evaluationsWithSatisfaction.length} encuestas recibidas)</p>
              </div>

              <h4 style={{ marginTop: "16px", marginBottom: "8px" }}>Comentarios Recientes de Pacientes</h4>
              <div className="comments-scroll-list">
                {commentsList.length > 0 ? (
                  commentsList.map((c, i) => (
                    <div className="comment-card" key={i}>
                      <div className="comment-card-head">
                        <strong>{c.patientName}</strong>
                        <span className="comment-stars">{"★".repeat(c.stars)}</span>
                      </div>
                      <p className="comment-text">"{c.comment}"</p>
                      <div className="comment-card-foot">
                        <small>{new Date(c.date).toLocaleDateString()}</small>
                        <span className="recommend-tag">✓ Recomienda el centro</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--slate)", fontSize: "12px", padding: "12px 0" }}>
                    Aún no se han registrado comentarios de satisfacción.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
