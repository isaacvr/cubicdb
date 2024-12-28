import jsPDF from "jspdf";

interface IGENERATE_CONTEST_PDF {
  name: string;
  puzzle: string;
  round: number;
  html?: string;
}

export async function generateContestPDF({ name, puzzle, round }: IGENERATE_CONTEST_PDF) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const width = pdf.internal.pageSize.getWidth();

  const font = pdf.getFont();
  pdf.setFontSize(24);
  pdf.setFont(font.fontName, font.fontStyle, "bold");
  pdf.text(name, width / 2, 25, { align: "center" });

  pdf.setFontSize(12);
  pdf.setFont(font.fontName, font.fontStyle, "normal");
  pdf.text(`${puzzle} Ronda ${round}`, width / 2, 40, { align: "center" });

  pdf.save("ContestPerror");
}
