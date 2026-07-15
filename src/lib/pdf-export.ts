import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/lib/api";

interface ExportConfig {
  title: string;
  filename: string;
  columns: { header: string; dataKey: string }[];
  data: any[];
  subtitle?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
}

interface ClinicSettings {
  hospital_name: string;
  contact_phone: string;
  address: string;
}

// Cache clinic settings to avoid repeated API calls
let cachedSettings: ClinicSettings | null = null;
let cachedLogoBase64: string | null = null;

async function getClinicSettings(): Promise<ClinicSettings> {
  if (cachedSettings) return cachedSettings;
  try {
    const settings = await api.settings.get();
    cachedSettings = {
      hospital_name: settings.hospital_name || "UNZA Clinic",
      contact_phone: settings.contact_phone || "",
      address: settings.address || "",
    };
  } catch {
    cachedSettings = {
      hospital_name: "UNZA Clinic",
      contact_phone: "",
      address: "",
    };
  }
  return cachedSettings;
}

async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    cachedLogoBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: generate a simple colored square with text
    cachedLogoBase64 = await generateFallbackLogo();
  }
  return cachedLogoBase64;
}

async function generateFallbackLogo(): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#007A3D";
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = "white";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("UNZA", 50, 45);
  ctx.fillText("Clinic", 50, 62);
  return canvas.toDataURL("image/png");
}

function addProfessionalHeader(doc: jsPDF, config: ExportConfig, settings: ClinicSettings, logoBase64: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Add logo if available
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 14, 10, 30, 30);
    } catch {
      // Ignore image errors
    }
  }

  // Clinic name
  doc.setFontSize(18);
  doc.setTextColor(22, 100, 29);
  doc.text(settings.hospital_name, 50, 22);

  // Address and phone (smaller)
  if (settings.address || settings.contact_phone) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const contactInfo = [settings.address, `Tel: ${settings.contact_phone}`].filter(Boolean).join(" • ");
    doc.text(contactInfo, 50, 30);
  }

  // Separator line
  doc.setDrawColor(22, 100, 29);
  doc.setLineWidth(0.5);
  doc.line(14, 36, pageWidth - 14, 36);

  // Report title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(config.title, 14, 46);

  // Subtitle if provided
  if (config.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(config.subtitle, 14, 52);
    yPos = 58;
  } else {
    yPos = 50;
  }

  return yPos;
}

function addProfessionalFooter(doc: jsPDF, startY: number) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const dateStr = new Date().toLocaleString("en-ZM", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Lusaka",
    });

    // Left: clinic name
    doc.text("UNZA Clinic", 14, pageHeight - 15);

    // Center: page number
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, pageHeight - 15, { align: "center" });

    // Right: date
    doc.text(dateStr, doc.internal.pageSize.getWidth() - 14, pageHeight - 15, { align: "right" });
  }
}

export async function exportToPDF(config: ExportConfig) {
  const doc = new jsPDF();
  const settings = await getClinicSettings();
  const logoBase64 = await getLogoBase64();

  // Add professional header
  const startY = addProfessionalHeader(doc, config, settings, logoBase64);

  // Generate Table
  autoTable(doc, {
    startY,
    head: [config.columns.map(col => col.header)],
    body: config.data.map(item => config.columns.map(col => {
      const val = item[col.dataKey];
      return val !== null && val !== undefined ? String(val) : "";
    })),
    headStyles: {
      fillColor: [22, 100, 29],
      textColor: 255,
      fontSize: 10,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 250, 247],
    },
    margin: { left: 14, right: 14 },
  });

  // Add professional footer
  if (config.includeFooter !== false) {
    addProfessionalFooter(doc, startY);
  }

  doc.save(`${config.filename}.pdf`);
}

interface CertificateConfig {
  name: string;
  school: string;
  compNo: string;
  fitnessStatus: string;
  comments: string;
  examinerName: string;
  officialDate: string;
  filename?: string;
}

