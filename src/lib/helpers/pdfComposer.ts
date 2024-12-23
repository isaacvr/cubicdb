import { jsPDF } from "jspdf";
import type { RGBAColor } from "./imageProcessing";
import { minmax } from "./math";

const pt2mm = 25.4 / 72;
const fontFace = "helvetica";
const fontFaceMono = "courier";

function blockNameL(row: number, col: number, numBlocksHeight: number) {
  const letter = String.fromCharCode(65 + col);
  const number = "" + (numBlocksHeight - row);
  return {
    row: number,
    column: letter,
    name: letter + number,
  };
}

// @returns area where on the page we draw the cubes block
function blockDrawArea(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageMargin = pageWidth * 0.07; // space from page bottoms
  const heightNoMargin = pageHeight - 2 * pageMargin;
  const splitCoeff = 0.3; // block starts at 0.3 * page width;
  const width = pageWidth - 2 * pageMargin;
  const height = heightNoMargin * (1 - splitCoeff);

  return {
    x: (pageWidth - width) / 2,
    y: pageMargin + splitCoeff * heightNoMargin,
    width,
    height,
  };
}

// @returns object {mini: miniatureRect; blockName: blockNameRect} area where on the page we draw miniature
function miniatureDrawArea(doc: jsPDF, pixelWidth: number, pixelHeight: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageMargin = pageWidth * 0.07; // space from page bottoms
  const heightWoMargin = pageHeight - 2 * pageMargin;
  const splitCoeff = 0.3; // block starts at 0.3 * page width;
  const allowedWidth = (pageWidth - 2 * pageMargin) * 0.5; // 0.5 of page width
  const allowedHeight = splitCoeff * heightWoMargin * 0.95; // from the top of the page; 0.95 specifies magin to cubes block

  const calcWidth = (allowedHeight / pixelHeight) * pixelWidth;
  const calcHeight = (allowedWidth / pixelWidth) * pixelHeight;
  const getx = (w: number) => (allowedWidth - w) / 2 + pageMargin;

  let areaMini = {
    x: getx(allowedWidth),
    y: pageMargin,
    width: allowedWidth,
    height: calcHeight,
  };

  if (calcHeight > allowedHeight) {
    areaMini = {
      x: getx(calcWidth),
      y: pageMargin,
      width: calcWidth,
      height: allowedHeight,
    };
  }

  const areaBlockName = {
    x: areaMini.x + areaMini.width,
    y: pageMargin,
    width: allowedWidth,
    height: allowedHeight,
  };

  return {
    mini: areaMini,
    blockName: areaBlockName,
  };
}

