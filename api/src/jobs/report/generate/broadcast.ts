import { jsPDF } from "jspdf";
import { StatsReport } from "../../../types";
import { COLORS, drawBarChart, drawBoxText, drawLineChart, drawText, formatNumber, PAGE_WIDTH, TEXT_BODY_LINE_HEIGHT, TOP_COLORS } from "./utils";

const CONTAINER_PADDING = 32;

const compare = (a: number, b: number) => (a - b) / (a || 1);

const drawTopOrganizationsTable = (doc: jsPDF, data: StatsReport, x: number, y: number, width: number) => {
  // Container
  doc.setFillColor(255, 255, 255);
  const containerHeight = CONTAINER_PADDING * 2 + TEXT_BODY_LINE_HEIGHT + 16 + 36 * data.send.topOrganizations.length;
  doc.rect(x, y, width, containerHeight, "F");

  let currentY = y + CONTAINER_PADDING;
  const currentX = x + CONTAINER_PADDING;

  // Title
  currentY = drawText(doc, "Top des organisations", currentX, currentY, {
    fontWeight: "bold",
    fontSize: 16,
  });
  currentY += 16;

  // Table content
  if (data.send.topOrganizations.length) {
    for (let i = 0; i < data.send.topOrganizations.length; i++) {
      const item = data.send.topOrganizations[i];
      drawText(doc, `${i + 1}.`, currentX, currentY, {
        fontSize: 12,
        color: TOP_COLORS[i] || COLORS.primary,
      });

      doc.setFont("Marianne", "normal");
      doc.setFontSize(12);
      const textWidth = doc.getTextWidth(item.key);
      if (textWidth > 230) {
        // calculate the number of characters to cut
        const lines = doc.splitTextToSize(item.key, 230);
        const truncatedKey = lines[0];
        drawText(doc, `${truncatedKey}...`, currentX + 24, currentY, {
          fontSize: 12,
          color: TOP_COLORS[i] || COLORS.primary,
        });
      } else {
        drawText(doc, item.key, currentX + 24, currentY, {
          fontSize: 12,
          color: TOP_COLORS[i] || COLORS.primary,
        });
      }

      const statsText = `${formatNumber(item.doc_count)} redirections`;
      drawText(doc, statsText, currentX + 350, currentY, { fontSize: 12, color: COLORS.textGrey });

      const percentText = `${(item.doc_count / data.send.click).toLocaleString("fr", {
        style: "percent",
        maximumFractionDigits: 2,
      })}`;
      drawText(doc, percentText, currentX + 480, currentY, {
        fontSize: 12,
        color: COLORS.textGrey,
      });
      currentY += 36;
    }
  } else {
    doc.setTextColor(COLORS.textGrey);
    doc.setFont("Marianne", "normal");
    doc.setFontSize(12);
    const noDataText = "Aucune donnée disponible";
    const textWidth = doc.getTextWidth(noDataText);
    doc.text(noDataText, currentX + (width - CONTAINER_PADDING * 2 - textWidth) / 2, currentY);
  }

  return y + containerHeight;
};

const drawRepartitionSection = (doc: jsPDF, data: StatsReport, x: number, y: number, width: number) => {
  // Container
  doc.setFillColor(255, 255, 255);
  const containerHeight = 400;
  doc.rect(x, y, width, containerHeight, "F");

  let currentY = y + CONTAINER_PADDING;
  const currentX = x + CONTAINER_PADDING;

  // Title
  currentY = drawText(doc, "Répartition des top organisations", currentX, currentY, {
    fontWeight: "bold",
    fontSize: 16,
  });
  currentY += 24;

  if (data.send.organizationHistogram.length > 0) {
    // Draw bar chart
    drawBarChart(doc, data.send.organizationHistogram, currentX, currentY, width - CONTAINER_PADDING * 2, 300, TOP_COLORS);
  } else {
    // No data message
    doc.setTextColor(COLORS.textGrey);
    doc.setFont("Marianne", "normal");
    doc.setFontSize(12);
    const noDataText = "Aucune donnée disponible";
    const textWidth = doc.getTextWidth(noDataText);
    doc.text(noDataText, currentX + (width - CONTAINER_PADDING * 2 - textWidth) / 2, currentY + 150);
  }

  return currentY;
};