export async function generateMedicalFitnessCertificate({
  name,
  school,
  compNo,
  fitnessStatus,
  comments,
  examinerName,
  officialDate,
  filename = "medical-fitness-certificate"
}: CertificateConfig) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const settings = await getClinicSettings();
  const logoBase64 = await getLogoBase64();

  // Professional header with logo
  let yPos = 15;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 14, 10, 25, 25);
    } catch {}
  }

  doc.setFontSize(16);
  doc.setTextColor(22, 100, 29);
  doc.text(settings.hospital_name, 44, 18);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (settings.address) {
    doc.text(settings.address, 44, 24);
  }
  if (settings.contact_phone) {
    doc.text(`Tel: ${settings.contact_phone}`, 44, 30);
  }

  // Header separator
  doc.setDrawColor(22, 100, 29);
  doc.setLineWidth(0.5);
  doc.line(14, 36, pageWidth - 14, 36);

  // Certificate title
  doc.setFontSize(20);
  doc.setTextColor(22, 100, 29);
  doc.setFont(undefined, "bold");
  doc.text("CERTIFICATE OF MEDICAL FITNESS", pageWidth / 2, 52, { align: "center" });
  doc.setFont(undefined, "normal");

  yPos = 62;

  // Decorative line under title
  doc.setDrawColor(22, 100, 29);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 35, yPos, pageWidth / 2 + 35, yPos);
  yPos += 12;

  // Certificate text
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("This is to certify that the following individual has undergone a medical", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;
  doc.text("examination and is declared fit for university activities.", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Student details box
  const boxX = 30;
  const boxY = yPos;
  const boxWidth = pageWidth - 60;
  const boxHeight = 55;

  doc.setFillColor(248, 252, 249);
  doc.setDrawColor(22, 100, 29);
  doc.setLineWidth(0.6);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4, 4);
  doc.rect(boxX, boxY, boxWidth, boxHeight);

  // Label style
  doc.setFontSize(10);
  doc.setTextColor(22, 100, 29);
  doc.setFont(undefined, "bold");

  // Row 1
  doc.text("Full Name:", boxX + 12, boxY + 18);
  doc.setFont(undefined, "normal");
  doc.text(name.toUpperCase(), boxX + 65, boxY + 18);

  // Row 2
  doc.setFont(undefined, "bold");
  doc.text("School / Department:", boxX + 12, boxY + 32);
  doc.setFont(undefined, "normal");
  doc.text(school, boxX + 65, boxY + 32);

  // Row 3
  doc.setFont(undefined, "bold");
  doc.text("Student ID / Clinic No:", boxX + 12, boxY + 46);
  doc.setFont(undefined, "normal");
  doc.text(compNo, boxX + 65, boxY + 46);

  yPos = boxY + boxHeight + 20;

  // Fitness status heading
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text("Medical Status:", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Fitness status value
  doc.setFontSize(22);
  doc.setFont(undefined, "bold");
  if (fitnessStatus.toUpperCase().includes("FIT")) {
    doc.setTextColor(0, 128, 0);
  } else {
    doc.setTextColor(200, 0, 0);
  }
  doc.text(fitnessStatus.toUpperCase(), pageWidth / 2, yPos + 8, { align: "center" });

  yPos += 35;

  // Comments section if present
  if (comments && comments.trim()) {
    doc.setFontSize(11);
    doc.setTextColor(22, 100, 29);
    doc.setFont(undefined, "bold");
    doc.text("Medical Notes:", 30, yPos);
    doc.setFont(undefined, "normal");
    doc.setTextColor(50, 50, 50);
    const splitComments = doc.splitTextToSize(comments, pageWidth - 60);
    doc.text(splitComments, 30, yPos + 8);
    yPos += 8 + splitComments.length * 5;
  }

  // Signature section
  const sigY = yPos + 15;
  doc.setDrawColor(22, 100, 29);
  doc.setLineWidth(0.5);

  // Left signature line (Examiner)
  doc.line(30, sigY, 90, sigY);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Medical Examiner Signature", 60, sigY + 8, { align: "center" });

  // Right signature line (Date)
  doc.line(pageWidth - 90, sigY, pageWidth - 30, sigY);
  doc.text("Date", pageWidth - 60, sigY + 8, { align: "center" });

  // Names & dates below lines
  doc.setFontSize(10);
  doc.setTextColor(22, 100, 29);
  doc.setFont(undefined, "bold");
  doc.text(examinerName, 60, sigY + 18, { align: "center" });
  doc.text(officialDate, pageWidth - 60, sigY + 18, { align: "center" });

  // Stamp area
  const stampY = sigY + 40;
  doc.setDrawColor(22, 100, 29);
  doc.setLineWidth(0.5);
  doc.ellipse(pageWidth / 2, stampY, 30, 18);
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.setFont(undefined, "bold");
  doc.text("OFFICIAL", pageWidth / 2, stampY + 3, { align: "center" });
  doc.text("STAMP", pageWidth / 2, stampY + 10, { align: "center" });

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("UNZA Clinic - Medical Fitness Certificate", pageWidth / 2, pageHeight - 25, { align: "center" });
  addProfessionalFooter(doc, 0);

  doc.save(`${filename}.pdf`);
}

// Alias for backward compatibility
export const generateCertificate = generateMedicalFitnessCertificate;

interface LabReportConfig {
  patientName: string;
  patientId: string;
  testId: string;
  testName: string;
  category: string;
  section: string;
  sampleType: string;
  requestedBy: string;
  reportedBy: string;
  approvedBy: string;
  requestedDate: string;
  specimenCollectedAt: string;
  completedAt: string;
  results: string;
  interpretation: string;
  referenceRange: string;
  abnormalFlag: string;
  filename?: string;
}

export async function generateLabReportPDF(report: LabReportConfig) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const settings = await getClinicSettings();
  const logoBase64 = await getLogoBase64();

  let yPos = addProfessionalHeader(doc, {
    title: "Laboratory Report",
    filename: report.filename || `lab-report-${report.testId}`,
    columns: [],
    data: [],
  }, settings, logoBase64);

  const rows: Array<[string, string]> = [
    ["Patient", `${report.patientName} (${report.patientId})`],
    ["Lab Number", report.testId],
    ["Test", report.testName],
    ["Section", `${report.section}${report.category ? ` | ${report.category}` : ""}`],
    ["Sample", report.sampleType || "N/A"],
    ["Requested By", report.requestedBy],
    ["Reported By", report.reportedBy],
    ["Approved By", report.approvedBy || "Pending supervisor approval"],
    ["Requested Date", report.requestedDate],
    ["Specimen Collected", report.specimenCollectedAt || "Not captured"],
    ["Completed At", report.completedAt || "Not completed"],
    ["Flag", report.abnormalFlag || "pending"],
    ["Reference Range", report.referenceRange || "Not stated"],
    ["Results", report.results || "No result entered"],
    ["Interpretation", report.interpretation || "No interpretation entered"],
  ];

  autoTable(doc, {
    startY: yPos + 5,
    body: rows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold", fillColor: [245, 250, 247] },
      1: { cellWidth: pageWidth - 76 },
    },
    margin: { left: 14, right: 14 },
  });

  addProfessionalFooter(doc, 0);
  doc.save(`${report.filename || `lab-report-${report.testId}`}.pdf`);
}

