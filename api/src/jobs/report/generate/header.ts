import jsPDF from "jspdf";
import sharp from "sharp";
import { Publisher } from "../../../types";
import { PAGE_WIDTH, drawLink, drawText } from "./utils";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const HEADER_HEIGHT = 192;

const drawAPIEngagementLogo = (doc: jsPDF, x: number, y: number, size: number = 48) => {
  // Scale and translate directly
  const scale = size / 64;

  // Draw the blue background pill
  doc.setFillColor("#000091");
  doc.roundedRect(x, y, 64 * scale, 40 * scale, 20 * scale, 20 * scale, "F");

  // Draw the red circle with white border
  doc.setFillColor("#F95C5E");
  doc.circle(x + 44 * scale, y + 20 * scale, 14 * scale, "F");
  doc.setDrawColor("#FFFFFF");
  doc.setLineWidth(4 * scale);
  doc.circle(x + 44 * scale, y + 20 * scale, 14 * scale, "S");
};

export const generateHeader = async (doc: jsPDF, publisher: Publisher, month: number, year: number, page: number, totalPages: number) => {
  // Header background
  doc.setFillColor("#F5F5FE");
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F"); // Draw background for entire page

  // Border at bottom
  doc.setDrawColor("#E3E3FD");
  doc.line(0, HEADER_HEIGHT, PAGE_WIDTH, HEADER_HEIGHT);

  // Logo container
  doc.setFillColor("#FFFFFF");
  doc.roundedRect(32, 32, 176, 128, 8, 8, "F");

  // Add publisher logo
  if (publisher.logo) {
    const imageBuffer = await fetch(publisher.logo).then((res) => res.arrayBuffer());
    const image = new Uint8Array(imageBuffer);

    // Get image metadata and optimize using sharp
    const sharpImage = sharp(Buffer.from(image));
    const metadata = await sharpImage.metadata();

    // Determine image format
    const format = metadata.format || "png";

    // Optimize and resize image
    const optimizedImage = await sharpImage
      .resize({
        width: 300, // Maximum width
        height: 200, // Maximum height
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(format, { quality: 80 }) // Reduce quality for compression
      .toBuffer();

    // Define container dimensions
    const containerWidth = 144;
    const containerHeight = 96;

    // Calculate scaling with optimized image dimensions
    const imgWidth = metadata.width || 0;
    const imgHeight = metadata.height || 0;
    const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight);

    // Calculate dimensions that maintain aspect ratio
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    // Center the image in the container
    const x = 48 + (containerWidth - scaledWidth) / 2;
    const y = 48 + (containerHeight - scaledHeight) / 2;

    // Add the optimized image with the correct format
    doc.addImage(optimizedImage, format.toUpperCase(), x, y, scaledWidth, scaledHeight);
  }

  // Replace SVG loading with our custom drawing function
  drawAPIEngagementLogo(doc, 248, 40);

  // Update font settings for text
  drawText(doc, `API Engagement x ${publisher.name}`, 312, 40, {
    fontWeight: "bold",
    fontSize: 20,
    lineHeight: 28,
  });

  // Report title
  drawText(doc, `Rapport d'impact ${MONTHS[month]} ${year}`, 248, 84, {
    fontWeight: "bold",
    fontSize: 28,
    lineHeight: 36,
  });

  // Dashboard link underline
  const dashboardUrl = `https://app.api-engagement.beta.gouv.fr/performance?from=${new Date(year, month, 1).toISOString()}&to=${new Date(year, month + 1, 1).toISOString()}`;
  const text = "Retrouvez l'ensemble de vos statistiques sur votre tableau de bord";
  drawLink(doc, text, dashboardUrl, 248, 128, {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000091",
  });

  // Page numbers
  drawText(doc, `Page ${page} / ${totalPages}`, PAGE_WIDTH - 120, 24, {
    fontSize: 12,
    color: "#666666",
  });
};