const drawMainContainer = (doc: jsPDF, data: StatsReport, x: number, y: number, width: number) => {
  // Container
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, width, 680, "F");

  let currentY = y + CONTAINER_PADDING;
  let currentX = x + CONTAINER_PADDING;

  // Title
  currentY = drawText(doc, "Redirections et candidatures envoyées", currentX, currentY, {
    fontWeight: "bold",
    fontSize: 16,
  });
  currentY += 24;

  // Chart area
  const chartHeight = 360;
  const chartWidth = width - CONTAINER_PADDING * 2;
  const chartX = x + CONTAINER_PADDING;
  const chartY = currentY;

  drawLineChart(doc, data.send.graphYears, chartX, chartY, chartWidth, chartHeight);

  currentY += chartHeight + 40;

  // Click
  let clickY = currentY;
  const clickRaise = compare(data.send.click, data.send.clickLastMonth);
  const clickYearRaise = compare(data.send.clickYear, data.send.clickLastYear);
  clickY = drawText(doc, "Redirections ce mois-ci", currentX, clickY, {
    fontWeight: "bold",
    fontSize: 14,
    color: COLORS.primary,
  });
  clickY = drawText(doc, formatNumber(data.send.click), currentX, clickY, {
    fontWeight: "bold",
    fontSize: 16,
  });
  const clickRaiseText = `${clickRaise < 0 ? "-" : "+"} ${Math.abs(clickRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}`;
  const { width: clickRaiseWidth } = drawBoxText(doc, clickRaiseText, currentX, clickY, clickRaise < 0 ? "#FFE9E9" : "#B8FEC9", {
    fontSize: 12,
    color: clickRaise < 0 ? "#CE0500" : "#18753C",
  });
  clickY = drawText(doc, "par rapport au mois dernier", currentX + clickRaiseWidth + 2, clickY, {
    fontSize: 12,
    color: COLORS.textGrey,
  });
  clickY += 16;
  clickY = drawText(doc, `Total ${data.year}`, currentX, clickY, {
    fontWeight: "bold",
    fontSize: 14,
    color: COLORS.primary,
  });
  clickY = drawText(doc, formatNumber(data.send.clickYear), currentX, clickY, {
    fontWeight: "bold",
    fontSize: 16,
  });
  const clickYearRaiseText = `${clickYearRaise < 0 ? "-" : "+"} ${Math.abs(clickYearRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}`;
  const { width: clickYearRaiseWidth } = drawBoxText(doc, clickYearRaiseText, currentX, clickY, clickYearRaise < 0 ? "#FFE9E9" : "#B8FEC9", {
    fontSize: 12,
    color: clickYearRaise < 0 ? "#CE0500" : "#18753C",
  });
  drawText(doc, `par rapport à ${data.year - 1}`, currentX + clickYearRaiseWidth + 2, clickY, {
    fontSize: 12,
    color: COLORS.textGrey,
  });

  // Apply
  currentX += width / 2;
  let applyY = currentY;
  const applyRaise = compare(data.send.apply, data.send.applyLastMonth);
  const applyYearRaise = compare(data.send.applyYear, data.send.applyLastYear);
  applyY = drawText(doc, "Candidatures ce mois-ci", currentX, applyY, {
    fontWeight: "bold",
    fontSize: 14,
    color: COLORS.secondary,
  });
  applyY = drawText(doc, formatNumber(data.send.apply), currentX, applyY, {
    fontWeight: "bold",
    fontSize: 16,
  });
  const applyRaiseText = `${applyRaise < 0 ? "-" : "+"} ${Math.abs(applyRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}`;
  const { width: applyRaiseWidth } = drawBoxText(doc, applyRaiseText, currentX, applyY, applyRaise < 0 ? "#FFE9E9" : "#B8FEC9", {
    fontSize: 12,
    color: applyRaise < 0 ? "#CE0500" : "#18753C",
  });
  applyY = drawText(doc, "par rapport au mois dernier", currentX + applyRaiseWidth + 2, applyY, {
    fontSize: 12,
    color: COLORS.textGrey,
  });

  applyY += 16;
  applyY = drawText(doc, `Total ${data.year}`, currentX, applyY, {
    fontWeight: "bold",
    fontSize: 14,
    color: COLORS.secondary,
  });
  applyY = drawText(doc, formatNumber(data.send.applyYear), currentX, applyY, {
    fontWeight: "bold",
    fontSize: 16,
  });

  const applyYearRaiseText = `${applyYearRaise < 0 ? "-" : "+"} ${Math.abs(applyYearRaise).toLocaleString("fr", { style: "percent", maximumFractionDigits: 2 })}`;
  const { width: applyYearRaiseWidth } = drawBoxText(doc, applyYearRaiseText, currentX, applyY, applyYearRaise < 0 ? "#FFE9E9" : "#B8FEC9", {
    fontSize: 12,
    color: applyYearRaise < 0 ? "#CE0500" : "#18753C",
  });
  drawText(doc, `par rapport à ${data.year - 1}`, currentX + applyYearRaiseWidth + 2, applyY, {
    fontSize: 12,
    color: COLORS.textGrey,
  });

  return Math.max(currentY, applyY);
};

export const generateBroadcast = (doc: jsPDF, data: StatsReport) => {
  // Title
  let currentY = 224 + CONTAINER_PADDING;
  const currentX = CONTAINER_PADDING;

  currentY = drawText(doc, "Votre rôle de diffuseur", currentX, currentY, {
    fontWeight: "bold",
    fontSize: 20,
  });
  currentY += 24;

  // Main
  drawMainContainer(doc, data, CONTAINER_PADDING, currentY, PAGE_WIDTH / 2 - CONTAINER_PADDING * 1.5);

  // Top organizations table
  currentY = drawTopOrganizationsTable(doc, data, PAGE_WIDTH / 2 + CONTAINER_PADDING * 0.5, currentY, PAGE_WIDTH / 2 - CONTAINER_PADDING * 1.5);
  currentY += 24;
  // Repartition
  drawRepartitionSection(doc, data, PAGE_WIDTH / 2 + CONTAINER_PADDING * 0.5, currentY, PAGE_WIDTH / 2 - CONTAINER_PADDING * 1.5);
};
