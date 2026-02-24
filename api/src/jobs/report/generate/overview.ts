import { jsPDF } from "jspdf";
import { StatsReport } from "@/types/report";
import { drawBoxText, drawSVG, drawText, formatNumber, PAGE_WIDTH } from "@/jobs/report/generate/utils";

const CONTAINER_PADDING = 32;
const BOX_STATS_HEIGHT = 82;
const BOX_TOP_HEIGHT = 130;
const BOX_PADDING = 16;
const BOX_GAP = 16;

const ICONS = {
  print: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 4C23.1893 4 29.1706 9.17333 30.4253 16C29.172 22.8267 23.1893 28 16 28C8.81065 28 2.82931 22.8267 1.57465 16C2.82798 9.17333 8.81065 4 16 4ZM16 25.3333C21.6001 25.3321 26.4557 21.4596 27.7026 16C26.4512 10.5449 21.5968 6.67804 16 6.67804C10.4032 6.67804 5.54876 10.5449 4.29731 16C5.54421 21.4596 10.3998 25.3321 16 25.3333ZM16 22C12.6863 22 9.99998 19.3137 9.99998 16C9.99998 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22ZM16 19.3333C17.8409 19.3333 19.3333 17.841 19.3333 16C19.3333 14.1591 17.8409 12.6667 16 12.6667C14.159 12.6667 12.6666 14.1591 12.6666 16C12.6666 17.841 14.159 19.3333 16 19.3333Z" fill="#000091"/>
  </svg>`,
  click: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.3333 8V10.6667H6.66667V25.3333H21.3333V18.6667H24V26.6667C24 27.403 23.403 28 22.6667 28H5.33333C4.59695 28 4 27.403 4 26.6667V9.33333C4 8.59695 4.59695 8 5.33333 8H13.3333ZM28 4V14.6667H25.3333V8.55067L14.9427 18.9427L13.0573 17.0573L23.4467 6.66667H17.3333V4H28Z" fill="#000091"/>
</svg>`,
  account: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3.99998 23.9999H28V7.99992H3.99998V23.9999ZM1.33331 6.66659C1.33331 5.93021 1.93027 5.33325 2.66665 5.33325H29.3333C30.0697 5.33325 30.6666 5.93021 30.6666 6.66659V25.3333C30.6666 26.0697 30.0697 26.6666 29.3333 26.6666H2.66665C1.93027 26.6666 1.33331 26.0697 1.33331 25.3333V6.66659ZM12 13.3333C12 12.5969 11.403 11.9999 10.6666 11.9999C9.93027 11.9999 9.33331 12.5969 9.33331 13.3333C9.33331 14.0697 9.93027 14.6666 10.6666 14.6666C11.403 14.6666 12 14.0697 12 13.3333ZM14.6666 13.3333C14.6666 15.5425 12.8758 17.3333 10.6666 17.3333C8.45751 17.3333 6.66665 15.5425 6.66665 13.3333C6.66665 11.1241 8.45751 9.33325 10.6666 9.33325C12.8758 9.33325 14.6666 11.1241 14.6666 13.3333ZM10.669 21.3333C9.38002 21.3333 8.21518 21.8542 7.36922 22.7001L5.48361 20.8145C6.80922 19.4889 8.64438 18.6666 10.669 18.6666C12.6937 18.6666 14.5289 19.4889 15.8545 20.8145L13.9689 22.7001C13.1229 21.8542 11.9581 21.3333 10.669 21.3333ZM21.6094 19.6094L26.9428 14.2761L25.0572 12.3904L20.6666 16.781L18.2761 14.3905L16.3905 16.2761L19.7238 19.6094L20.6666 20.5522L21.6094 19.6094Z" fill="#000091"/>
</svg>`,
  apply: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.3334 18.6666C19.2244 18.6666 24 23.4422 24 29.3333H21.3334C21.3334 24.915 17.7516 21.3333 13.3334 21.3333C8.91508 21.3333 5.33335 24.915 5.33335 29.3333H2.66669C2.66669 23.4422 7.44232 18.6666 13.3334 18.6666ZM24.3787 19.6039C28.2061 21.3277 30.6671 25.1356 30.6667 29.3333H28C28.0006 26.1848 26.1548 23.3287 23.284 22.0359L24.3774 19.6039H24.3787ZM23.4614 4.55059C26.2088 5.68305 28.0011 8.3616 28 11.3333C28.0012 15.1257 25.1101 18.2931 21.3334 18.6373V15.9533C23.3614 15.6628 24.9628 14.0836 25.2816 12.0598C25.6003 10.0361 24.5619 8.04106 22.7214 7.14125L23.4614 4.55059ZM13.3334 1.33325C17.7534 1.33325 21.3334 4.91325 21.3334 9.33325C21.3334 13.7533 17.7534 17.3333 13.3334 17.3333C8.91335 17.3333 5.33335 13.7533 5.33335 9.33325C5.33335 4.91325 8.91335 1.33325 13.3334 1.33325ZM13.3334 3.99992C10.3867 3.99992 8.00002 6.38659 8.00002 9.33325C8.00002 12.2799 10.3867 14.6666 13.3334 14.6666C16.28 14.6666 18.6667 12.2799 18.6667 9.33325C18.6667 6.38659 16.28 3.99992 13.3334 3.99992Z" fill="#000091"/>
</svg>`,
  rate: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.6666 6.76111C10.5791 7.34578 7.34585 10.579 6.76117 14.6666H9.33331V17.3333H6.76117C7.34585 21.4209 10.5791 24.6541 14.6666 25.2387V22.6666H17.3333V25.2387C21.4209 24.6541 24.6541 21.4209 25.2388 17.3333H22.6666V14.6666H25.2388C24.6541 10.579 21.4209 7.34578 17.3333 6.76111V9.33325H14.6666V6.76111ZM4.07322 14.6666C4.68809 9.10442 9.10449 4.68802 14.6666 4.07316V1.33325H17.3333V4.07316C22.8954 4.68802 27.3118 9.10442 27.9268 14.6666H30.6666V17.3333H27.9268C27.3118 22.8954 22.8954 27.3118 17.3333 27.9267V30.6666H14.6666V27.9267C9.10449 27.3118 4.68809 22.8954 4.07322 17.3333H1.33331V14.6666H4.07322ZM18.6666 15.9999C18.6666 17.4727 17.4728 18.6666 16 18.6666C14.5272 18.6666 13.3333 17.4727 13.3333 15.9999C13.3333 14.5271 14.5272 13.3333 16 13.3333C17.4728 13.3333 18.6666 14.5271 18.6666 15.9999Z" fill="#000091"/>
</svg>`,
  table: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M28 4C28.7364 4 29.3334 4.59695 29.3334 5.33333V26.6667C29.3334 27.403 28.7364 28 28 28H4.00002C3.26364 28 2.66669 27.403 2.66669 26.6667V5.33333C2.66669 4.59695 3.26364 4 4.00002 4H28ZM26.6667 14.6667H5.33335V25.3333H26.6667V14.6667ZM10.6667 16V22.6667H6.66669V16H10.6667ZM26.6667 6.66667H5.33335V12H26.6667V6.66667ZM9.33335 8V10.6667H6.66669V8H9.33335ZM14.6667 8V10.6667H12V8H14.6667Z" fill="#000091"/>
</svg>`,
};