interface ClinicalFormPDFConfig {
  title: string;
  department: string;
  patientName: string;
  patientId: string;
  formId?: string;
  createdBy?: string;
  createdAt?: string;
  fields: { label: string; value: string }[];
  filename?: string;
}

export async function generateClinicalFormPDF(form: ClinicalFormPDFConfig) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const settings = await getClinicSettings();
  const logoBase64 = await getLogoBase64();

  const startY = addProfessionalHeader(doc, {
    title: form.title,
    subtitle: form.department,
    filename: form.filename || "clinical-form",
    columns: [],
    data: [],
  }, settings, logoBase64);

  const metaRows: Array<[string, string]> = [
    ["Patient", `${form.patientName} (${form.patientId})`],
  ];
  if (form.formId) metaRows.push(["Form ID", form.formId]);
  if (form.createdBy) metaRows.push(["Recorded By", form.createdBy]);
  if (form.createdAt) metaRows.push(["Date", form.createdAt]);

  autoTable(doc, {
    startY: startY + 3,
    body: metaRows,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5, textColor: 90 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  const fieldRows = form.fields
    .filter((field) => field.value && field.value.trim())
    .map((field) => [field.label, field.value]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    head: [["Field", "Value"]],
    body: fieldRows.length > 0 ? fieldRows : [["", "No data recorded"]],
    theme: "grid",
    headStyles: {
      fillColor: [22, 100, 29],
      textColor: 255,
      fontSize: 10,
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 4, textColor: 50 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold", fillColor: [245, 250, 247] },
      1: { cellWidth: pageWidth - 83 },
    },
    margin: { left: 14, right: 14 },
  });

  addProfessionalFooter(doc, 0);
  doc.save(`${form.filename || "clinical-form"}.pdf`);
}