// @param drawAreaRect - where to draw the block: {x,y,width, height}
// @param blockWidthCubes: how many cubes are in one blocks (width)
function drawTitlePage(
  doc: jsPDF,
  numBlocksHeight: number,
  blockWidthCubes: number,
  blockHeightCubes: number,
  drawAreaRect: any,
  data: RGBAColor[][],
  cubeDimen: number
) {
  const lettersMargin = drawAreaRect.width * 0.1; // margin for letters
  const rect = {
    x: drawAreaRect.x + lettersMargin,
    y: drawAreaRect.y + lettersMargin,
    width: drawAreaRect.width - 2 * lettersMargin,
    height: drawAreaRect.height - 2 * lettersMargin,
  };

  const width = data[0].length;
  const height = data.length;

  const stickerSize = Math.min(rect.width / width, rect.height / height);

  // adjust rects
  const emptyHorSpace = rect.width - stickerSize * width;
  rect.x += emptyHorSpace / 2;
  rect.width -= emptyHorSpace;

  const emptyVerSpace = rect.height - stickerSize * height;
  rect.y += emptyVerSpace / 2;
  rect.height -= emptyVerSpace;

  // drawing pixelwise pic
  doc.setLineWidth(stickerSize / 20);
  doc.setDrawColor(150, 150, 150);

  for (let i = 0; i < height; i += 1) {
    for (let j = 0; j < width; j += 1) {
      // let rgb = getRgbOfPixel(imageData, j, i);
      const rgb = data[i][j];
      doc.setFillColor(rgb.red, rgb.green, rgb.blue);
      doc.rect(rect.x + j * stickerSize, rect.y + i * stickerSize, stickerSize, stickerSize, "FD");
    }
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);

  // vertical lines
  doc.setFont(fontFaceMono);
  const blockWidthPixels = blockWidthCubes * cubeDimen;
  for (let px = 0; px <= width; px += blockWidthPixels) {
    const lineX = rect.x + px * stickerSize;
    doc.line(lineX, drawAreaRect.y, lineX, drawAreaRect.y + drawAreaRect.height);

    // text (letter)
    if (px < width) {
      const text = blockNameL(0, px / blockWidthPixels, numBlocksHeight).column;
      drawTextInRect(
        doc,
        text,
        true,
        lineX,
        rect.y - lettersMargin * 1.1,
        blockWidthPixels * stickerSize,
        lettersMargin * 0.9
      );
      drawTextInRect(
        doc,
        text,
        true,
        lineX,
        rect.y + rect.height,
        blockWidthPixels * stickerSize,
        lettersMargin * 0.9
      );
    }
  }
  // horisontal lines
  const blockHeightPixels = blockHeightCubes * cubeDimen;
  for (let py = 0; py <= height; py += blockHeightPixels) {
    const lineY = rect.y + py * stickerSize;
    doc.line(drawAreaRect.x, lineY, drawAreaRect.x + drawAreaRect.width, lineY);

    // text (number)
    if (py < height) {
      const text = blockNameL(py / blockHeightPixels, 0, numBlocksHeight).row;
      const fontSize = 20;
      doc.setFontSize(fontSize);
      const textHeight = fontSize * pt2mm;
      doc.text(text, rect.x - textHeight * (0.5 + text.length * 0.5), lineY + textHeight);
      doc.text(text, rect.x + rect.width + textHeight / 6, lineY + textHeight);
    }
  }
}

export function generatePdf(
  blockWidthCubes: number,
  blockHeightCubes: number,
  pixelWidth: number,
  pixelHeight: number,
  cubeDimen: number,
  data: RGBAColor[][],
  dataURL: string
) {
  const doc = new jsPDF("portrait", "mm", "a4");
  doc.setFontSize(22);

  const areaBlock = blockDrawArea(doc);
  const { mini: areaMiniautre, blockName: nmRect } = miniatureDrawArea(
    doc,
    pixelWidth,
    pixelHeight
  );
  const { footerArea, headerArea, imageArea } = titlePicDrawArea(doc);

  const numBlocksWidth = Math.ceil(pixelWidth / cubeDimen / blockWidthCubes);
  const numBlocksHeight = Math.ceil(pixelHeight / cubeDimen / blockHeightCubes);

  // first page, first block
  drawTitlePage(
    doc,
    numBlocksHeight,
    blockWidthCubes,
    blockHeightCubes,
    imageArea,
    data,
    cubeDimen
  );
  doc.setFont(fontFace);
  drawDocHeader(doc, headerArea, pixelWidth, pixelHeight, cubeDimen);
  drawDocFooter(doc, footerArea);

  // bottom-top
  const biBegin = numBlocksHeight - 1;
  const biLast = -1; // non-inclusive. For-loop stops on this val
  const biInc = -1; // inclusive

  // sanity check
  if ((biLast - biBegin) / biInc <= 0) {
    return console.error("bottom-top sanity check failed", biBegin, biLast, biInc);
  }

  for (let blockI = biBegin; blockI !== biLast; blockI += biInc) {
    // i = row, denoted with digit
    for (let blockJ = 0; blockJ < numBlocksWidth; blockJ += 1) {
      doc.addPage();
      doc.setTextColor(0);
      drawMiniature(doc, areaMiniautre, dataURL, true);
      drawMiniRect(
        doc,
        blockI,
        blockJ,
        blockWidthCubes,
        blockHeightCubes,
        areaMiniautre,
        cubeDimen,
        data[0].length
      );
      drawTextInRect(
        doc,
        blockNameL(blockI, blockJ, numBlocksHeight).name,
        false,
        nmRect.x,
        nmRect.y,
        nmRect.width,
        nmRect.height
      );
      drawCubesBlock(
        doc,
        blockI,
        blockJ,
        blockWidthCubes,
        blockHeightCubes,
        areaBlock,
        cubeDimen,
        data
      );
    }
  }

  // Output as Data URI
  terminatePdf(doc);
}