const compare = (a: number, b: number) => (a - b) / (a || 1);

interface StatBoxProps {
  doc: jsPDF;
  x: number;
  y: number;
  width: number;
  icon: keyof typeof ICONS;
  title: string;
  value: number;
  compareValue: number;
}

const drawStatBox = ({ doc, x, y, width, icon, title, value, compareValue }: StatBoxProps) => {
  // Save graphics state
  doc.saveGraphicsState();

  // Box container
  doc.setDrawColor("#dddddd");
  doc.setLineWidth(1);
  doc.rect(x, y, width, BOX_STATS_HEIGHT);
  doc.line(x + BOX_STATS_HEIGHT, y, x + BOX_STATS_HEIGHT, y + BOX_STATS_HEIGHT);

  // Restore graphics state before drawing SVG
  doc.restoreGraphicsState();

  // Draw icon
  drawSVG(doc, ICONS[icon], x + BOX_PADDING + 10, y + BOX_PADDING + 10);

  let currentY = y + BOX_PADDING;
  const currentX = x + BOX_STATS_HEIGHT + BOX_PADDING;

  // Title
  currentY = drawText(doc, `${formatNumber(value)} ${title}`, currentX, currentY, {
    fontWeight: "bold",
    fontSize: 16,
  });

  // Comparison
  const raise = compare(value, compareValue);
  const raisePct = Math.abs(raise).toLocaleString("fr", {
    style: "percent",
    maximumFractionDigits: 2,
  });
  const raiseText = `${raise < 0 ? "-" : "+"} ${raisePct}`;
  const { width: raiseWidth } = drawBoxText(doc, raiseText, currentX, currentY, raise < 0 ? "#FFE9E9" : "#B8FEC9", { fontSize: 12, color: raise < 0 ? "#CE0500" : "#18753C" });
  drawText(doc, "par rapport au mois dernier", currentX + raiseWidth + 2, currentY, {
    fontSize: 12,
    color: "#666666",
  });
};

