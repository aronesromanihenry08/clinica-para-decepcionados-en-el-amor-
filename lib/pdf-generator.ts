// Cliente-side PDF generation using jsPDF
// This must only be called from the browser (client components)
import type { PatientEvaluation } from "./clinical-evaluations";

// Colores según nivel de triaje
const TRIAGE_COLORS: Record<string, [number, number, number]> = {
  red:    [220,  38,  38],
  orange: [234,  88,  12],
  yellow: [202, 138,   4],
  green:  [ 22, 163,  74],
};

const TRIAGE_BG: Record<string, [number, number, number]> = {
  red:    [254, 226, 226],
  orange: [255, 247, 237],
  yellow: [254, 252, 232],
  green:  [240, 253, 244],
};

export async function downloadPatientPDF(ev: PatientEvaluation): Promise<void> {
  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210 mm
  const margin = 14;
  const contentW = W - margin * 2;

  const triageRGB = TRIAGE_COLORS[ev.triageColor] ?? [14, 165, 233];
  const triageBgRGB = TRIAGE_BG[ev.triageColor] ?? [241, 245, 249];
  const brandBlue: [number, number, number] = [14, 165, 233];
  const darkSlate: [number, number, number] = [30, 41, 59];
  const slate: [number, number, number] = [100, 116, 139];

  let y = margin;

  // ─── CABECERA ─────────────────────────────────────────────────────────────
  // Franja azul superior
  doc.setFillColor(...brandBlue);
  doc.rect(0, 0, W, 22, "F");

  // Cruz médica blanca
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, 5, 7, 3, "F");
  doc.rect(margin + 2, 3, 3, 7, "F");

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("SaludAI · Ficha de Triaje Clínico", margin + 10, 11);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Plataforma de Triaje y Auditoría Médica · Conforme a Ley N° 26842 y N° 29733", margin + 10, 16.5);

  // Expediente y fecha (esquina derecha)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  const dateStr = new Date(ev.createdAt).toLocaleString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  doc.text(`Expediente: ${ev.id}`, W - margin, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Registro: ${dateStr}`, W - margin, 15.5, { align: "right" });
  doc.text(`Auditado por: ${ev.aiAudit.auditedByModel}`, W - margin, 19.5, { align: "right" });

  y = 28;

  // ─── BANNER DE TRIAJE ─────────────────────────────────────────────────────
  doc.setFillColor(...triageBgRGB);
  doc.setDrawColor(...triageRGB);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 24, 2, 2, "FD");

  // Borde izquierdo grueso
  doc.setFillColor(...triageRGB);
  doc.rect(margin, y, 3, 24, "F");

  doc.setTextColor(...triageRGB);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(ev.triageLevel, margin + 6, y + 8);

  doc.setTextColor(...darkSlate);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Paciente: ${ev.patientName}`, margin + 6, y + 14);
  doc.text(`DNI: ${ev.patientId}  |  ${ev.patientAge} años  |  ${ev.patientGender}`, margin + 6, y + 19.5);

  // Badge derecho
  const badgeText = ev.aiAudit.isConsistent ? "✓ AUDITORÍA VÁLIDA" : "⚠ ALERTA FRAUDE";
  doc.setFillColor(...triageRGB);
  doc.roundedRect(W - margin - 44, y + 5, 42, 14, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(badgeText, W - margin - 23, y + 14, { align: "center" });

  y += 30;

  // ─── Función auxiliar: cabecera de sección ─────────────────────────────────
  function sectionHeader(title: string) {
    doc.setFillColor(...brandBlue);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 3, y + 5);
    y += 10;
    doc.setTextColor(...darkSlate);
  }

  function fieldRow(label: string, value: string, fullWidth = false) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...slate);
    doc.text(label.toUpperCase(), margin + 2, y);
    y += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);
    const lines = doc.splitTextToSize(value, fullWidth ? contentW - 4 : contentW / 2 - 8);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4 + 3;
  }

  function checkPageBreak(neededMM = 30) {
    if (y + neededMM > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }
  }

  // ─── SECCIÓN 1: ANÁLISIS CLÍNICO IA ──────────────────────────────────────
  sectionHeader(`🧠 ANÁLISIS CLÍNICO IA — ${ev.aiAudit.auditedByModel}`);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, 1, 1, 1, "FD"); // placeholder to set y
  const iaStartY = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slate);
  doc.text("DIAGNÓSTICO PRESUNTIVO", margin + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  const dxLines = doc.splitTextToSize(ev.aiAudit.presumptiveDiagnosis, contentW - 4);
  doc.text(dxLines, margin + 2, y + 9);
  y += 9 + dxLines.length * 4 + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slate);
  doc.text("RESUMEN DE ANAMNESIS", margin + 2, y);
  y += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  const summaryLines = doc.splitTextToSize(ev.aiAudit.clinicalSummary, contentW - 4);
  doc.text(summaryLines, margin + 2, y);
  y += summaryLines.length * 4 + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slate);
  doc.text("RECOMENDACIÓN ASISTENCIAL", margin + 2, y);
  y += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  const recLines = doc.splitTextToSize(ev.aiAudit.doctorRecommendations, contentW - 4);
  doc.text(recLines, margin + 2, y);
  y += recLines.length * 4 + 4;

  // Box frame around IA section
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, iaStartY, contentW, y - iaStartY, 2, 2, "D");

  y += 4;

  // ─── SECCIÓN 2: CONTROL ANTI-FRAUDE ──────────────────────────────────────
  checkPageBreak(45);
  sectionHeader("🛡️ CONTROL DE CALIDAD Y ANTI-FRAUDE");

  // Tabla de métricas
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Métrica", "Resultado"]],
    body: [
      ["Índice de Coherencia", `${ev.aiAudit.coherenceScore}%`],
      ["Sospecha de Fraude", ev.aiAudit.fraudSuspicion],
      ["Consistencia del Cuestionario", ev.aiAudit.isConsistent ? "✓ Coherente" : "⚠ Inconsistente"],
    ],
    headStyles: { fillColor: brandBlue, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: darkSlate },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { cellWidth: contentW - 80 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const val = String(data.cell.raw);
        if (val.includes("ALTA") || val.includes("Inconsistente")) {
          data.cell.styles.textColor = TRIAGE_COLORS.red;
          data.cell.styles.fontStyle = "bold";
        } else if (val.includes("✓") || val.includes("BAJA")) {
          data.cell.styles.textColor = TRIAGE_COLORS.green;
          data.cell.styles.fontStyle = "bold";
        }
      }
    }
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Contradicciones y Red Flags
  if (ev.aiAudit.detectedContradictions.length > 0) {
    checkPageBreak(20);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    const boxLines: string[] = [];
    ev.aiAudit.detectedContradictions.forEach(c => {
      boxLines.push(...doc.splitTextToSize(`• ${c}`, contentW - 8));
    });
    const boxH = boxLines.length * 4 + 12;
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");
    doc.setTextColor(153, 27, 27);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("⚠ CONTRADICCIONES IDENTIFICADAS:", margin + 3, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(boxLines, margin + 3, y + 11);
    y += boxH + 4;
  }

  if (ev.aiAudit.redFlags.length > 0) {
    checkPageBreak(20);
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(253, 215, 170);
    const rfLines: string[] = [];
    ev.aiAudit.redFlags.forEach(r => {
      rfLines.push(...doc.splitTextToSize(`• ${r}`, contentW - 8));
    });
    const rfBoxH = rfLines.length * 4 + 12;
    doc.roundedRect(margin, y, contentW, rfBoxH, 2, 2, "FD");
    doc.setTextColor(194, 65, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("🚨 BANDERAS ROJAS (RED FLAGS):", margin + 3, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(rfLines, margin + 3, y + 11);
    y += rfBoxH + 4;
  }

  // ─── SECCIÓN 3: CUESTIONARIO DEL PACIENTE ────────────────────────────────
  checkPageBreak(50);
  sectionHeader("📋 CUESTIONARIO DECLARADO POR EL PACIENTE");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Campo", "Respuesta del Paciente"]],
    body: [
      ["Motivo de Consulta", String(ev.answers.main_complaint || "—")],
      ["Tiempo de Evolución", String(ev.answers.symptom_duration || "—")],
      ["Escala de Dolor (EVA)", `${ev.answers.pain_scale} / 10`],
      ["Presencia de Fiebre", String(ev.answers.fever_present || "—")],
      ["Dificultad Respiratoria", String(ev.answers.breathing_difficulty || "—")],
      ["Dolor en el Pecho", String(ev.answers.chest_pain || "—")],
      ["Pérdida de Conciencia", String(ev.answers.consciousness_loss || "—")],
      ["Enfermedades Crónicas", String(ev.answers.chronic_diseases || "Ninguna")],
      ["Medicamentos Actuales", String(ev.answers.current_medications || "Ninguno")],
      ["Alergias Conocidas", String(ev.answers.known_allergies || "Ninguna")],
    ],
    headStyles: { fillColor: brandBlue, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: darkSlate },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 1: { cellWidth: contentW - 55 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const val = String(data.cell.raw);
        if (val.includes("ALERTA")) {
          data.cell.styles.textColor = TRIAGE_COLORS.red;
          data.cell.styles.fontStyle = "bold";
        }
      }
    }
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // ─── SECCIÓN 4: PROCESO CLÍNICO & TRAZABILIDAD HOSPITALARIA ────────────
  checkPageBreak(40);
  const stageLabels: Record<string, string> = {
    triage: "1. Triaje Digital Asistido",
    consultation: "2. En Consulta Médica",
    treatment: "3. En Tratamiento / Farmacoterapia",
    discharge: "4. Alta Médica Otorgada (Egreso Hospitalario)"
  };
  sectionHeader(`🏥 EVOLUCIÓN CLÍNICA Y PROCESO DEL PACIENTE — ${stageLabels[ev.currentStage] || "Triaje"}`);

  // Ficha de consulta médica o tratamiento si existen
  if (ev.consultationDetails || ev.treatmentDetails || ev.dischargeDetails) {
    const journeyRows: [string, string][] = [];
    if (ev.consultationDetails) {
      journeyRows.push([
        "Consulta Médica",
        `Médico: ${ev.consultationDetails.doctorName || "Dr. Valdivia"} | Fecha: ${ev.consultationDetails.consultationDate ? new Date(ev.consultationDetails.consultationDate).toLocaleString() : "—"}\nExamen Físico: ${ev.consultationDetails.physicalExam || "Normal"}\nNotas Clínicas: ${ev.consultationDetails.clinicalNotes || "Atendido"}`
      ]);
    }
    if (ev.treatmentDetails) {
      journeyRows.push([
        "Plan de Tratamiento",
        `Prescripciones: ${(ev.treatmentDetails.prescriptions || []).join("; ") || "Indicadas"}\nIndicaciones: ${ev.treatmentDetails.instructions || "Reposo"}\nDescanso Médico: ${ev.treatmentDetails.restDays || 0} días`
      ]);
    }
    if (ev.dischargeDetails) {
      journeyRows.push([
        "Epicrisis de Alta Médica",
        `Condición al Egreso: ${ev.dischargeDetails.dischargeCondition || "Alta Favorable"} | Fecha: ${ev.dischargeDetails.dischargeDate ? new Date(ev.dischargeDetails.dischargeDate).toLocaleString() : "—"}\nResumen de Egreso: ${ev.dischargeDetails.epicrisisSummary || "Completado"}\nIndicaciones Post-Alta: ${ev.dischargeDetails.followUpInstructions || "Sin observaciones adicionales"}`
      ]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Etapa Hospitalaria", "Detalle de Atención"]],
      body: journeyRows,
      headStyles: { fillColor: brandBlue, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5, textColor: darkSlate },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 }, 1: { cellWidth: contentW - 50 } }
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // Tabla de Trazabilidad Cronológica (Timeline)
  if (ev.timeline && ev.timeline.length > 0) {
    checkPageBreak(35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    doc.text("LÍNEA DE TRAZABILIDAD AUDITADA (EVENTOS CRONOLÓGICOS)", margin + 2, y + 4);
    y += 6;

    const timelineRows = ev.timeline.map((evt) => [
      new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      evt.actor,
      evt.title,
      evt.description
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Hora", "Responsable", "Hito / Etapa", "Descripción del Registro"]],
      body: timelineRows,
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
      bodyStyles: { fontSize: 7, textColor: darkSlate },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 20 },
        1: { fontStyle: "bold", cellWidth: 35 },
        2: { fontStyle: "bold", cellWidth: 45 },
        3: { cellWidth: contentW - 100 }
      }
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // ─── SECCIÓN 5: SATISFACCIÓN Y FEEDBACK DEL PACIENTE ─────────────────────
  if (ev.satisfaction) {
    checkPageBreak(30);
    sectionHeader("⭐ EVALUACIÓN DE SATISFACCIÓN DEL PACIENTE (EGRESO)");

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Criterio", "Calificación / Comentario"]],
      body: [
        ["Calificación General", `${"★".repeat(ev.satisfaction.overallRating)}${"☆".repeat(5 - ev.satisfaction.overallRating)} (${ev.satisfaction.overallRating}/5)`],
        ["Atención del Personal Médico", `${ev.satisfaction.medicalCareRating} / 5`],
        ["Tiempo de Espera", `${ev.satisfaction.waitingTimeRating} / 5`],
        ["Claridad de las Indicaciones", `${ev.satisfaction.clarityRating} / 5`],
        ["Recomienda el Centro de Salud", ev.satisfaction.wouldRecommend === "SI" ? "✓ Sí, totalmente" : ev.satisfaction.wouldRecommend],
        ["Comentario del Paciente", `"${ev.satisfaction.comment || "Sin comentarios adicionales"}"`]
      ],
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5, textColor: darkSlate },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 1: { cellWidth: contentW - 60 } }
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // ─── SECCIÓN 6: NOTAS DEL MÉDICO AUDITOR ─────────────────────────────────
  if (ev.doctorNotes) {
    checkPageBreak(25);
    sectionHeader("📝 OBSERVACIONES DEL MÉDICO AUDITOR");
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    const noteLines = doc.splitTextToSize(ev.doctorNotes, contentW - 8);
    const noteBoxH = noteLines.length * 4.5 + 10;
    doc.roundedRect(margin, y, contentW, noteBoxH, 2, 2, "FD");
    doc.setTextColor(29, 78, 216);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text(noteLines, margin + 4, y + 7);
    y += noteBoxH + 4;
  }

  // ─── SECCIÓN 7: SELLO CRIPTOGRÁFICO ──────────────────────────────────────
  checkPageBreak(25);
  sectionHeader("🔐 SELLO CRIPTOGRÁFICO LEGAL (SHA-256 ANTI-FRAUDE)");

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
  doc.setTextColor(148, 163, 184);
  doc.setFont("courier", "normal");
  doc.setFontSize(6.5);
  const hashLines = doc.splitTextToSize(ev.integrityHash, contentW - 8);
  doc.text(hashLines, margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Registro inmutable conforme a la Ley N° 29733 de Protección de Datos Personales en Salud.", margin + 4, y + 13);
  y += 18;

  // ─── PIE DE PÁGINA en TODAS las páginas ──────────────────────────────────
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageH - 12, W - margin, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...slate);
    doc.text(
      `SaludAI · Proceso Clínico & Trazabilidad Hospitalaria · Ley N° 26842 y N° 29733 · ${ev.id} · ${ev.patientName}`,
      margin, pageH - 7
    );
    doc.text(`Página ${i} de ${pageCount}`, W - margin, pageH - 7, { align: "right" });
  }

  // ─── DESCARGAR ────────────────────────────────────────────────────────────
  const fileName = `SaludAI_Ficha_${ev.id}_${ev.patientName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