// @param drawAreaRect - where to draw the block: {x,y,width, height}
// @param blockWidthCubes: how many cubes are in one blocks (width)
function drawCubesBlock(
  doc: jsPDF,
  blockI: number,
  blockJ: number,
  blockWidthCubes: number,
  blockHeightCubes: number,
  drawAreaRect: any,
  cubeDimen: number,
  data: RGBAColor[][]
) {
  const stickerSize = Math.min(
    drawAreaRect.width / cubeDimen / blockWidthCubes,
    drawAreaRect.height / cubeDimen / blockHeightCubes
  );
  const cubeSize = cubeDimen * stickerSize;
  const width = data[0].length;
  const height = data.length;

  const JItv = [
    blockJ * blockWidthCubes * cubeDimen,
    blockJ * blockWidthCubes * cubeDimen + (blockWidthCubes - 1) * cubeDimen + cubeDimen - 1,
  ].map(n => Math.min(n, width - 1));

  const actualWidth = JItv[1] - JItv[0] + 1;
  const x = drawAreaRect.x + drawAreaRect.width / 2 - (actualWidth * stickerSize) / 2;

  for (let cubeI = 0; cubeI < blockHeightCubes; cubeI += 1) {
    for (let cubeJ = 0; cubeJ < blockWidthCubes; cubeJ += 1) {
      // draw one cube
      const cubePosX = x + cubeJ * cubeSize;
      const cubePosY = drawAreaRect.y + cubeI * cubeSize;

      doc.setLineWidth(1);
      doc.setDrawColor(100, 100, 100);

      // coordinates of top-left pixel of a cube

      const cubeX = blockJ * blockWidthCubes * cubeDimen + cubeJ * cubeDimen;
      const cubeY = blockI * blockHeightCubes * cubeDimen + cubeI * cubeDimen;

      // draw stickers
      for (let stickerI = 0; stickerI < cubeDimen; stickerI += 1) {
        for (let stickerJ = 0; stickerJ < cubeDimen; stickerJ += 1) {
          // draw sticker. x,y are pixel coordinates
          const x = cubeX + stickerJ;
          const y = cubeY + stickerI;

          if (x < width && y < height) {
            // let rgb = getRgbOfPixel(imageData, x, y);
            const rgb = data[y][x];

            doc.setFillColor(rgb.red, rgb.green, rgb.blue);

            // if rgb is too dark, make colors brighter otherwise we won't see separators
            doc.rect(
              cubePosX + stickerJ * stickerSize,
              cubePosY + stickerI * stickerSize,
              stickerSize,
              stickerSize,
              "FD"
            );

            // letter inside square
            const bgIsDark = rgb.red + rgb.green + rgb.blue < 128;
            let letterRgb;

            // smooth color
            const addValue = 30;
            letterRgb = [
              minmax(rgb.red + (bgIsDark ? addValue : -addValue), 0, 255),
              minmax(rgb.green + (bgIsDark ? addValue : -addValue), 0, 255),
              minmax(rgb.blue + (bgIsDark ? addValue : -addValue), 0, 255),
            ];

            const padding = stickerSize / 10;
            const rect = {
              x: cubePosX + stickerJ * stickerSize + padding,
              y: cubePosY + stickerI * stickerSize + padding,
              w: stickerSize - 2 * padding,
              h: stickerSize - 2 * padding,
            };
            doc.setTextColor(letterRgb[0], letterRgb[1], letterRgb[2]);
            const letter = (rgb.name || "").slice(0, 1).toUpperCase();
            drawTextInRect(doc, letter, true, rect.x, rect.y, rect.w, rect.h);
          }
        }
      }

      if (cubeDimen > 1 && cubeX < width && cubeY < height) {
        // outline this cube
        doc.setDrawColor(0);
        doc.setLineWidth(2);
        doc.rect(cubePosX, cubePosY, cubeSize, cubeSize, "D"); //Fill and Border = FD
      }
    }
  }
}

function terminatePdf(doc: jsPDF) {
  doc.save("Mosaic " + +new Date() + ".pdf");
}

