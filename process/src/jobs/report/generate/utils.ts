import jsPDF from "jspdf";

export const PAGE_WIDTH = 1360;
export const PAGE_HEIGHT = 1116;
export const TEXT_SIZE_FACTOR = 1.33;
export const TEXT_BODY_LINE_HEIGHT = 24;
export const TEXT_TITLE_LINE_HEIGHT = 28;

export const COLORS = {
  primary: "#000091",
  secondary: "#FA7A35",
  primaryLight: "#B3B3DE",
  secondaryLight: "#FDD7C2",
  textGrey: "#666666",
};

export const TOP_COLORS = ["#000091", "#FB955D", "#F96666", "#54D669", "#FF6FF1"];

export const formatNumber = (number: number) => {
  return number.toLocaleString("fr").replace(/\s/g, " ");
};

export const drawText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: { fontSize?: number; fontWeight?: string; color?: string; lineHeight?: number; lineHeightFactor?: number; width?: number },
) => {
  doc.setTextColor(options?.color || "#000000");
  doc.setFont("Marianne", options?.fontWeight || "normal");
  doc.setFontSize((options?.fontSize || 12) * TEXT_SIZE_FACTOR);
  let height = 0;
  if (options?.width) {
    const lines = doc.splitTextToSize(text, options.width);
    doc.text(lines, x, y + (options?.lineHeight || TEXT_BODY_LINE_HEIGHT) - 6, { lineHeightFactor: options?.lineHeightFactor || 1.5 });
    height = y + lines.length * (options?.lineHeightFactor || 1.5) * (options?.fontSize || 12) * TEXT_SIZE_FACTOR;
  } else {
    doc.text(text, x, y + (options?.lineHeight || TEXT_BODY_LINE_HEIGHT) - 6, { lineHeightFactor: options?.lineHeightFactor || 1.5 });
    height = y + (options?.lineHeight || TEXT_BODY_LINE_HEIGHT);
  }

  return height;
};

export const drawLink = (
  doc: jsPDF,
  text: string,
  url: string,
  x: number,
  y: number,
  options?: { fontSize?: number; fontWeight?: string; color?: string; lineHeight?: number },
) => {
  doc.setTextColor(options?.color || "#000000");
  doc.setFont("Marianne", options?.fontWeight || "normal");
  doc.setFontSize((options?.fontSize || 12) * TEXT_SIZE_FACTOR);
  doc.textWithLink(text, x, y + (options?.lineHeight || TEXT_BODY_LINE_HEIGHT) - 6, { url });
  const textWidth = doc.getTextWidth(text);
  doc.setDrawColor(options?.color || "#000000");
  doc.setLineWidth(options?.fontWeight === "bold" ? 1 : 0.5);
  doc.line(x, y + (options?.lineHeight || TEXT_BODY_LINE_HEIGHT) - 3, x + textWidth, y + (options?.lineHeight || TEXT_BODY_LINE_HEIGHT) - 3);
};

export const drawBoxText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  backgroundColor: string,
  options?: { fontSize?: number; fontWeight?: string; color?: string; lineHeight?: number; lineHeightFactor?: number; width?: number },
) => {
  doc.setFont("Marianne", options?.fontWeight || "normal");
  doc.setFontSize((options?.fontSize || 12) * TEXT_SIZE_FACTOR);
  doc.setTextColor(options?.color || "#000000");
  const textWidth = doc.getTextWidth(text);
  doc.setFillColor(backgroundColor);
  doc.rect(x, y + 4, textWidth + 6, 20, "F");
  doc.text(text, x + 3, y + TEXT_BODY_LINE_HEIGHT - 6);
  return { width: textWidth + 6, height: 20 };
};

interface Point {
  x: number;
  y: number;
}

