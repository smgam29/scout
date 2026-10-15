import { jsPDF } from "jspdf";

import { plainTextFromHtml } from "@/lib/learned-html";
import type { PictureSlot, ProjectWork } from "@/lib/storage";

/** Scout UI palette approximated for jsPDF RGB. */
const brand = {
  background: [240, 244, 246] as const,
  foreground: [42, 58, 66] as const,
  muted: [90, 107, 115] as const,
  card: [252, 253, 253] as const,
  border: [208, 216, 220] as const,
  tide: [31, 74, 85] as const,
  tideForeground: [244, 250, 250] as const,
  tideMuted: [197, 217, 219] as const,
  primary: [232, 200, 74] as const,
  primaryForeground: [44, 69, 80] as const,
  mutedFill: [236, 240, 242] as const,
};

function slugTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "scout-project"
  );
}

function rgb(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function fill(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function stroke(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function paintPageBackground(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  fill(doc, brand.background);
  doc.rect(0, 0, w, h, "F");
}

function drawCompass(doc: jsPDF, x: number, y: number, size: number) {
  fill(doc, brand.tide);
  doc.circle(x, y, size / 2, "F");
  stroke(doc, brand.primary);
  doc.setLineWidth(1.4);
  doc.circle(x, y, size / 2 - 2, "S");
  fill(doc, brand.primary);
  doc.triangle(
    x,
    y - size * 0.28,
    x - size * 0.1,
    y + size * 0.08,
    x + size * 0.1,
    y + size * 0.08,
    "F",
  );
  fill(doc, brand.tideForeground);
  doc.triangle(
    x,
    y + size * 0.28,
    x - size * 0.08,
    y - size * 0.02,
    x + size * 0.08,
    y - size * 0.02,
    "F",
  );
}

function pictureSlots(work: ProjectWork): PictureSlot[] {
  const slots = work.pictures.slice(0, work.project.imageCount);
  while (slots.length < work.project.imageCount) {
    slots.push({ description: "", dataUrl: "", style: "cartoon", generations: 0 });
  }
  return slots;
}

export async function downloadProjectPdf(work: ProjectWork): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  paintPageBackground(doc);

  function ensureSpace(needed: number) {
    if (y + needed <= pageHeight - margin) return;
    doc.addPage();
    paintPageBackground(doc);
    y = margin;
  }

  function sectionHeading(text: string) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    rgb(doc, brand.foreground);
    doc.text(text, margin, y);
    y += 8;
    stroke(doc, brand.border);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + contentWidth, y);
    y += 16;
  }

  // Brand header
  drawCompass(doc, margin + 12, y + 12, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  rgb(doc, brand.foreground);
  doc.text("Scout", margin + 34, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rgb(doc, brand.muted);
  doc.text("Ask Scout, make 2 pictures, write what you learned.", margin + 34, y + 34);
  y += 52;

  // Tide project card
  const title = work.project.title || "Project";
  const task = work.project.task || "";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(title, contentWidth - 36) as string[];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const taskLines = doc.splitTextToSize(task, contentWidth - 36) as string[];
  const tideHeight = 28 + 18 + titleLines.length * 30 + 10 + taskLines.length * 16 + 28;

  ensureSpace(tideHeight + 12);
  fill(doc, brand.tide);
  doc.roundedRect(margin, y, contentWidth, tideHeight, 14, 14, "F");

  let cardY = y + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  rgb(doc, brand.tideMuted);
  doc.text("SCOUT", margin + 18, cardY);

  const badge = "Complete";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const badgeW = doc.getTextWidth(badge) + 16;
  const badgeX = margin + contentWidth - 18 - badgeW;
  fill(doc, brand.primary);
  doc.roundedRect(badgeX, cardY - 11, badgeW, 18, 6, 6, "F");
  rgb(doc, brand.primaryForeground);
  doc.text(badge, badgeX + 8, cardY + 2);

  cardY += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  rgb(doc, brand.tideForeground);
  for (const line of titleLines) {
    doc.text(line, margin + 18, cardY);
    cardY += 30;
  }
  cardY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  rgb(doc, brand.tideMuted);
  for (const line of taskLines) {
    doc.text(line, margin + 18, cardY);
    cardY += 16;
  }

  y += tideHeight + 28;

  // Pictures — 50/50
  sectionHeading("Pictures");
  const pictures = pictureSlots(work);
  const gap = 16;
  const cellW = (contentWidth - gap) / 2;
  const cellPad = 12;
  const labelH = 18;
  const imageSize = cellW - cellPad * 2;
  const captionBlock = 44;
  const cellH = cellPad + labelH + 8 + imageSize + 12 + captionBlock + cellPad;

  ensureSpace(cellH + 8);
  const rowTop = y;

  pictures.forEach((picture, index) => {
    const x = margin + index * (cellW + gap);
    fill(doc, brand.card);
    stroke(doc, brand.border);
    doc.setLineWidth(1);
    doc.roundedRect(x, rowTop, cellW, cellH, 12, 12, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    rgb(doc, brand.foreground);
    doc.text(`Picture ${index + 1}`, x + cellPad, rowTop + cellPad + 12);

    const imgX = x + cellPad;
    const imgY = rowTop + cellPad + labelH + 8;
    fill(doc, brand.mutedFill);
    stroke(doc, brand.border);
    doc.roundedRect(imgX, imgY, imageSize, imageSize, 10, 10, "FD");

    if (picture.dataUrl) {
      try {
        const format = picture.dataUrl.includes("image/png") ? "PNG" : "JPEG";
        // Clip-ish: draw image then re-stroke frame
        doc.addImage(picture.dataUrl, format, imgX, imgY, imageSize, imageSize);
        stroke(doc, brand.border);
        doc.roundedRect(imgX, imgY, imageSize, imageSize, 10, 10, "S");
      } catch {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        rgb(doc, brand.muted);
        doc.text("Picture missing", imgX + 12, imgY + imageSize / 2);
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      rgb(doc, brand.muted);
      doc.text("No picture yet.", imgX + 12, imgY + imageSize / 2);
    }

    const caption = picture.description.trim() || "No description";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    rgb(doc, brand.muted);
    const captionLines = doc.splitTextToSize(caption, cellW - cellPad * 2) as string[];
    let cy = imgY + imageSize + 18;
    for (const line of captionLines.slice(0, 3)) {
      doc.text(line, x + cellPad, cy);
      cy += 13;
    }
  });

  y = rowTop + cellH + 28;

  // What I learned card
  sectionHeading("What I learned");
  const learned = plainTextFromHtml(work.learnedHtml || "").trim() || "Nothing written yet.";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const bodyLines = doc.splitTextToSize(learned, contentWidth - 36) as string[];

  let index = 0;
  while (index < bodyLines.length) {
    ensureSpace(80);
    const room = pageHeight - margin - y - 24;
    const fit = Math.max(1, Math.floor((room - 36) / 16));
    const chunk = bodyLines.slice(index, index + fit);
    const chunkH = 28 + chunk.length * 16 + 20;

    fill(doc, brand.card);
    stroke(doc, brand.border);
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth, chunkH, 12, 12, "FD");

    let textY = y + 26;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    rgb(doc, learned === "Nothing written yet." ? brand.muted : brand.foreground);
    for (const line of chunk) {
      doc.text(line, margin + 18, textY);
      textY += 16;
    }

    y += chunkH + 12;
    index += chunk.length;
  }

  ensureSpace(28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  rgb(doc, brand.muted);
  doc.text("Made with Scout", margin, pageHeight - 24);
  doc.text("Research projects for kids", pageWidth - margin, pageHeight - 24, {
    align: "right",
  });

  doc.save(`scout-${slugTitle(work.project.title)}.pdf`);
}
