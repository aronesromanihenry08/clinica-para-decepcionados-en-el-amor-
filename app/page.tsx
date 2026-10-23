"use client";

import { FormEvent, useEffect, useState } from "react";
import { clinicalQuestions, legalConsentText } from "@/lib/medical-survey";
import { PatientEvaluation, JourneyStage } from "@/lib/clinical-evaluations";
import { downloadPatientPDF } from "@/lib/pdf-generator";
import ClinicalCharts from "@/components/ClinicalCharts";
import TraceabilityTimeline from "@/components/TraceabilityTimeline";
import SatisfactionModal from "@/components/SatisfactionModal";
import AdvanceStageModal from "@/components/AdvanceStageModal";

type Message = { role: "user" | "assistant"; content: string; modelUsed?: string };
type DoctorSession = { name: string; cmp: string; role: string; hospital: string } | null;

export default function HealthPage() {
  // Estado de Navegación y Vistas
  const [view, setView] = useState<"patient" | "doctor">("patient");

  // Estado del Cuestionario del Paciente
  const [answers, setAnswers] = useState<Record<string, string | number>>({
    pain_scale: 0,
    fever_present: "No presenta fiebre",
    breathing_difficulty: "No, respiración normal",
    chest_pain: "No",
    consciousness_loss: "No",
    symptom_duration: "Entre 1 y 3 días",
    patient_gender: "Masculino"
  });
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);
  const [surveyResult, setSurveyResult] = useState<PatientEvaluation | null>(null);

  // Estado de Búsqueda de Trazabilidad en tiempo real (Portal Paciente)
  const [trackingDniInput, setTrackingDniInput] = useState("");
  const [trackedPatient, setTrackedPatient] = useState<PatientEvaluation | null>(null);

  // Modales de Ciclo Completo
  const [patientSatisfactionTarget, setPatientSatisfactionTarget] = useState<PatientEvaluation | null>(null);
  const [patientAdvanceTarget, setPatientAdvanceTarget] = useState<PatientEvaluation | null>(null);

  // Filtro de Etapas en el Dashboard
  const [stageFilter, setStageFilter] = useState<"all" | JourneyStage>("all");

  // Estado del Chat con la Asistente Médica (Dra. Sofía)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hola, soy la Dra. Sofía, tu asistente de orientación médica. Estoy aquí para acompañarte mientras completas tu cuestionario de triaje. ¿Qué síntomas o molestias estás experimentando?"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Modelos de Ollama
  const [model, setModel] = useState("qwen2.5:3b");
  const [models, setModels] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  // Estado de Autenticación del Doctor / Auditor
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUser, setLoginUser] = useState("doctor@salud.pe");
  const [loginPass, setLoginPass] = useState("medico2026");
  const [loginError, setLoginError] = useState("");
  const [doctorSession, setDoctorSession] = useState<DoctorSession>(null);

  // Estado del Dashboard Médico
  const [evaluations, setEvaluations] = useState<PatientEvaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<PatientEvaluation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorNotesInput, setDoctorNotesInput] = useState("");

  // Notificaciones Toast
  const [toast, setToast] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    // Cargar estado de Ollama y modelos
    void fetch("/api/health")
      .then((r) => r.json())
      .then((data: { connected: boolean; model?: string }) => {
        setConnected(data.connected);
        if (data.model) setModel(data.model);
      });

    void fetch("/api/models")
      .then((r) => r.json())
      .then((data: { models?: string[] }) => {
        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
      });

    // Cargar evaluaciones médicas
    loadEvaluations();
  }, []);

  // Recargar evaluaciones cuando el doctor accede al dashboard
  useEffect(() => {
    if (view === "doctor") {
      loadEvaluations();
    }
  }, [view]);

  function loadEvaluations() {
    void fetch("/api/evaluations")
      .then((r) => r.json())
      .then((data: { evaluations?: PatientEvaluation[] }) => {
        if (data.evaluations) setEvaluations(data.evaluations);
      });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Exportar ficha del paciente como PDF descargable (jsPDF)
  async function exportEvaluationToPDF(ev: typeof selectedEvaluation) {
    if (!ev) return;
    setExportingPDF(true);
    try {
      await downloadPatientPDF(ev);
      showToast(`PDF generado: SaludAI_Triaje_${ev.id}.pdf`);
    } catch (err) {
      showToast("Error al generar el PDF. Intente nuevamente.");
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  }

  // Enviar mensaje al asistente médico
  async function sendChatMessage(text: string) {
    if (!text.trim() || chatLoading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, model })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Error en el chat");
      setMessages([...next, { role: "assistant", content: data.reply, modelUsed: data.modelUsed || model }]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error al conectar con la Dra. Sofía");
    } finally {
      setChatLoading(false);
    }
  }

  // Enviar cuestionario clínico para auditoría con Ollama
  async function handleSubmitSurvey(e: FormEvent) {
    e.preventDefault();
    if (!consentAccepted) {
      showToast("Debe aceptar la declaración jurada y consentimiento informado de ley.");
      return;
    }

    if (!answers.patient_name || !answers.patient_id || !answers.main_complaint) {
      showToast("Por favor complete su nombre, documento de identidad y motivo de consulta.");
      return;
    }

    setSubmittingSurvey(true);
    try {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          legalConsentAccepted: consentAccepted,
          model
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Error al enviar la evaluación");

      setSurveyResult(data.evaluation);
      showToast("¡Evaluación auditada y registrada con éxito! El médico auditor ya tiene su ficha.");
      loadEvaluations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error al procesar la evaluación clínica.");
    } finally {
      setSubmittingSurvey(false);
    }
  }

  // Autenticación de Médico Auditor
  async function handleDoctorLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Acceso denegado");

      setDoctorSession(data.doctor);
      setShowLoginModal(false);
      setView("doctor");
      showToast(`Bienvenido Dr. ${data.doctor.name}. Panel de Auditoría Clínico desbloqueado.`);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Error de credenciales");
    }
  }

  // Guardar notas del doctor
  async function handleSaveDoctorNotes(id: string) {
    try {
      const res = await fetch("/api/evaluations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, doctorNotes: doctorNotesInput })
      });
      const data = await res.json();
      if (res.ok && data.evaluation) {
        setSelectedEvaluation(data.evaluation);
        loadEvaluations();
        showToast("Notas de auditoría médica guardadas con éxito.");
      }
    } catch {
      showToast("No se pudo guardar la nota de revisión.");
    }
  }

  const filteredEvaluations = evaluations.filter((ev) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      ev.patientName.toLowerCase().includes(query) ||
      ev.patientId.includes(query) ||
      ev.triageLevel.toLowerCase().includes(query) ||
      ev.id.toLowerCase().includes(query);
    const matchesStage = stageFilter === "all" || ev.currentStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="site">
      {/* Top Navbar */}
      <header className="med-nav">
        <a className="med-brand" href="#inicio" onClick={() => setView("patient")}>
          <div className="brand-cross">✚</div>
          <div className="brand-text">
            <strong>SaludAI</strong>
            <small>Triaje Clínico & Auditoría Médica</small>
          </div>
        </a>

        <div className="med-nav-links">
          <span className={`med-nav-link ${view === "patient" ? "active" : ""}`} onClick={() => setView("patient")}>
            Evaluación del Paciente
          </span>
          <span className="med-nav-link" onClick={() => document.getElementById("trazabilidad-paciente")?.scrollIntoView({ behavior: "smooth" })}>
            🔍 Trazabilidad de mi Atención
          </span>
          <span className="med-nav-link" onClick={() => document.getElementById("asistente")?.scrollIntoView({ behavior: "smooth" })}>
            Asistente Dra. Sofía
          </span>
          <span className="med-nav-link" onClick={() => document.getElementById("normativa")?.scrollIntoView({ behavior: "smooth" })}>
            Normativa Legal & Anti-Fraude
          </span>
        </div>

        <div className="med-nav-actions">
          {doctorSession ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                className={`doctor-portal-btn ${view === "doctor" ? "logged-in" : ""}`}
                onClick={() => setView(view === "doctor" ? "patient" : "doctor")}
              >
                🩺 {view === "doctor" ? "Vista Paciente" : "Dashboard Auditor"}
              </button>
              <button
                className="logout-btn"
                onClick={() => {
                  setDoctorSession(null);
                  setView("patient");
                  showToast("Sesión médica cerrada.");
                }}
              >
                Salir
              </button>
            </div>
          ) : (
            <button className="doctor-portal-btn" onClick={() => setShowLoginModal(true)}>
              🔒 Acceso Médico / Auditor
            </button>
          )}
        </div>
      </header>

      {/* Banner Legal & Certificación */}
      <div className="legal-bar" id="normativa">
        <b>⚖️ Ley N° 29733 de Protección de Datos en Salud & Norma Técnica de Triaje</b>
        <span>Validación de Veracidad con Hash Criptográfico SHA-256 · Motor de Auditoría: Ollama Local</span>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="med-toast">
          <span>ℹ️</span>
          <span>{toast}</span>
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 1: PACIENTES - CUESTIONARIO CLÍNICO Y ASISTENCIA CON IA */}
      {/* ============================================================== */}
      {view === "patient" && (
        <>
          <section className="health-hero" id="inicio">
            <div className="health-hero-content">
              <div className="hero-badge">
                <span>✦</span> Triaje Clínico Digital Asistido por Inteligencia Artificial
              </div>
              <h1>
                Evaluación de Salud y <span>Triaje Médico Seguro</span>
              </h1>
              <p>
                Complete su cuestionario de salud con orientación en vivo de nuestra asistente clínica IA.
                Todas sus respuestas son auditadas para garantizar su consistencia y asegurar la máxima prioridad según su nivel de urgencia.
              </p>
              <div className="hero-stats-row">
                <div className="hero-stat"><i>✓</i> Consentimiento Informado de Ley</div>
                <div className="hero-stat"><i>✓</i> Validación Anti-Fraude Automatizada</div>
                <div className="hero-stat"><i>✓</i> Conexión con Médico Auditor Colegiado</div>
              </div>
            </div>
          </section>

          <main className="main-workspace">
            <div className="workspace-grid">
              {/* Columna Izquierda: Cuestionario Clínico */}
              <div className="survey-card">
                <div className="survey-header">
                  <h2>Ficha de Triaje y Sintomatología Clínica</h2>
                  <p>Por favor responda con la mayor veracidad posible. La IA verificará la coherencia de sus datos clínicos.</p>
                </div>

                {surveyResult ? (
                  <div style={{ padding: "36px 32px" }}>
                    <div className={`audit-banner-summary ${surveyResult.triageColor}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                            Resultado del Triaje
                          </span>
                          <h3 style={{ margin: "4px 0", fontSize: "22px" }}>{surveyResult.triageLevel}</h3>
                          <p style={{ margin: 0, fontSize: "13px" }}>Paciente: <b>{surveyResult.patientName}</b> (DNI: {surveyResult.patientId})</p>
                        </div>
                        <span className={`triage-badge ${surveyResult.triageColor}`} style={{ fontSize: "14px", padding: "8px 16px" }}>
                          Prioridad {surveyResult.triageColor.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="audit-panel-box" style={{ marginBottom: "20px" }}>
                      <h4>Dictamen de Auditoría Clínica (Ollama)</h4>
                      <p><b>Diagnóstico Presuntivo Orientativo:</b> {surveyResult.aiAudit.presumptiveDiagnosis}</p>
                      <p style={{ marginTop: "8px" }}><b>Resumen Clínico:</b> {surveyResult.aiAudit.clinicalSummary}</p>
                      <p style={{ marginTop: "8px" }}><b>Recomendación Asistencial:</b> {surveyResult.aiAudit.doctorRecommendations}</p>
                    </div>

                    <div className="audit-panel-box" style={{ marginBottom: "24px" }}>
                      <h4>Certificado de Integridad y Trazabilidad Legal</h4>
                      <p style={{ fontSize: "12px", color: "var(--slate)" }}>
                        Registro legal inmutable protegido bajo la Ley de Salud. Las respuestas han sido selladas criptográficamente:
                      </p>
                      <div className="audit-hash-badge">
                        HASH SHA-256: {surveyResult.integrityHash}
                      </div>
                    </div>

                    {/* Línea de Trazabilidad en Tiempo Real del Paciente */}
                    <div style={{ margin: "24px 0" }}>
                      <TraceabilityTimeline
                        evaluation={surveyResult}
                        onOpenSatisfaction={() => setPatientSatisfactionTarget(surveyResult)}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
                      <button
                        className="export-pdf-btn"
                        disabled={exportingPDF}
                        onClick={() => void exportEvaluationToPDF(surveyResult)}
                      >
                        {exportingPDF ? "Generando..." : "📥 Descargar Ficha y Carnet PDF"}
                      </button>

                      <button
                        className="doctor-portal-btn"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", borderColor: "#f59e0b" }}
                        onClick={() => setPatientSatisfactionTarget(surveyResult)}
                      >
                        ⭐ {surveyResult.satisfaction ? "Ver mi Calificación" : "Calificar Atención y Dejar Comentarios"}
                      </button>

                      <button
                        className="submit-survey-btn"
                        style={{ flex: 1, minWidth: "200px" }}
                        onClick={() => {
                          setSurveyResult(null);
                          setConsentAccepted(false);
                        }}
                      >
                        Realizar otra evaluación clínica ↺
                      </button>
                    </div>
                  </div>
                ) : (
                  <form className="survey-form" onSubmit={handleSubmitSurvey}>
                    {/* Categoría: Datos Generales */}
                    <div className="category-block">
                      <div className="category-title">
                        <span>1</span> Datos de Filiación del Paciente
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
                        <div className="form-group">
                          <label>Nombres y Apellidos completos *</label>
                          <input
                            className="form-input"
                            required
                            placeholder="Ej. Juan Pérez Medina"
                            value={String(answers.patient_name || "")}
                            onChange={(e) => setAnswers({ ...answers, patient_name: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Documento de Identidad (DNI) *</label>
                          <input
                            className="form-input"
                            required
                            placeholder="Número de documento"
                            value={String(answers.patient_id || "")}
                            onChange={(e) => setAnswers({ ...answers, patient_id: e.target.value })}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div className="form-group">
                          <label>Edad del paciente *</label>
                          <input
                            className="form-input"
                            type="number"
                            required
                            min="1"
                            max="115"
                            placeholder="Años"
                            value={answers.patient_age ? Number(answers.patient_age) : ""}
                            onChange={(e) => setAnswers({ ...answers, patient_age: Number(e.target.value) })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Sexo biológico *</label>
                          <select
                            className="form-select"
                            value={String(answers.patient_gender || "Masculino")}
                            onChange={(e) => setAnswers({ ...answers, patient_gender: e.target.value })}
                          >
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Categoría: Motivo de Consulta y Síntomas */}
                    <div className="category-block">
                      <div className="category-title">
                        <span>2</span> Motivo de Consulta y Sintomatología
                      </div>
                      <div className="form-group">
                        <label>
                          ¿Cuál es el malestar o síntoma principal que presenta? *
                          <small>Describa qué siente, en qué zona y qué le impide hacer (puede pedirle apoyo a la Dra. Sofía a la derecha).</small>
                        </label>
                        <textarea
                          className="form-textarea"
                          rows={3}
                          required
                          placeholder="Ej. Siento un dolor punzante en la cabeza desde ayer y náuseas intensas..."
                          value={String(answers.main_complaint || "")}
                          onChange={(e) => setAnswers({ ...answers, main_complaint: e.target.value })}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div className="form-group">
                          <label>Tiempo de evolución *</label>
                          <select
                            className="form-select"
                            value={String(answers.symptom_duration || "")}
                            onChange={(e) => setAnswers({ ...answers, symptom_duration: e.target.value })}
                          >
                            <option value="Menos de 6 horas">Menos de 6 horas</option>
                            <option value="Entre 6 y 24 horas">Entre 6 y 24 horas</option>
                            <option value="Entre 1 y 3 días">Entre 1 y 3 días</option>
                            <option value="Entre 4 y 7 días">Entre 4 y 7 días</option>
                            <option value="Más de 1 semana">Más de 1 semana</option>
                            <option value="Más de 1 mes">Más de 1 mes</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Presencia de Fiebre *</label>
                          <select
                            className="form-select"
                            value={String(answers.fever_present || "")}
                            onChange={(e) => setAnswers({ ...answers, fever_present: e.target.value })}
                          >
                            <option value="No presenta fiebre">No presenta fiebre</option>
                            <option value="Fiebre leve (37.5°C - 38°C)">Fiebre leve (37.5°C - 38°C)</option>
                            <option value="Fiebre alta (más de 38.5°C)">Fiebre alta (más de 38.5°C)</option>
                          </select>
                        </div>
                      </div>

                      {/* Escala de Dolor EVA */}
                      <div className="form-group">
                        <label>
                          Escala Visual Analógica de Dolor (EVA) *
                          <small>Mueva el control según la severidad del dolor percibido actualmente.</small>
                        </label>
                        <div className="pain-scale-container">
                          <div className="pain-value-badge">
                            <span>
                              Intensidad:{" "}
                              <b>
                                {Number(answers.pain_scale) === 0
                                  ? "0 - Sin dolor"
                                  : Number(answers.pain_scale) <= 3
                                  ? `${answers.pain_scale} - Dolor Leve`
                                  : Number(answers.pain_scale) <= 6
                                  ? `${answers.pain_scale} - Dolor Moderado`
                                  : `${answers.pain_scale} - Dolor Severo / Intenso`}
                              </b>
                            </span>
                            <b>{answers.pain_scale} / 10</b>
                          </div>
                          <input
                            type="range"
                            className="pain-slider"
                            min="0"
                            max="10"
                            value={Number(answers.pain_scale || 0)}
                            onChange={(e) => setAnswers({ ...answers, pain_scale: Number(e.target.value) })}
                          />
                          <div className="pain-labels">
                            <span>0 (Sin dolor)</span>
                            <span>3 (Leve)</span>
                            <span>6 (Moderado)</span>
                            <span>10 (Insoportable)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Categoría: Banderas Rojas / Signos de Alarma */}
                    <div className="category-block">
                      <div className="category-title" style={{ color: "var(--rose)" }}>
                        <span>3</span> Banderas Rojas y Signos de Alarma
                      </div>
                      <div className="form-group">
                        <label>¿Dificultad respiratoria o falta de aire?</label>
                        <select
                          className="form-select"
                          value={String(answers.breathing_difficulty || "")}
                          onChange={(e) => setAnswers({ ...answers, breathing_difficulty: e.target.value })}
                        >
                          <option value="No, respiración normal">No, respiración normal</option>
                          <option value="Leve al hacer esfuerzo">Leve al hacer esfuerzo</option>
                          <option value="Sí, incluso en reposo (ALERTA)">Sí, incluso en reposo (ALERTA URGENTE)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>¿Dolor u opresión en el pecho / brazo izquierdo?</label>
                        <select
                          className="form-select"
                          value={String(answers.chest_pain || "")}
                          onChange={(e) => setAnswers({ ...answers, chest_pain: e.target.value })}
                        >
                          <option value="No">No</option>
                          <option value="Molestia leve ocasional">Molestia leve ocasional</option>
                          <option value="Dolor opresivo intenso continuo (ALERTA)">Dolor opresivo intenso continuo (ALERTA URGENTE)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>¿Pérdida de conciencia, desmayos o desorientación?</label>
                        <select
                          className="form-select"
                          value={String(answers.consciousness_loss || "")}
                          onChange={(e) => setAnswers({ ...answers, consciousness_loss: e.target.value })}
                        >
                          <option value="No">No</option>
                          <option value="Mareo o inestabilidad leve">Mareo o inestabilidad leve</option>
                          <option value="Sí, pérdida de conciencia o confusión (ALERTA)">Sí, pérdida de conciencia o confusión (ALERTA URGENTE)</option>
                        </select>
                      </div>
                    </div>

                    {/* Categoría: Antecedentes */}
                    <div className="category-block">
                      <div className="category-title">
                        <span>4</span> Antecedentes y Medicación
                      </div>
                      <div className="form-group">
                        <label>Enfermedades crónicas conocidas</label>
                        <input
                          className="form-input"
                          placeholder="Ej. Hipertensión, Diabetes, Asma (o marque 'Ninguna')"
                          value={String(answers.chronic_diseases || "")}
                          onChange={(e) => setAnswers({ ...answers, chronic_diseases: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Medicamentos que consume actualmente</label>
                        <input
                          className="form-input"
                          placeholder="Ej. Losartán 50mg, Paracetamol (o 'Ninguno')"
                          value={String(answers.current_medications || "")}
                          onChange={(e) => setAnswers({ ...answers, current_medications: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Alergias a fármacos o alimentos</label>
                        <input
                          className="form-input"
                          placeholder="Ej. Alergia a la Penicilina, AINEs (o 'Ninguna')"
                          value={String(answers.known_allergies || "")}
                          onChange={(e) => setAnswers({ ...answers, known_allergies: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Consentimiento Informado Legal */}
                    <div className="consent-box">
                      <div className="consent-text">{legalConsentText}</div>
                      <label className="consent-check-label">
                        <input
                          type="checkbox"
                          checked={consentAccepted}
                          onChange={(e) => setConsentAccepted(e.target.checked)}
                        />
                        Declaro bajo juramento que los datos ingresados son verídicos y acepto el consentimiento informado.
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="submit-survey-btn"
                      disabled={submittingSurvey || !consentAccepted}
                    >
                      {submittingSurvey ? "Validando y auditando con Ollama..." : "Enviar Cuestionario y Validar con IA ↗"}
                    </button>
                  </form>
                )}
              </div>

              {/* Columna Derecha: Asistente Clínico IA (Dra. Sofía) */}
              <div className="side-ai-panel" id="asistente">
                <div className="med-chat-card">
                  <div className="med-chat-head">
                    <div className="doctor-avatar-box">
                      <div className="doctor-avatar">⚕</div>
                      <div>
                        <strong>Dra. Sofía</strong>
                        <small>Orientadora Clínica IA</small>
                      </div>
                    </div>
                    <div className="med-model-indicator">
                      <span className="dot" />
                      <span>{model}</span>
                    </div>
                  </div>

                  <div className="med-chat-messages">
                    {messages.map((m, idx) => (
                      <div className={`med-message ${m.role}`} key={idx}>
                        <small>{m.role === "assistant" ? `DRA. SOFÍA (${m.modelUsed ?? model})` : "PACIENTE"}</small>
                        <p>{m.content}</p>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="med-message assistant">
                        <small>DRA. SOFÍA</small>
                        <p style={{ fontStyle: "italic", color: "var(--slate)" }}>Analizando tus síntomas...</p>
                      </div>
                    )}
                  </div>

                  {/* Preguntas Rápidas */}
                  <div className="med-quick-prompts">
                    <button className="quick-chip" onClick={() => void sendChatMessage("¿Cómo debo medir mi dolor en la escala EVA?")}>
                      ¿Cómo medir dolor?
                    </button>
                    <button className="quick-chip" onClick={() => void sendChatMessage("¿Qué es una bandera roja médica?")}>
                      ¿Qué es una bandera roja?
                    </button>
                    <button className="quick-chip" onClick={() => void sendChatMessage("Siento dolor de cabeza y fiebre, ¿qué hago?")}>
                      Dolor de cabeza + fiebre
                    </button>
                  </div>

                  <form
                    className="med-chat-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendChatMessage(chatInput);
                    }}
                  >
                    <input
                      placeholder="Consulta tus síntomas con la Dra. Sofía..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button type="submit" disabled={!chatInput.trim() || chatLoading}>
                      ↑
                    </button>
                  </form>
                </div>

                {/* Selector de Modelos Ollama Local */}
                <div className="ollama-selector-card">
                  <div>
                    <strong style={{ display: "block" }}>Motor de IA (Ollama)</strong>
                    <small style={{ color: "var(--slate)" }}>{connected ? "Servidor local activo" : "Modo contingencia"}</small>
                  </div>
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      showToast(`Modelo de IA cambiado a: ${e.target.value}`);
                    }}
                  >
                    {models.length > 0 ? (
                      models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="qwen2.5:3b">qwen2.5:3b (Recomendado)</option>
                        <option value="gemma4:latest">gemma4:latest</option>
                        <option value="llama3.2:latest">llama3.2:latest</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </main>

          {/* SECCIÓN DE CONSULTA DE TRAZABILIDAD EN TIEMPO REAL (PACIENTE) */}
          <section className="patient-tracking-section" id="trazabilidad-paciente" style={{ padding: "0 5% 50px" }}>
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
              <div className="charts-master-card" style={{ background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <span className="charts-badge">🔍 Portal del Paciente</span>
                    <h3 style={{ margin: "4px 0 2px", fontSize: "20px", fontWeight: 800 }}>
                      Consultar Estado y Trazabilidad de mi Atención
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--slate)" }}>
                      Ingrese su DNI o código de expediente para seguir en vivo su paso por Triaje, Consulta, Tratamiento y Alta Médica.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, minWidth: "260px" }}
                    placeholder="Ej. Ingrese su DNI (47891234) o código (MED-2026-0815)..."
                    value={trackingDniInput}
                    onChange={(e) => setTrackingDniInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const found = evaluations.find(
                          (ev) =>
                            ev.patientId.trim() === trackingDniInput.trim() ||
                            ev.id.toLowerCase().trim() === trackingDniInput.toLowerCase().trim()
                        );
                        if (found) {
                          setTrackedPatient(found);
                          showToast(`Expediente encontrado: ${found.patientName}`);
                        } else {
                          showToast("No se encontró ningún expediente con ese DNI o código.");
                        }
                      }
                    }}
                  />
                  <button
                    className="doctor-portal-btn"
                    style={{ background: "linear-gradient(135deg, #0284c7, #0f172a)" }}
                    onClick={() => {
                      const found = evaluations.find(
                        (ev) =>
                          ev.patientId.trim() === trackingDniInput.trim() ||
                          ev.id.toLowerCase().trim() === trackingDniInput.toLowerCase().trim()
                      );
                      if (found) {
                        setTrackedPatient(found);
                        showToast(`Expediente encontrado: ${found.patientName}`);
                      } else {
                        showToast("No se encontró ningún expediente con ese DNI o código.");
                      }
                    }}
                  >
                    Buscar Trazabilidad 🔎
                  </button>
                </div>

                {/* Accesos rápidos de ejemplo */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", fontSize: "11px", color: "var(--slate)" }}>
                  <span>Ejemplos rápidos:</span>
                  <button
                    className="stage-filter-pill"
                    onClick={() => {
                      const p = evaluations.find((e) => e.patientId === "72654321");
                      if (p) { setTrackedPatient(p); setTrackingDniInput("72654321"); }
                    }}
                  >
                    🏥 Lucía Paredes (Alta Médica & Opinión)
                  </button>
                  <button
                    className="stage-filter-pill"
                    onClick={() => {
                      const p = evaluations.find((e) => e.patientId === "47891234");
                      if (p) { setTrackedPatient(p); setTrackingDniInput("47891234"); }
                    }}
                  >
                    💊 Carlos Mendoza (En Tratamiento)
                  </button>
                  <button
                    className="stage-filter-pill"
                    onClick={() => {
                      const p = evaluations.find((e) => e.patientId === "10839201");
                      if (p) { setTrackedPatient(p); setTrackingDniInput("10839201"); }
                    }}
                  >
                    📋 Manuel Quispe (En Triaje)
                  </button>
                </div>

                {/* Mostrar trazabilidad del paciente encontrado */}
                {trackedPatient && (
                  <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
                    <TraceabilityTimeline
                      evaluation={trackedPatient}
                      onOpenSatisfaction={() => setPatientSatisfactionTarget(trackedPatient)}
                    />

                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
                      <button
                        className="export-pdf-btn"
                        disabled={exportingPDF}
                        onClick={() => void exportEvaluationToPDF(trackedPatient)}
                      >
                        {exportingPDF ? "Generando..." : "📥 Descargar Ficha PDF"}
                      </button>
                      {trackedPatient.currentStage === "discharge" && !trackedPatient.satisfaction && (
                        <button
                          className="doctor-portal-btn"
                          style={{ background: "#10b981", borderColor: "#059669" }}
                          onClick={() => setPatientSatisfactionTarget(trackedPatient)}
                        >
                          ⭐ Calificar Atención Médica
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: DOCTOR / AUDITOR MÉDICO DASHBOARD */}
      {/* ============================================================== */}
      {view === "doctor" && doctorSession && (
        <main className="doctor-dashboard">
          <div className="dashboard-head">
            <div className="doctor-profile-badge">
              <div className="doctor-avatar-large">👨‍⚕️</div>
              <div>
                <h2>{doctorSession.name}</h2>
                <p>{doctorSession.cmp} · {doctorSession.role}</p>
                <small style={{ color: "var(--blue)", fontWeight: 700 }}>{doctorSession.hospital}</small>
              </div>
            </div>
            <div className="doctor-head-actions">
              <button className="doctor-portal-btn" onClick={() => setView("patient")}>
                ← Regresar al Portal de Pacientes
              </button>
              <button
                className="doctor-portal-btn"
                style={{ marginLeft: "8px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
                onClick={() => { loadEvaluations(); showToast("Dashboard actualizado ✓"); }}
              >
                🔄 Actualizar Dashboard
              </button>
            </div>
          </div>

          {/* Tarjetas de Métricas de Triaje y Trazabilidad */}
          <div className="metrics-deck">
            <div className="metric-card emergency">
              <small>Nivel 1 · Emergencia (Rojo)</small>
              <strong>{evaluations.filter((e) => e.triageColor === "red").length}</strong>
              <span>Riesgo vital / Atención inmediata</span>
            </div>
            <div className="metric-card urgent">
              <small>Nivel 2/3 · Urgencias</small>
              <strong>{evaluations.filter((e) => e.triageColor === "orange" || e.triageColor === "yellow").length}</strong>
              <span>Atención médica prioritaria</span>
            </div>
            <div className="metric-card fraud">
              <small>Alertas de Auditoría / Fraude</small>
              <strong>{evaluations.filter((e) => !e.aiAudit.isConsistent || e.aiAudit.fraudSuspicion !== "BAJA").length}</strong>
              <span>Inconsistencias detectadas por IA</span>
            </div>
            <div className="metric-card" style={{ borderLeft: "4px solid #6366f1" }}>
              <small>En Consulta / Tratamiento</small>
              <strong style={{ color: "#4f46e5" }}>
                {evaluations.filter((e) => e.currentStage === "consultation" || e.currentStage === "treatment").length}
              </strong>
              <span>Pacientes en atención activa</span>
            </div>
            <div className="metric-card" style={{ borderLeft: "4px solid #10b981" }}>
              <small>Altas Médicas Otorgadas</small>
              <strong style={{ color: "#059669" }}>
                {evaluations.filter((e) => e.currentStage === "discharge").length}
              </strong>
              <span>Egresos con epicrisis formal</span>
            </div>
            <div className="metric-card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <small>Satisfacción Promedio</small>
              <strong style={{ color: "#d97706" }}>
                {evaluations.filter((e) => e.satisfaction?.overallRating).length > 0
                  ? (
                      evaluations.filter((e) => e.satisfaction?.overallRating).reduce((acc, e) => acc + (e.satisfaction?.overallRating || 0), 0) /
                      evaluations.filter((e) => e.satisfaction?.overallRating).length
                    ).toFixed(1)
                  : "4.9"}{" "}
                ★
              </strong>
              <span>
                {evaluations.filter((e) => e.satisfaction?.overallRating).length} encuestas recibidas
              </span>
            </div>
          </div>

          {/* MÓDULO VISUAL: BUSINESS INTELLIGENCE HOSPITALARIO (GRÁFICOS RADIALES & CHARTS) */}
          <ClinicalCharts evaluations={evaluations} />

          {/* Tabla de Evaluaciones Auditadas y Trazabilidad */}
          <div className="evaluations-table-card">
            <div className="table-toolbar">
              <div>
                <h3>Auditoría de Cuestionarios y Trazabilidad Hospitalaria</h3>
                <small style={{ color: "var(--slate)" }}>
                  Monitoreo de flujo del paciente desde Triaje hasta Alta Médica con sellos criptográficos
                </small>
              </div>
              <input
                className="table-search"
                placeholder="Buscar por paciente, DNI, código o nivel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filtros por Etapa del Ciclo Hospitalario */}
            <div className="stage-filter-bar">
              <button
                className={`stage-filter-pill ${stageFilter === "all" ? "active" : ""}`}
                onClick={() => setStageFilter("all")}
              >
                Todos los Pacientes ({evaluations.length})
              </button>
              <button
                className={`stage-filter-pill ${stageFilter === "triage" ? "active" : ""}`}
                onClick={() => setStageFilter("triage")}
              >
                📋 1. En Triaje ({evaluations.filter((e) => e.currentStage === "triage" || !e.currentStage).length})
              </button>
              <button
                className={`stage-filter-pill ${stageFilter === "consultation" ? "active" : ""}`}
                onClick={() => setStageFilter("consultation")}
              >
                🩺 2. En Consulta ({evaluations.filter((e) => e.currentStage === "consultation").length})
              </button>
              <button
                className={`stage-filter-pill ${stageFilter === "treatment" ? "active" : ""}`}
                onClick={() => setStageFilter("treatment")}
              >
                💊 3. En Tratamiento ({evaluations.filter((e) => e.currentStage === "treatment").length})
              </button>
              <button
                className={`stage-filter-pill ${stageFilter === "discharge" ? "active" : ""}`}
                onClick={() => setStageFilter("discharge")}
              >
                🏥 4. Alta Médica ({evaluations.filter((e) => e.currentStage === "discharge").length})
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="med-table">
                <thead>
                  <tr>
                    <th>Fecha / Código</th>
                    <th>Paciente / Identidad</th>
                    <th>Motivo de Consulta</th>
                    <th>Nivel de Triaje</th>
                    <th>Auditoría Coherencia</th>
                    <th>Etapa Hospitalaria</th>
                    <th>Satisfacción</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvaluations.map((ev) => (
                    <tr key={ev.id}>
                      <td>
                        <strong style={{ display: "block" }}>{ev.id}</strong>
                        <small style={{ color: "var(--slate)", fontFamily: "DM Mono" }}>
                          {new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </small>
                      </td>
                      <td>
                        <strong>{ev.patientName}</strong>
                        <small style={{ display: "block", color: "var(--slate)" }}>
                          DNI: {ev.patientId} · {ev.patientAge} años ({ev.patientGender})
                        </small>
                      </td>
                      <td style={{ maxWidth: "220px" }}>
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {String(ev.answers.main_complaint || "Sin descripción")}
                        </span>
                      </td>
                      <td>
                        <span className={`triage-badge ${ev.triageColor}`}>
                          {ev.triageLevel.replace(" - ", "\n")}
                        </span>
                      </td>
                      <td>
                        {ev.aiAudit.isConsistent && ev.aiAudit.fraudSuspicion === "BAJA" ? (
                          <span className="audit-status-badge ok">
                            ✓ Coherente ({ev.aiAudit.coherenceScore}%)
                          </span>
                        ) : (
                          <span className="audit-status-badge alert">
                            ⚠️ Alerta ({ev.aiAudit.fraudSuspicion})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`stage-pill ${ev.currentStage || "triage"}`}>
                          {ev.currentStage === "triage" && "📋 Triaje"}
                          {ev.currentStage === "consultation" && "🩺 Consulta"}
                          {ev.currentStage === "treatment" && "💊 Tratamiento"}
                          {ev.currentStage === "discharge" && "🏥 Alta Médica"}
                          {!ev.currentStage && "📋 Triaje"}
                        </span>
                      </td>
                      <td>
                        {ev.satisfaction ? (
                          <span style={{ color: "#d97706", fontWeight: 800, fontSize: "11px" }}>
                            {"★".repeat(ev.satisfaction.overallRating)} ({ev.satisfaction.overallRating}/5)
                          </span>
                        ) : ev.currentStage === "discharge" ? (
                          <span style={{ color: "var(--slate)", fontSize: "11px" }}>Pendiente</span>
                        ) : (
                          <span style={{ color: "var(--slate)", fontSize: "11px" }}>En proceso</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexDirection: "column" }}>
                          <button
                            className="advance-action-btn"
                            onClick={() => setPatientAdvanceTarget(ev)}
                          >
                            🩺 Gestionar Proceso
                          </button>
                          <button
                            className="view-details-btn"
                            onClick={() => {
                              setSelectedEvaluation(ev);
                              setDoctorNotesInput(ev.doctorNotes || "");
                            }}
                          >
                            Auditar Ficha 👁️
                          </button>
                          <button
                            className="view-details-btn"
                            style={{ background: "linear-gradient(135deg, #10b981, #059669)", fontSize: "11px" }}
                            disabled={exportingPDF}
                            onClick={() => void exportEvaluationToPDF(ev)}
                          >
                            📥 Descargar PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEvaluations.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--slate)" }}>
                        No se encontraron registros de pacientes con ese criterio o etapa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* MODAL: FICHA CLÍNICA COMPLETA Y AUDITORÍA DETALLADA (DOCTOR) */}
      {/* ============================================================== */}
      {selectedEvaluation && (
        <div className="modal-backdrop" onClick={() => setSelectedEvaluation(null)}>
          <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--slate)", textTransform: "uppercase" }}>
                  Expediente de Triaje {selectedEvaluation.id}
                </span>
                <h3>{selectedEvaluation.patientName}</h3>
                <small style={{ color: "var(--slate)" }}>
                  DNI: {selectedEvaluation.patientId} · {selectedEvaluation.patientAge} años · Registrado: {new Date(selectedEvaluation.createdAt).toLocaleString()}
                </small>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  className="doctor-portal-btn"
                  style={{ fontSize: "12px", padding: "6px 14px", background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                  onClick={() => setPatientAdvanceTarget(selectedEvaluation)}
                >
                  🩺 Avanzar Etapa ↗
                </button>
                <button
                  className="doctor-portal-btn"
                  style={{ fontSize: "12px", padding: "6px 14px" }}
                  disabled={exportingPDF}
                  onClick={() => void exportEvaluationToPDF(selectedEvaluation)}
                >
                  {exportingPDF ? "Generando..." : "📄 Exportar PDF"}
                </button>
                <button className="modal-close-btn" onClick={() => setSelectedEvaluation(null)}>
                  ×
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Resumen del Triaje */}
              <div className={`audit-banner-summary ${selectedEvaluation.triageColor}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "18px" }}>{selectedEvaluation.triageLevel}</h4>
                    <p style={{ margin: 0, fontSize: "13px" }}>
                      Evaluación de Dolor: <b>EVA {selectedEvaluation.answers.pain_scale}/10</b> · Fiebre: <b>{selectedEvaluation.answers.fever_present}</b>
                    </p>
                  </div>
                  <span className={`triage-badge ${selectedEvaluation.triageColor}`}>
                    {selectedEvaluation.aiAudit.isConsistent ? "Auditoría Válida" : "Alerta de Fraude / Inconsistencia"}
                  </span>
                </div>
              </div>

              {/* Dictamen del Modelo de Ollama */}
              <div className="audit-grid">
                <div className="audit-panel-box">
                  <h4>🧠 Análisis Clínico de IA ({selectedEvaluation.aiAudit.auditedByModel})</h4>
                  <p><b>Diagnóstico Presuntivo:</b> {selectedEvaluation.aiAudit.presumptiveDiagnosis}</p>
                  <p style={{ marginTop: "10px" }}><b>Resumen de Anamnesis:</b> {selectedEvaluation.aiAudit.clinicalSummary}</p>
                  <p style={{ marginTop: "10px" }}><b>Recomendación Asistencial:</b> {selectedEvaluation.aiAudit.doctorRecommendations}</p>
                </div>

                <div className="audit-panel-box">
                  <h4>🛡️ Control de Calidad y Anti-Fraude</h4>
                  <p>
                    <b>Índice de Coherencia:</b> {selectedEvaluation.aiAudit.coherenceScore}%
                  </p>
                  <p style={{ marginTop: "6px" }}>
                    <b>Nivel de Sospecha de Fraude:</b> {selectedEvaluation.aiAudit.fraudSuspicion}
                  </p>
                  {selectedEvaluation.aiAudit.detectedContradictions.length > 0 ? (
                    <div style={{ marginTop: "8px", background: "#fef2f2", padding: "8px 12px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                      <b style={{ color: "#991b1b", fontSize: "11px" }}>Contradicciones Identificadas:</b>
                      <ul style={{ margin: "4px 0 0", paddingLeft: "18px", fontSize: "11px", color: "#991b1b" }}>
                        {selectedEvaluation.aiAudit.detectedContradictions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p style={{ color: "var(--emerald)", fontSize: "12px", marginTop: "6px" }}>
                      ✓ No se detectaron contradicciones entre la narrativa y los signos reportados.
                    </p>
                  )}

                  {selectedEvaluation.aiAudit.redFlags.length > 0 && (
                    <div style={{ marginTop: "8px", background: "#fff7ed", padding: "8px 12px", borderRadius: "8px", border: "1px solid #fed7aa" }}>
                      <b style={{ color: "#c2410c", fontSize: "11px" }}>Banderas Rojas (Red Flags):</b>
                      <ul style={{ margin: "4px 0 0", paddingLeft: "18px", fontSize: "11px", color: "#c2410c" }}>
                        {selectedEvaluation.aiAudit.redFlags.map((rf, i) => (
                          <li key={i}>{rf}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* LÍNEA DE TRAZABILIDAD HOSPITALARIA (AUDITORÍA COMPLETA) */}
              <div style={{ marginBottom: "20px" }}>
                <TraceabilityTimeline evaluation={selectedEvaluation} isAdminView={true} />
              </div>

              {/* OPINIÓN Y SATISFACCIÓN REPORTADA POR EL PACIENTE */}
              {selectedEvaluation.satisfaction && (
                <div className="audit-panel-box" style={{ marginBottom: "20px", background: "#fefce8", borderColor: "#fef08a" }}>
                  <h4 style={{ color: "#854d0e" }}>⭐ Opinión y Satisfacción Reportada por el Paciente</h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0", flexWrap: "wrap" }}>
                    <span style={{ color: "#f59e0b", fontSize: "18px" }}>
                      {"★".repeat(selectedEvaluation.satisfaction.overallRating)}
                    </span>
                    <b>{selectedEvaluation.satisfaction.overallRating} / 5.0</b>
                    <small style={{ color: "var(--slate)" }}>
                      (Atención Médica: {selectedEvaluation.satisfaction.medicalCareRating}/5 · Tiempo Espera: {selectedEvaluation.satisfaction.waitingTimeRating}/5 · Claridad: {selectedEvaluation.satisfaction.clarityRating}/5)
                    </small>
                  </div>
                  <p style={{ fontStyle: "italic", margin: "6px 0", color: "#451a03" }}>
                    "{selectedEvaluation.satisfaction.comment || "Sin comentarios adicionales"}"
                  </p>
                  <small style={{ color: "#15803d", fontWeight: 700 }}>
                    Recomendación del hospital: {selectedEvaluation.satisfaction.wouldRecommend === "SI" ? "✓ Sí, totalmente" : selectedEvaluation.satisfaction.wouldRecommend}
                  </small>
                </div>
              )}

              {/* Respuestas Detalladas del Paciente */}
              <div className="audit-panel-box" style={{ marginBottom: "20px" }}>
                <h4>Cuestionario Declarado por el Paciente</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                  <div><b>Motivo de consulta:</b> {selectedEvaluation.answers.main_complaint}</div>
                  <div><b>Tiempo de evolución:</b> {selectedEvaluation.answers.symptom_duration}</div>
                  <div><b>Dificultad respiratoria:</b> {selectedEvaluation.answers.breathing_difficulty}</div>
                  <div><b>Dolor en el pecho:</b> {selectedEvaluation.answers.chest_pain}</div>
                  <div><b>Pérdida de conciencia:</b> {selectedEvaluation.answers.consciousness_loss}</div>
                  <div><b>Enfermedades crónicas:</b> {selectedEvaluation.answers.chronic_diseases || "Ninguna"}</div>
                  <div><b>Medicamentos actuales:</b> {selectedEvaluation.answers.current_medications || "Ninguno"}</div>
                  <div><b>Alergias conocidas:</b> {selectedEvaluation.answers.known_allergies || "Ninguna"}</div>
                </div>
              </div>

              {/* Sello de Seguridad Legal */}
              <div className="audit-panel-box" style={{ marginBottom: "20px" }}>
                <h4>Sello Criptográfico Legal (Anti-Fraude)</h4>
                <p style={{ fontSize: "11px", color: "var(--slate)" }}>
                  Garantía de no alteración conforme a la Ley N° 29733 de Protección de Datos Personales en Salud:
                </p>
                <div className="audit-hash-badge">{selectedEvaluation.integrityHash}</div>
              </div>

              {/* Notas del Médico Auditor */}
              <div className="audit-panel-box">
                <h4>Observaciones del Médico Auditor</h4>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Escriba aquí sus observaciones clínicas, orden de exámenes o validación final..."
                  value={doctorNotesInput}
                  onChange={(e) => setDoctorNotesInput(e.target.value)}
                />
                <button
                  className="doctor-portal-btn"
                  style={{ marginTop: "12px", width: "100%", justifyContent: "center" }}
                  onClick={() => handleSaveDoctorNotes(selectedEvaluation.id)}
                >
                  ✓ Guardar Observaciones y Marcar como Revisado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LOGIN EXCLUSIVO PARA EL DOCTOR / AUDITOR */}
      {/* ============================================================== */}
      {showLoginModal && (
        <div className="modal-backdrop" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-icon">🔒</div>
            <h3>Acceso Médico / Auditor</h3>
            <p>Portal exclusivo para médicos colegiados y auditores de triaje de SaludAI.</p>

            {loginError && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "8px", fontSize: "12px", marginBottom: "14px" }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleDoctorLogin}>
              <input
                className="login-input"
                type="text"
                placeholder="Usuario o correo médico"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
              />
              <input
                className="login-input"
                type="password"
                placeholder="Contraseña médica"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                required
              />
              <button type="submit" className="login-submit-btn">
                Ingresar al Dashboard Auditor ↗
              </button>
            </form>

            <div className="login-credentials-hint">
              <b>Credenciales del Doctor Auditor:</b><br />
              Usuario: <code>doctor@salud.pe</code><br />
              Contraseña: <code>medico2026</code>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ENCUESTA DE SATISFACCIÓN Y FEEDBACK (PACIENTE) */}
      {/* ============================================================== */}
      {patientSatisfactionTarget && (
        <SatisfactionModal
          evaluation={patientSatisfactionTarget}
          onClose={() => setPatientSatisfactionTarget(null)}
          onSuccess={(updated) => {
            setPatientSatisfactionTarget(null);
            loadEvaluations();
            if (surveyResult?.id === updated.id) setSurveyResult(updated);
            if (trackedPatient?.id === updated.id) setTrackedPatient(updated);
            if (selectedEvaluation?.id === updated.id) setSelectedEvaluation(updated);
            showToast("¡Muchas gracias! Su opinión de satisfacción ha sido registrada exitosamente.");
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL: GESTIÓN DE PROCESO CLÍNICO Y AVANCE DE ETAPA (DOCTOR) */}
      {/* ============================================================== */}
      {patientAdvanceTarget && (
        <AdvanceStageModal
          evaluation={patientAdvanceTarget}
          doctorName={doctorSession?.name || "Dr. Alejandro Valdivia (CMP 48291)"}
          onClose={() => setPatientAdvanceTarget(null)}
          onSuccess={(updated) => {
            setPatientAdvanceTarget(null);
            loadEvaluations();
            if (surveyResult?.id === updated.id) setSurveyResult(updated);
            if (trackedPatient?.id === updated.id) setTrackedPatient(updated);
            if (selectedEvaluation?.id === updated.id) setSelectedEvaluation(updated);
            showToast(`Etapa hospitalaria actualizada: Paciente avanzado a ${updated.currentStage.toUpperCase()} ✓`);
          }}
        />
      )}

      {/* Footer Clínico */}
      <footer className="med-footer">
        <div>
          <b>SaludAI · Plataforma de Triaje Clínico & Auditoría Médica</b>
          <span style={{ display: "block", color: "var(--slate)", marginTop: "3px" }}>
            Conformidad con la Ley General de Salud N° 26842 y Ley de Protección de Datos Personales N° 29733.
          </span>
        </div>
        <div>
          <span>Urgencias Médicas: <b>106 / 117</b> · Atención Hospitalaria 24/7</span>
        </div>
      </footer>
    </div>
  );
}