export const drawLineChart = (
  doc: jsPDF,
  data: { month: Date; click: number; clickLastYear: number; apply: number; applyLastYear: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  // Sort data by month
  data.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Calculate actual chart dimensions accounting for labels and legend
  const chartX = x + 40; // Space for Y-axis labels
  const chartY = y; // Space for legend
  const chartWidth = width - 50; // Account for labels padding
  const chartHeight = height - 24; // Account for X-axis labels and legend

  // Find max value for Y scale
  const maxValue = Math.max(...data.map((d) => Math.max(d.click, d.clickLastYear, d.apply, d.applyLastYear)));
  const yScale = chartHeight / (maxValue * 1.2); // Increased padding to 20%
  const xScale = chartWidth / (data.length - 1);

  // Draw grid
  doc.setDrawColor("#E5E5E5");
  doc.setLineWidth(0.5);

  // Horizontal grid lines
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const yPos = chartY + chartHeight - (chartHeight * i) / gridLines;
    doc.line(x, yPos, chartX + chartWidth, yPos);

    // Add Y-axis labels with padding
    const value = Math.round((maxValue * i) / gridLines);
    drawText(doc, value.toLocaleString("fr"), x, yPos + 4, { fontSize: 10, color: COLORS.textGrey });
  }

  // Draw X-axis labels (months)
  const MONTHS = ["janv.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  data.forEach((d, i) => {
    const xPos = chartX + i * xScale;
    doc.setFont("Marianne", "normal");
    doc.text(MONTHS[new Date(d.month).getMonth()], xPos, chartY + chartHeight + 24);
  });

  // Convert data points to coordinates
  const getPoints = (values: number[]): Point[] => {
    return values.map((value, i) => ({
      x: chartX + i * xScale,
      y: chartY + chartHeight - value * yScale,
    }));
  };

  const clickPoints = getPoints(data.map((d) => d.click));
  const clickLastYearPoints = getPoints(data.map((d) => d.clickLastYear));
  const applyPoints = getPoints(data.map((d) => d.apply));
  const applyLastYearPoints = getPoints(data.map((d) => d.applyLastYear));

  // Draw lines with thinner width
  const drawLine = (points: Point[], color: string, width: number) => {
    doc.setDrawColor(color);
    doc.setLineWidth(width);

    points.forEach((point, i) => {
      if (i === 0) return;
      doc.line(points[i - 1].x, points[i - 1].y, point.x, point.y);
    });

    // Draw only the last dot
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      doc.setFillColor(color);
      doc.circle(lastPoint.x, lastPoint.y, 2, "F");
    }
  };

  // Draw all lines with thinner width
  drawLine(clickPoints, COLORS.primary, 1.5);
  drawLine(clickLastYearPoints, COLORS.primaryLight, 1.5);
  drawLine(applyPoints, COLORS.secondary, 1.5);
  drawLine(applyLastYearPoints, COLORS.secondaryLight, 1.5);
};

export const drawBarChart = (doc: jsPDF, data: { month: number; [key: string]: number }[], x: number, y: number, width: number, height: number, colors: string[]) => {
  // Sort data by month
  data.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Calculate dimensions
  const chartX = x + 40;
  const chartY = y;
  const chartWidth = width - 50;
  const chartHeight = height - 24;

  // Get all organization keys (excluding 'month')
  const orgKeys = Object.keys(data[0]).filter((key) => key !== "month");

  // Calculate max value for Y scale (sum of all values per month)
  const maxValue = Math.max(...data.map((d) => orgKeys.reduce((sum, key) => sum + (d[key] || 0), 0)));
  const yScale = chartHeight / (maxValue * 1.2);
  const barWidth = (chartWidth / data.length) * 0.8; // 80% of available space
  const barGap = (chartWidth / data.length) * 0.2; // 20% gap

  // Draw grid
  doc.setDrawColor("#E5E5E5");
  doc.setLineWidth(0.5);

  // Horizontal grid lines
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const yPos = chartY + chartHeight - (chartHeight * i) / gridLines;
    doc.line(x, yPos, chartX + chartWidth, yPos);

    // Add Y-axis labels
    const value = Math.round((maxValue * i) / gridLines);
    drawText(doc, value.toLocaleString("fr"), x, yPos + 4, { fontSize: 10, color: COLORS.textGrey });
  }

  // Draw X-axis labels (months)
  const MONTHS = ["janv.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  // Draw bars
  data.forEach((monthData, monthIndex) => {
    const xPos = chartX + monthIndex * (barWidth + barGap);
    let yPos = chartY + chartHeight;
    let stackHeight = 0;

    // Draw month label
    const month = new Date(monthData.month).getMonth();
    doc.setFont("Marianne", "normal");
    doc.text(MONTHS[month], xPos, chartY + chartHeight + 24);

    // Draw stacked bars for each organization
    orgKeys.forEach((org, orgIndex) => {
      const value = monthData[org] || 0;
      const barHeight = value * yScale;

      doc.setFillColor(colors[orgIndex] || COLORS.primary);
      doc.rect(xPos, yPos - barHeight - stackHeight, barWidth, barHeight, "F");

      stackHeight += barHeight;
    });
  });
};

