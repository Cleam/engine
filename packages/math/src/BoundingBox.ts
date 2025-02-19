import { IClone } from "./IClone";
import { BoundingSphere } from "./BoundingSphere";
import { Matrix } from "./Matrix";
import { Vector3 } from "./Vector3";

/**
 * Axis Aligned Bound Box (AABB).
 */
export class BoundingBox implements IClone {
  private static _tempVec30: Vector3 = new Vector3();
  private static _tempVec31: Vector3 = new Vector3();

  /**
   * Calculate a bounding box from the center point and the extent of the bounding box.
   * @param center - The center point
   * @param extent - The extent of the bounding box
   * @param out - The calculated bounding box
   */
  static fromCenterAndExtent(center: Vector3, extent: Vector3, out: BoundingBox): void {
    Vector3.subtract(center, extent, out.min);
    Vector3.add(center, extent, out.max);
  }

  /**
   * Calculate a bounding box that fully contains the given points.
   * @param points - The given points
   * @param out - The calculated bounding box
   */
  static fromPoints(points: Vector3[], out: BoundingBox): void {
    if (!points || points.length === 0) {
      throw new Error("points must be array and length must > 0");
    }

    const { min, max } = out;
    min.x = min.y = min.z = Number.MAX_VALUE;
    max.x = max.y = max.z = -Number.MAX_VALUE;

    for (let i = 0, l = points.length; i < l; ++i) {
      const point = points[i];
      Vector3.min(min, point, min);
      Vector3.max(max, point, max);
    }
  }

  /**
   * Calculate a bounding box from a given sphere.
   * @param sphere - The given sphere
   * @param out - The calculated bounding box
   */
  static fromSphere(sphere: BoundingSphere, out: BoundingBox): void {
    const { center, radius } = sphere;
    const { min, max } = out;

    min.x = center.x - radius;
    min.y = center.y - radius;
    min.z = center.z - radius;
    max.x = center.x + radius;
    max.y = center.y + radius;
    max.z = center.z + radius;
  }

  /**
   * Transform a bounding box.
   * @param source - The original bounding box
   * @param matrix - The transform to apply to the bounding box
   * @param out - The transformed bounding box
   */
  static transform(source: BoundingBox, matrix: Matrix, out: BoundingBox): void {
    // https://zeux.io/2010/10/17/aabb-from-obb-with-component-wise-abs/
    const center = BoundingBox._tempVec30;
    const extent = BoundingBox._tempVec31;
    source.getCenter(center);
    source.getExtent(extent);
    Vector3.transformCoordinate(center, matrix, center);

    const { x, y, z } = extent;
    const e = matrix.elements;
    extent.x = Math.abs(x * e[0]) + Math.abs(y * e[4]) + Math.abs(z * e[8]);
    extent.y = Math.abs(x * e[1]) + Math.abs(y * e[5]) + Math.abs(z * e[9]);
    extent.z = Math.abs(x * e[2]) + Math.abs(y * e[6]) + Math.abs(z * e[10]);

    // set min、max
    Vector3.subtract(center, extent, out.min);
    Vector3.add(center, extent, out.max);
  }

  /**
   * Calculate a bounding box that is as large as the total combined area of the two specified boxes.
   * @param box1 - The first box to merge
   * @param box2 - The second box to merge
   * @param out - The merged bounding box
   * @returns The merged bounding box
   */
  static merge(box1: BoundingBox, box2: BoundingBox, out: BoundingBox): BoundingBox {
    Vector3.min(box1.min, box2.min, out.min);
    Vector3.max(box1.max, box2.max, out.max);
    return out;
  }

  /** The minimum point of the box. */
  public readonly min: Vector3 = new Vector3();
  /** The maximum point of the box. */
  public readonly max: Vector3 = new Vector3();

  /**
   * Constructor of BoundingBox.
   * @param min - The minimum point of the box
   * @param max - The maximum point of the box
   */
  constructor(min: Vector3 = null, max: Vector3 = null) {
    min && min.cloneTo(this.min);
    max && max.cloneTo(this.max);
  }

  /**
   * Creates a clone of this box.
   * @returns A clone of this box
   */
  clone(): BoundingBox {
    return new BoundingBox(this.min, this.max);
  }

  /**
   * Clones this box to the specified box.
   * @param out - The specified box
   * @returns The specified box
   */
  cloneTo(out: BoundingBox): BoundingBox {
    this.min.cloneTo(out.min);
    this.max.cloneTo(out.max);
    return out;
  }

  /**
   * Get the center point of this bounding box.
   * @param out - The center point of this bounding box
   * @returns The center point of this bounding box
   */
  getCenter(out: Vector3): Vector3 {
    Vector3.add(this.min, this.max, out);
    Vector3.scale(out, 0.5, out);
    return out;
  }

  /**
   * Get the extent of this bounding box.
   * @param out - The extent of this bounding box
   * @returns The extent of this bounding box
   */
  getExtent(out: Vector3): Vector3 {
    Vector3.subtract(this.max, this.min, out);
    Vector3.scale(out, 0.5, out);
    return out;
  }

  /**
   * Get the eight corners of this bounding box.
   * @param out - An array of points representing the eight corners of this bounding box
   * @returns An array of points representing the eight corners of this bounding box
   */
  getCorners(out: Vector3[] = []): Vector3[] {
    const { min, max } = this;
    const minX = min.x;
    const minY = min.y;
    const minZ = min.z;
    const maxX = max.x;
    const maxY = max.y;
    const maxZ = max.z;
    const len = out.length;

    // The array length is less than 8 to make up
    if (len < 8) {
      for (let i = 0, l = 8 - len; i < l; ++i) {
        out[len + i] = new Vector3();
      }
    }

    out[0].setValue(minX, maxY, maxZ);
    out[1].setValue(maxX, maxY, maxZ);
    out[2].setValue(maxX, minY, maxZ);
    out[3].setValue(minX, minY, maxZ);
    out[4].setValue(minX, maxY, minZ);
    out[5].setValue(maxX, maxY, minZ);
    out[6].setValue(maxX, minY, minZ);
    out[7].setValue(minX, minY, minZ);

    return out;
  }

  /**
   * Transform a bounding box.
   * @param matrix - The transform to apply to the bounding box
   * @returns The transformed bounding box
   */
  public transform(matrix: Matrix): BoundingBox {
    BoundingBox.transform(this, matrix, this);
    return this;
  }
}
