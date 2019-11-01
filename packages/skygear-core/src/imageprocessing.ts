import { encodeQueryComponent } from "./url";

/**
 * @public
 */
export interface ImageProcessingPipelineBuilderResizeOptions {
  scalingMode?: "lfit" | "mfit" | "fill" | "pad" | "fixed";
  targetWidth?: number;
  targetHeight?: number;
  longerSide?: number;
  shorterSide?: number;
  color?: string;
}

type Operation = FormatOperation | QualityOperation | ResizeOperation;

interface FormatOperation {
  op: "format";
  format: "jpg" | "png" | "webp";
}

interface QualityOperation {
  op: "quality";
  absoluteQuality: number;
}

interface ResizeOperation extends ImageProcessingPipelineBuilderResizeOptions {
  op: "resize";
}

/**
 * @public
 */
export class ImageProcessingPipelineBuilder {
  private _ops: Operation[];

  constructor() {
    this._ops = [];
  }

  format(format: "jpg" | "png" | "webp"): this {
    this._ops.push({
      op: "format",
      format,
    });
    return this;
  }

  quality(absoluteQuality: number): this {
    this._ops.push({
      op: "quality",
      absoluteQuality,
    });
    return this;
  }

  resize(options: ImageProcessingPipelineBuilderResizeOptions): this {
    this._ops.push({
      op: "resize",
      ...options,
    });
    return this;
  }

  getName(): string {
    return "pipeline";
  }

  getValue(): string {
    const parts = ["image"];
    for (const op of this._ops) {
      switch (op.op) {
        case "format":
          parts.push(renderFormat(op));
          break;
        case "quality":
          parts.push(renderQuality(op));
          break;
        case "resize":
          parts.push(renderResize(op));
          break;
        default:
          break;
      }
    }
    return parts.join("/");
  }

  setToURLString(urlStr: string): string {
    const fragmentIndex = urlStr.indexOf("#");
    const queryIndex = urlStr.indexOf("?");
    const queryParam =
      this.getName() + "=" + encodeQueryComponent(this.getValue());

    let anythingElse = "";
    let query = "";
    let fragment = "";

    if (fragmentIndex < 0) {
      fragment = "";
      if (queryIndex < 0) {
        anythingElse = urlStr;
        query = "";
      } else {
        anythingElse = urlStr.slice(0, queryIndex);
        query = urlStr.slice(queryIndex + 1);
      }
    } else {
      fragment = urlStr.slice(fragmentIndex + 1);
      if (queryIndex < 0) {
        anythingElse = urlStr.slice(0, fragmentIndex);
        query = "";
      } else {
        anythingElse = urlStr.slice(0, queryIndex);
        query = urlStr.slice(queryIndex + 1, fragmentIndex);
      }
    }

    const queryParams = query
      .split("&")
      .filter(q => q !== "" && !/^pipeline=/.test(q));
    queryParams.push(queryParam);

    let result = anythingElse + "?" + queryParams.join("&");
    if (fragment !== "") {
      result += "#" + fragment;
    }

    return result;
  }
}

function renderFormat(op: FormatOperation): string {
  return `format,${op.format}`;
}

function renderQuality(op: QualityOperation): string {
  return `quality,Q_${op.absoluteQuality}`;
}

function renderResize(op: ResizeOperation): string {
  const parts = ["resize"];
  if (op.scalingMode != null) {
    parts.push(`m_${op.scalingMode}`);
  }
  if (op.longerSide != null) {
    parts.push(`l_${op.longerSide}`);
  }
  if (op.shorterSide != null) {
    parts.push(`s_${op.shorterSide}`);
  }
  if (op.targetWidth != null) {
    parts.push(`w_${op.targetWidth}`);
  }
  if (op.targetHeight != null) {
    parts.push(`h_${op.targetHeight}`);
  }
  if (op.color != null) {
    parts.push(`color_${op.color}`);
  }
  return parts.join(",");
}