interface TopBoxProps {
  doc: jsPDF;
  x: number;
  y: number;
  width: number;
  title: string;
  value: { key: string; doc_count: number }[];
}
const drawTopBox = ({ doc, x, y, width, title, value }: TopBoxProps) => {
  // Box container
  doc.setDrawColor("#dddddd");
  doc.setLineWidth(1);
  doc.rect(x, y, width, BOX_TOP_HEIGHT);
  doc.line(x + BOX_STATS_HEIGHT, y, x + BOX_STATS_HEIGHT, y + BOX_TOP_HEIGHT);

  drawSVG(doc, ICONS["table"], x + BOX_PADDING + 10, y + BOX_PADDING + 10);

  let currentY = y + BOX_PADDING;
  const currentX = x + BOX_STATS_HEIGHT + BOX_PADDING;

  // Title
  currentY = drawText(doc, title, currentX, currentY, { fontWeight: "bold", fontSize: 16 });

  // Top publishers
  const topPublishers = value.slice(0, 3).map((top: { key: string; doc_count: number }, index: number) => {
    return `${index + 1}. ${top.key} - ${formatNumber(top.doc_count)} redirections`;
  });

  for (const top of topPublishers) {
    currentY = drawText(doc, top, currentX, currentY, { fontSize: 12, color: "#666666" });
  }
};

