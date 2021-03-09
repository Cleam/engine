import { Color, Vector2, Vector3, Vector4 } from "@oasis-engine/math";
import { Camera } from "../Camera";
import { Component } from "../Component";
import { Layer } from "../Layer";
import { Material } from "../material/Material";
import { TextureCubeFace } from "../texture/enums/TextureCubeFace";
import { RenderTarget } from "../texture/RenderTarget";
import { RenderContext } from "./RenderContext";
import { RenderElement } from "./RenderElement";
import { RenderPass } from "./RenderPass";
import { RenderQueue } from "./RenderQueue";

/**
 * Basic render pipeline.
 */
export class BasicRenderPipeline {
  protected _camera: Camera;
  private _queue: RenderQueue;
  private _defaultPass: RenderPass;
  protected _renderPassArray: Array<RenderPass>;
  private _canvasDepthPass;

  /**
   * Create a basic render pipeline.
   * @param camera - Camera
   */
  constructor(camera: Camera) {
    this._camera = camera;
    this._queue = new RenderQueue();

    this._renderPassArray = [];
    this._defaultPass = new RenderPass("default", 0, null, null, 0);
    this.addRenderPass(this._defaultPass);
  }

  /**
   * Default render pass.
   */
  get defaultRenderPass() {
    return this._defaultPass;
  }

  /**
   * Add render pass.
   * @param nameOrPass - The name of this Pass or RenderPass object. When it is a name, the following parameters need to be provided
   * @param priority - Priority, less than 0 before the default pass, greater than 0 after the default pass
   * @param renderTarget - The specified Render Target
   * @param replaceMaterial -  Replaced material
   * @param mask - Perform bit and operations with Entity.Layer to filter the objects that this Pass needs to render
   * @param clearParam - Clear the background color of renderTarget
   */
  addRenderPass(
    nameOrPass: string | RenderPass,
    priority: number = null,
    renderTarget: RenderTarget = null,
    replaceMaterial: Material = null,
    mask: Layer = null,
    clearParam = new Vector4(0, 0, 0, 0)
  ) {
    if (typeof nameOrPass === "string") {
      const renderPass = new RenderPass(nameOrPass, priority, renderTarget, replaceMaterial, mask, clearParam);
      this._renderPassArray.push(renderPass);
    } else if (nameOrPass instanceof RenderPass) {
      this._renderPassArray.push(nameOrPass);
    }

    this._renderPassArray.sort(function (p1, p2) {
      return p1.priority - p2.priority;
    });
  }

  /**
   * Remove render pass by name or render pass object.
   * @param nameOrPass - Render pass name or render pass object
   */
  removeRenderPass(nameOrPass: string | RenderPass): void {
    let pass: RenderPass;
    if (typeof nameOrPass === "string") pass = this.getRenderPass(nameOrPass);
    else if (nameOrPass instanceof RenderPass) pass = nameOrPass;
    if (pass) {
      const idx = this._renderPassArray.indexOf(pass);
      this._renderPassArray.splice(idx, 1);
    }
  }

  /**
   * Get render pass by name.
   * @param  name - Render pass name
   */
  getRenderPass(name: string) {
    for (let i = 0, len = this._renderPassArray.length; i < len; i++) {
      const pass = this._renderPassArray[i];
      if (pass.name === name) return pass;
    }

    return null;
  }

  /**
   * Render queue.
   */
  get queue(): RenderQueue {
    return this._queue;
  }

  /**
   * Destroy internal resources.
   */
  destroy() {}

  /**
   * Perform scene rendering.
   * @param context - Render context
   * @param cubeFace - Render surface of cube texture
   */
  render(context: RenderContext, cubeFace?: TextureCubeFace) {
    const camera = this._camera;
    const queue = this._queue;

    queue.clear();

    camera.engine._componentsManager.callRender(context);

    queue.sort(camera.entity.transform.worldPosition);

    if (this._canvasDepthPass) this._canvasDepthPass.enabled = false;

    for (let i = 0, len = this._renderPassArray.length; i < len; i++) {
      this._drawRenderPass(this._renderPassArray[i], camera, cubeFace);
    }
  }

  private _drawRenderPass(pass: RenderPass, camera: Camera, cubeFace?: TextureCubeFace) {
    pass.preRender(camera, this.queue);

    if (pass.enabled) {
      const rhi = camera.scene.engine._hardwareRenderer;
      const renderTarget = camera.renderTarget || pass.renderTarget;
      rhi.activeRenderTarget(renderTarget, camera);
      rhi.setRenderTargetFace(renderTarget, cubeFace);
      rhi.clearRenderTarget(camera.engine, pass.clearMode, pass.clearParam);

      if (pass.renderOverride) {
        pass.render(camera, this.queue);
      } else {
        this.queue.render(camera, pass.replaceMaterial, pass.mask);
      }

      rhi.blitRenderTarget(renderTarget);
    }

    pass.postRender(camera, this.queue);
  }

  /**
   * Push a render element to the render queue.
   * @param element - Render element
   */
  pushPrimitive(element: RenderElement) {
    this._queue.pushPrimitive(element);
  }

  /**
   * Add a sprite drawing information to the render queue.
   * @param component - The sprite renderer
   * @param vertices - The array containing sprite mesh vertex positions
   * @param uv - The base texture coordinates of the sprite mesh
   * @param triangles - The array containing sprite mesh triangles
   * @param color - Rendering color for the Sprite graphic
   * @param material - The reference to the used material
   * @param camera - Camera which is rendering
   */
  pushSprite(
    component: Component,
    vertices: Vector3[],
    uv: Vector2[],
    triangles: number[],
    color: Color,
    material: Material,
    camera: Camera
  ) {
    this.queue.pushSprite(component, vertices, uv, triangles, color, material, camera);
  }
}