export const drawSVG = (doc: jsPDF, svg: string, x: number, y: number) => {
  const fillColor = "#000091";

  const svgPath = svg.match(/<path d="([^"]+)"/)?.[1];
  if (!svgPath) return;

  const path = parseSVGPath(svgPath, x, y);
  doc.path(path, "F");
  // Unknown why but the path color is always the one of a draw after a path... not gonna fight for it
  doc.setFillColor(fillColor);
  doc.rect(x, y + 100, 1, 1, "F");
  doc.setFillColor("#ffffff");
  doc.rect(x - 1, y + 99, 3, 3, "F");
};

const parseSVGPath = (svgPath: string, offsetX: number, offsetY: number) => {
  const commands = svgPath.match(/([a-zA-Z])([^a-zA-Z]*)/g) || [];
  let currentX = 0;
  let currentY = 0;

  return commands.map((cmd) => {
    const op = cmd[0];
    const coords = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    const isRelative = op === op.toLowerCase();

    switch (op.toLowerCase()) {
      case "m": {
        // First move command should include the offset
        if (currentX === 0 && currentY === 0) {
          currentX = isRelative ? offsetX + coords[0] : offsetX + coords[0];
          currentY = isRelative ? offsetY + coords[1] : offsetY + coords[1];
        } else {
          currentX = isRelative ? currentX + coords[0] : offsetX + coords[0];
          currentY = isRelative ? currentY + coords[1] : offsetY + coords[1];
        }
        return {
          op: "m",
          c: [currentX, currentY],
        };
      }
      case "l": {
        currentX = isRelative ? currentX + coords[0] : offsetX + coords[0];
        currentY = isRelative ? currentY + coords[1] : offsetY + coords[1];
        return {
          op: "l",
          c: [currentX, currentY],
        };
      }
      case "h": {
        currentX = isRelative ? currentX + coords[0] : offsetX + coords[0];
        return {
          op: "l",
          c: [currentX, currentY],
        };
      }
      case "v": {
        currentY = isRelative ? currentY + coords[0] : offsetY + coords[0];
        return {
          op: "l",
          c: [currentX, currentY],
        };
      }
      case "c": {
        const [x1, y1, x2, y2, x, y] = coords;
        if (isRelative) {
          const cx1 = currentX + x1;
          const cy1 = currentY + y1;
          const cx2 = currentX + x2;
          const cy2 = currentY + y2;
          currentX = currentX + x;
          currentY = currentY + y;
          return {
            op: "c",
            c: [cx1, cy1, cx2, cy2, currentX, currentY],
          };
        } else {
          currentX = offsetX + x;
          currentY = offsetY + y;
          return {
            op: "c",
            c: [offsetX + x1, offsetY + y1, offsetX + x2, offsetY + y2, currentX, currentY],
          };
        }
      }
      case "z":
        return {
          op: "h",
          c: [],
        };
      default:
        return {
          op: "m",
          c: [currentX, currentY],
        };
    }
  });
};