const generateOverviewSection = (doc: jsPDF, data: StatsReport, x: number, width: number, isAnnounce: boolean, useSingleColumn: boolean = false) => {
  // White container with padding
  doc.setFillColor(255, 255, 255);
  doc.rect(x, 224, width, useSingleColumn ? 838 : 520, "F");

  let currentY = 224 + CONTAINER_PADDING;
  const currentX = x + CONTAINER_PADDING;

  // Title and description
  const title = isAnnounce ? "En tant qu'annonceur, vous avez reçu" : "En tant que diffuseur, vous avez envoyé";
  currentY = drawText(doc, title, currentX, currentY, { fontWeight: "bold", fontSize: 20 });

  // Description text
  const description = isAnnounce
    ? "L'API Engagement vous met en relation avec des plateformes qui diffusent vos missions. Ces statistiques résument l'engagement que vous avez reçu vers vos missions grâce à vos partenaires diffuseurs."
    : "L'API Engagement vous met en relation avec des annonceurs qui proposent des missions. Ces statistiques résument l'engagement que vous avez généré vers les missions de vos partenaires.";
  currentY = drawText(doc, description, currentX, currentY + 8, {
    fontSize: 14,
    lineHeightFactor: 1.5,
    width: width - CONTAINER_PADDING * 2,
  });

  const stats = isAnnounce ? data.receive : data.send;
  if (!stats?.hasStats) {
    return;
  }

  const boxWidth = width - CONTAINER_PADDING * 2; // 32px padding on each side

  if (useSingleColumn) {
    // Single column layout
    // Prints
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: currentY,
      width: boxWidth,
      icon: "print",
      title: "impressions",
      value: stats.print,
      compareValue: stats.printLastMonth,
    });
    currentY += BOX_STATS_HEIGHT + BOX_GAP;

    // Clicks
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: currentY,
      width: boxWidth,
      icon: "click",
      title: "redirections",
      value: stats.click,
      compareValue: stats.clickLastMonth,
    });
    currentY += BOX_STATS_HEIGHT + BOX_GAP;

    // Accounts
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: currentY,
      width: boxWidth,
      icon: "account",
      title: "créations de compte",
      value: stats.account,
      compareValue: stats.accountLastMonth,
    });
    currentY += BOX_STATS_HEIGHT + BOX_GAP;

    // Applies
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: currentY,
      width: boxWidth,
      icon: "apply",
      title: "candidatures",
      value: stats.apply,
      compareValue: stats.applyLastMonth,
    });
    currentY += BOX_STATS_HEIGHT + BOX_GAP;

    // Rate
    const rate = stats.apply / (stats.click || 1);
    const lastMonthRate = stats.applyLastMonth / (stats.clickLastMonth || 1);
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: currentY,
      width: boxWidth,
      icon: "rate",
      title: "taux de conversion",
      value: rate,
      compareValue: lastMonthRate,
    });
    currentY += BOX_STATS_HEIGHT + BOX_GAP;

    // Top publishers
    drawTopBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: currentY,
      width: boxWidth,
      title: "Vos top diffuseurs",
      value: stats.topPublishers,
    });
  } else {
    // Two column layout
    const colWidth = (boxWidth - BOX_GAP) / 2;

    // Left column
    let leftColY = currentY;

    // Prints
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: leftColY,
      width: colWidth,
      icon: "print",
      title: "impressions",
      value: stats.print,
      compareValue: stats.printLastMonth,
    });
    leftColY += BOX_STATS_HEIGHT + BOX_GAP;

    // Clicks
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: leftColY,
      width: colWidth,
      icon: "click",
      title: "redirections",
      value: stats.click,
      compareValue: stats.clickLastMonth,
    });
    leftColY += BOX_STATS_HEIGHT + BOX_GAP;

    // Accounts
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING,
      y: leftColY,
      width: colWidth,
      icon: "account",
      title: "créations de compte",
      value: stats.account,
      compareValue: stats.accountLastMonth,
    });
    leftColY += BOX_STATS_HEIGHT + BOX_GAP;

    // Applies
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING + colWidth + BOX_GAP,
      y: currentY,
      width: colWidth,
      icon: "apply",
      title: "candidatures",
      value: stats.apply,
      compareValue: stats.applyLastMonth,
    });
    currentY += BOX_STATS_HEIGHT + BOX_GAP;

    // Rate
    const rate = stats.apply / (stats.click || 1);
    const lastMonthRate = stats.applyLastMonth / (stats.clickLastMonth || 1);
    drawStatBox({
      doc,
      x: x + CONTAINER_PADDING + colWidth + BOX_GAP,
      y: currentY,
      width: colWidth,
      icon: "rate",
      title: "taux de conversion",
      value: rate,
      compareValue: lastMonthRate,
    });
    currentY += BOX_STATS_HEIGHT + BOX_GAP;

    // Top publishers
    drawTopBox({
      doc,
      x: x + CONTAINER_PADDING + colWidth + BOX_GAP,
      y: currentY,
      width: colWidth,
      title: isAnnounce ? "Vos top diffuseurs" : "Vos top annonceurs",
      value: stats.topPublishers,
    });
  }
};

export const generateOverview = (doc: jsPDF, data: StatsReport) => {
  const bothStats = data.send?.hasStats && data.receive?.hasStats;
  const padding = 32;
  const gap = 24;

  if (bothStats) {
    // Two sections side by side layout, each in single column
    const sectionWidth = (PAGE_WIDTH - padding * 2 - gap) / 2;

    if (data.receive?.hasStats) {
      generateOverviewSection(doc, data, padding, sectionWidth, true, true); // true for single column
    }

    if (data.send?.hasStats) {
      generateOverviewSection(doc, data, padding + sectionWidth + gap, sectionWidth, false, true); // true for single column
    }
  } else {
    // Single section with two columns layout
    const fullWidth = PAGE_WIDTH - padding * 2;

    if (data.receive?.hasStats) {
      generateOverviewSection(doc, data, padding, fullWidth, true, false); // false for two columns
    }

    if (data.send?.hasStats) {
      generateOverviewSection(doc, data, padding, fullWidth, false, false); // false for two columns
    }
  }
};