interface InvoicePDFConfig {
  invoiceId: string;
  patientName: string;
  patientId: string;
  studentId?: string;
  manNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  invoiceDate: string;
  paymentMethod: string;
  status: string;
  cumulativeSummary?: string;
  lineItems: { description: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  filename?: string;
}

export async function generateInvoicePDF(invoice: InvoicePDFConfig) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const settings = await getClinicSettings();
  const logoBase64 = await getLogoBase64();

  let yPos = 15;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 14, 10, 22, 22);
    } catch {}
  }

  doc.setFontSize(15);
  doc.setTextColor(22, 100, 29);
  doc.text(settings.hospital_name, 42, 18);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  const contactLine = [settings.address, settings.contact_phone ? `Tel: ${settings.contact_phone}` : ""].filter(Boolean).join(" | ");
  if (contactLine) doc.text(contactLine, 42, 24);

  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "bold");
  doc.text("INVOICE", pageWidth - 14, 20, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(22, 100, 29);
  doc.text(invoice.invoiceId, pageWidth - 14, 26, { align: "right" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(invoice.status.toUpperCase(), pageWidth - 14, 31, { align: "right" });

  doc.setDrawColor(22, 100, 29);
  doc.setLineWidth(0.5);
  doc.line(14, 36, pageWidth - 14, 36);

  yPos = 46;
  doc.setFontSize(8.5);
  doc.setTextColor(140, 140, 140);
  doc.setFont(undefined, "bold");
  doc.text("BILL TO", 14, yPos);
  doc.text("DETAILS", pageWidth - 14, yPos, { align: "right" });
  yPos += 6;

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(invoice.patientName, 14, yPos);
  const detailLines = [
    `Date: ${invoice.invoiceDate}`,
    `Payment: ${invoice.paymentMethod}`,
  ];
  detailLines.forEach((line, index) => doc.text(line, pageWidth - 14, yPos + index * 5, { align: "right" }));

  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  let idLine = invoice.patientId;
  if (invoice.studentId) idLine += ` | ${invoice.studentId}`;
  if (invoice.manNumber) idLine += ` | ${invoice.manNumber}`;
  doc.text(idLine, 14, yPos + 5);
  if (invoice.phone) doc.text(`Tel: ${invoice.phone}`, 14, yPos + 10);
  if (invoice.email) doc.text(invoice.email, 14, yPos + 15);
  if (invoice.address) doc.text(invoice.address, 14, yPos + 20);
  if (invoice.cumulativeSummary) {
    doc.text(invoice.cumulativeSummary, pageWidth - 14, yPos + 10, { align: "right" });
  }

  const tableStartY = yPos + 28;
  autoTable(doc, {
    startY: tableStartY,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: invoice.lineItems.map((item) => [
      item.description,
      String(item.qty),
      `K ${item.unitPrice.toFixed(2)}`,
      `K ${item.total.toFixed(2)}`,
    ]),
    headStyles: {
      fillColor: [22, 100, 29],
      textColor: 255,
      fontSize: 10,
      fontStyle: "bold",
    },
    styles: { fontSize: 9.5, cellPadding: 4, textColor: 50 },
    columnStyles: {
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
  });

  const afterTableY = (doc as any).lastAutoTable.finalY + 8;
  const totalsX = pageWidth - 14;
  let totalsY = afterTableY;
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  doc.setFont(undefined, "normal");
  doc.text("Subtotal", totalsX - 45, totalsY, { align: "right" });
  doc.text(`K ${invoice.subtotal.toFixed(2)}`, totalsX, totalsY, { align: "right" });
  totalsY += 6;
  doc.text("Tax", totalsX - 45, totalsY, { align: "right" });
  doc.text(`K ${invoice.tax.toFixed(2)}`, totalsX, totalsY, { align: "right" });
  totalsY += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX - 70, totalsY, totalsX, totalsY);
  totalsY += 6;
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.setTextColor(22, 100, 29);
  doc.text("Total", totalsX - 45, totalsY, { align: "right" });
  doc.text(`K ${invoice.total.toFixed(2)}`, totalsX, totalsY, { align: "right" });

  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text("Thank you for visiting the UNZA Clinic. For billing queries, contact the finance desk.", pageWidth / 2, totalsY + 20, { align: "center" });

  addProfessionalFooter(doc, 0);
  doc.save(`${invoice.filename || `invoice-${invoice.invoiceId}`}.pdf`);
}
