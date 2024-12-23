import { EPS } from "@constants";
import type { IDrawer } from "../utils";
import { sha1 } from "object-hash";
import { randomCSSId, randomUUID } from "@helpers/strings";

interface PathElement {
  type: "path";
  fill: boolean;
  stroke: boolean;
  path: string;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: CanvasPathDrawingStyles["lineWidth"];
  lineCap: CanvasPathDrawingStyles["lineCap"];
  position: number;
}

interface TextElement {
  type: "text";
  fill: boolean;
  stroke: boolean;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: CanvasPathDrawingStyles["lineWidth"];
  textAlign: CanvasTextDrawingStyles["textAlign"];
  textBaseline: CanvasTextDrawingStyles["textBaseline"];
  font: CanvasTextDrawingStyles["font"];
  position: number;
  content: string;
  x: number;
  y: number;
}

interface CircleElement {
  type: "circle";
  fill: boolean;
  stroke: boolean;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: CanvasPathDrawingStyles["lineWidth"];
  position: number;
  x: number;
  y: number;
  r: number;
}

declare type IElement = PathElement | TextElement | CircleElement;

interface ISVGClass {
  name: string;
  rules: (string | number)[][];
}

function f(x: number) {
  const pot = 100;
  return Math.floor(x * pot) / pot;
}

export class SVGGenerator implements IDrawer {
  strokeStyle: string;
  fillStyle: string;
  lineWidth: CanvasPathDrawingStyles["lineWidth"];
  lineCap: CanvasPathDrawingStyles["lineCap"];
  textAlign: CanvasTextDrawingStyles["textAlign"];
  textBaseline: CanvasTextDrawingStyles["textBaseline"];
  font: CanvasTextDrawingStyles["font"];

  elements: IElement[];

  W: number;
  H: number;

  private _cursor: number;

  constructor(W: number, H: number) {
    this.W = W;
    this.H = H;
    this._cursor = 0;
    this.strokeStyle = "black";
    this.fillStyle = "transparent";
    this.lineWidth = 1;
    this.lineCap = "square";
    this.elements = [];
    this.textAlign = "start";
    this.textBaseline = "alphabetic";
    this.font = "10px sans-serif";
  }

  moveTo(x: number, y: number) {
    const elem = this.elements[this._cursor];

    if (elem.type != "path") return;

    elem.path += `M${f(x)},${f(y)}`;
  }

  lineTo(x: number, y: number) {
    const elem = this.elements[this._cursor];

    if (elem.type != "path") return;

    elem.path += `L${f(x)},${f(y)}`;
  }

  stroke() {
    this.elements[this._cursor].stroke = true;
  }

  beginPath() {
    this.elements.push({
      type: "path",
      fill: false,
      stroke: true,
      path: "",
      fillStyle: this.fillStyle,
      lineCap: this.lineCap,
      lineWidth: this.lineWidth,
      strokeStyle: this.strokeStyle,
      position: -1,
    });

    this._cursor = this.elements.length - 1;
  }

  fill() {
    this.elements[this._cursor].fill = true;
  }

  closePath() {
    const elem = this.elements[this._cursor];

    if (elem.type != "path") return;

    elem.path += `Z`;
  }

  private getNodeStr(node: IElement, classes: Map<string, ISVGClass>) {
    const hash = sha1(this.getNodeClassInfo(node));
    const classInfo = classes.get(hash);

    if (!classInfo) {
      throw new ReferenceError("Class not found");
    }

    const className = classInfo.name;

    switch (node.type) {
      case "path": {
        return `<path ${
          node.position >= 0 ? 'data-position="' + node.position + '"' : ""
        } class="${className}" d="${node.path}" />`;
      }

      case "text": {
        return `<text x="${f(node.x)}" y="${f(node.y)}" font-size="${node.font.slice(
          0,
          node.font.indexOf("px")
        )}" class="${className}">${node.content}</text>`;
      }

      case "circle": {
        return `<circle ${
          node.position >= 0 ? 'data-position="' + node.position + '"' : ""
        } class="${className}" cx="${node.x}" cy="${node.y}" r="${node.r}" />`;
      }
    }
  }