// draws the text in the center of the rect
// @param textUrl - if set, make a hyperlink instead
function drawTextInMidRect(doc: jsPDF, text: string, rect: any, textSize: number, textUrl = null) {
  doc.setFontSize(textSize);
  // instead of text width, calc width of max line
  let unitWidth = 0;
  text.split("\n").forEach(function (s) {
    const w = doc.getStringUnitWidth(s);
    if (w > unitWidth) unitWidth = w;
  });
  const realTextWidth = unitWidth * textSize * pt2mm;
  const x = rect.x + (rect.width - realTextWidth) / 2;
  const y = rect.y + rect.height / 2;

  if (!textUrl) doc.text(text, x, y);
  else doc.textWithLink(text, x, y, { url: textUrl });
}

function drawTextInRect(
  doc: jsPDF,
  text: string,
  centered: boolean,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number
) {
  // adjust Text size based on rectWidth
  let realTextWidth = Infinity;
  let textSize = Math.ceil(rectHeight / pt2mm); // + 1;
  const oldTextSize = textSize;

  do {
    textSize--;
    doc.setFontSize(textSize);
    realTextWidth = doc.getStringUnitWidth(text) * textSize * pt2mm;
  } while (realTextWidth > rectWidth);

  if (centered) {
    x -= (realTextWidth - rectWidth) / 2;
  }
  y += (textSize + (oldTextSize - textSize) / 2) * pt2mm;

  doc.text(text, x, y);
}

function drawMiniature(doc: jsPDF, rect: any, dataURL: string, border = false) {
  doc.addImage(dataURL, "PNG", rect.x, rect.y, rect.width, rect.height, "minia", "NONE", 0);

  if (border) {
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.rect(rect.x, rect.y, rect.width, rect.height, "D"); //Fill and Border = FD
  }
}

// @returns area where on the page we draw the cubes block
// leave 15% from both sides
// @returns object with rects: {imageArea, headerArea, footerArea}
function titlePicDrawArea(doc: jsPDF) {
  const topMarginCoeff = 0.15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageMargin = pageWidth * 0.07; // space from page bottoms
  const heightNoMargin = pageHeight - 2 * pageMargin;
  const imageArea = {
    x: pageMargin,
    y: pageMargin + topMarginCoeff * heightNoMargin,
    width: pageWidth - 2 * pageMargin,
    height: pageHeight - 2 * pageMargin - 2 * topMarginCoeff * heightNoMargin, // 0.15 from the top and the bottom
  };
  const headerArea = {
    x: pageMargin,
    y: pageMargin,
    width: pageWidth - 2 * pageMargin,
    height: topMarginCoeff * heightNoMargin * 0.9,
  };
  const footerHeight = topMarginCoeff * heightNoMargin * 0.9;
  const footerArea = {
    x: pageMargin,
    y: pageHeight - pageMargin - footerHeight,
    width: pageWidth - 2 * pageMargin,
    height: footerHeight,
  };
  return {
    imageArea: imageArea,
    headerArea: headerArea,
    footerArea: footerArea,
  };
}

// draws rectangle on top of the miniature
function drawMiniRect(
  doc: jsPDF,
  blockI: number,
  blockJ: number,
  blockWidthCubes: number,
  blockHeightCubes: number,
  areaMiniautre: any,
  cubeDimen: number,
  width: number
) {
  const pxInSticker = areaMiniautre.width / width;
  // outline this cube
  const bw = blockWidthCubes * cubeDimen * pxInSticker;
  const bh = blockHeightCubes * cubeDimen * pxInSticker;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(2);
  doc.rect(areaMiniautre.x + blockJ * bw, areaMiniautre.y + blockI * bh, bw, bh, "D");
  doc.setDrawColor(0);
  doc.setLineWidth(1);
  doc.rect(areaMiniautre.x + blockJ * bw, areaMiniautre.y + blockI * bh, bw, bh, "D"); //Fill and Border = FD
}

function drawDocHeader(
  doc: jsPDF,
  rect: any,
  pixelWidth: number,
  pixelHeight: number,
  cubeDimen: number
) {
  doc.setFontSize(26);
  const cw = pixelWidth / cubeDimen;
  const ch = pixelHeight / cubeDimen;
  const text = "" + cw + "x" + ch + " = " + cw * ch + (cubeDimen === 1 ? " pixels" : " cubes");

  drawTextInMidRect(doc, text, rect, 26);
}

function drawDocFooter(doc: jsPDF, rect: any) {
  drawTextInMidRect(doc, "Generated by CubicDB", rect, 12);
}
