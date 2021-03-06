import URL from "core-js-pure/features/url";

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
 * Image processing pipeline builder.
 * @public
 */
export class ImageProcessingPipelineBuilder {
  private _ops: Operation[];

  constructor() {
    this._ops = [];
  }

  /**
   * Specifies the output format of the image.
   * @param format - Image format
   */
  format(format: "jpg" | "png" | "webp"): this {
    this._ops.push({
      op: "format",
      format,
    });
    return this;
  }

  /**
   * Specifies the quality of the output image.
   * @param absoluteQuality - Quality (1 - 100)
   */
  quality(absoluteQuality: number): this {
    this._ops.push({
      op: "quality",
      absoluteQuality,
    });
    return this;
  }

  /**
   * Specifies image resizing operation.
   *
   * @param options - Resize options
   */
  resize(options: ImageProcessingPipelineBuilderResizeOptions): this {
    this._ops.push({
      op: "resize",
      ...options,
    });
    return this;
  }

  /**
   * Returns the query parameter name to be used.
   */
  getName(): string {
    return "pipeline";
  }

  /**
   * Returns the built pipeline string to be used as query parameter value.
   */
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

  /**
   * Returns the provided URL with added pipeline parameter.
   *
   * @example
   * ```ts
   * new ImageProcessingPipelineBuilder()
   *   .format("jpg")
   *   .setToURLString("https://example.com");
   * // http://example.com?pipeline=image%2Fformat%2Cjpg
   * ```
   * @param urlStr - input URL
   */
  setToURLString(urlStr: string): string {
    const u = new URL(urlStr);
    u.searchParams.delete("pipeline");
    u.searchParams.append(this.getName(), this.getValue());
    return u.toString();
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