  private getNodeClassInfo(node: IElement) {
    switch (node.type) {
      case "path": {
        return [
          ["fill", node.fill ? node.fillStyle : "none"],
          ["stroke", node.stroke ? node.strokeStyle : "none"],
          ["stroke-width", node.lineWidth],
          ["stroke-linecap", node.lineCap],
        ];
      }

      case "text": {
        return [
          ["alignment-baseline", node.textBaseline],
          ["fill", node.fill ? node.fillStyle : "none"],
          ["text-anchor", node.textAlign === "center" ? "middle" : "start"],
        ];
      }

      case "circle": {
        return [
          ["fill", node.fill ? node.fillStyle : "none"],
          ["stroke", node.stroke ? node.strokeStyle : "none"],
          ["stroke-width", node.lineWidth],
        ];
      }
    }

    return [];
  }

  private getClasses() {
    const elements = this.elements;
    const classMap = new Map<string, ISVGClass>();

    for (let i = 0, maxi = elements.length; i < maxi; i += 1) {
      const node = elements[i];
      const config: ISVGClass["rules"] = this.getNodeClassInfo(node);
      const hash = sha1(config);

      if (!classMap.has(hash)) {
        classMap.set(hash, {
          name: "c" + classMap.size,
          rules: config,
        });
      }
    }

    return classMap;
  }

  getImage() {
    const cl = randomCSSId();
    const classes = this.getClasses();
    const style = [...classes.entries()]
      .map(c => `.${cl} .${c[1].name}{${c[1].rules.map(e => `${e[0]}:${e[1]};`).join("")}}`)
      .join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg xmlns="http://www.w3.org/2000/svg" x="0" y="0" width="${this.W}" height="${
      this.H
    }" viewBox="0 0 ${this.W} ${this.H}" class="${cl}">
      <style>${style}</style>
      ${this.elements.map(e => this.getNodeStr(e, classes)).join("\n      ")}
    </svg>`;
  }

  setPosition(p: number) {
    this.elements[this._cursor].position = p;
  }

  fillText(s: string, x: number, y: number) {
    this.elements.push({
      type: "text",
      fill: true,
      stroke: false,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
      strokeStyle: this.strokeStyle,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      font: this.font,
      position: -1,
      content: s,
      x: f(x),
      y: f(y),
    });

    this._cursor = this.elements.length - 1;
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false
  ) {
    const elem = this.elements[this._cursor];

    if (elem.type != "path") return;

    const startX = x + radius * Math.cos(startAngle);
    const startY = y + radius * Math.sin(startAngle);
    const endX = x + radius * Math.cos(endAngle);
    const endY = y + radius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
    const sweepFlag = counterclockwise ? 0 : 1;

    if (Math.abs((startAngle - endAngle) % (Math.PI * 2)) < EPS) {
      const startX = x + radius;
      const startY = y;

      // Dos arcos para hacer un círculo completo
      const arc1 = `A ${f(radius)} ${f(radius)} 0 1 0 ${f(x - radius)} ${f(y)}`;
      const arc2 = `A ${f(radius)} ${f(radius)} 0 1 0 ${f(startX)} ${f(startY)}`;

      elem.path += `M ${f(startX)} ${f(startY)} ${arc1} ${arc2}`;
    } else {
      elem.path += `M ${f(startX)} ${f(startY)} A ${f(radius)} ${f(
        radius
      )} 0 ${largeArcFlag} ${sweepFlag} ${f(endX)} ${f(endY)}`;
    }
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    const elem = this.elements[this._cursor];

    if (elem.type != "path") return;

    elem.path += `Q${f(cpx)} ${f(cpy)},${f(x)} ${f(y)}`;
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
    const elem = this.elements[this._cursor];

    if (elem.type != "path") return;

    elem.path += `C${f(cp1x)} ${f(cp1y)},${f(cp2x)} ${f(cp2y)},${f(x)} ${f(y)}`;
  }

  circle(x: number, y: number, r: number) {
    this.elements.push({
      type: "circle",
      fill: true,
      stroke: true,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
      strokeStyle: this.strokeStyle,
      position: -1,
      x: f(x),
      y: f(y),
      r: f(r),
    });

    this._cursor = this.elements.length - 1;
  }
}
