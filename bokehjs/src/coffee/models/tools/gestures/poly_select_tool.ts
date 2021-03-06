import {SelectTool, SelectToolView} from "./select_tool"
import {PolyAnnotation} from "../../annotations/poly_annotation"
import {PolyGeometry} from "core/geometry"
import * as p from "core/properties"
import {copy} from "core/util/array"
import {extend} from "core/util/object"

export interface BkEv {
  bokeh: {
    sx: number
    sy: number
  }
  srcEvent: {
    shiftKey?: boolean
  }
  keyCode: number
}

export class PolySelectToolView extends SelectToolView {

  model: PolySelectTool

  protected data: {sx: number[], sy: number[]}

  initialize(options: any): void {
    super.initialize(options)
    this.data = {sx: [], sy: []}
  }

  connect_signals(): void {
    super.connect_signals()
    this.connect(this.model.properties.active.change, () => this._active_change())
  }

  _active_change(): void {
    if (!this.model.active)
      this._clear_data()
  }

  _keyup(e: BkEv): void {
    if (e.keyCode == 13)
      this._clear_data()
  }

  _doubletap(e: BkEv): void {
    const append = e.srcEvent.shiftKey || false
    this._do_select(this.data.sx, this.data.sy, true, append)
    this.plot_view.push_state('poly_select', {selection: this.plot_view.get_selection()})

    this._clear_data()
  }

  _clear_data(): void {
    this.data = {sx: [], sy: []}
    this.model.overlay.update({xs: [], ys: []})
  }

  _tap(e: BkEv): void {
    const {sx, sy} = e.bokeh

    const frame = this.plot_model.frame
    if (!frame.bbox.contains(sx, sy))
      return

    this.data.sx.push(sx)
    this.data.sy.push(sy)

    this.model.overlay.update({xs: copy(this.data.sx), ys: copy(this.data.sy)})
  }

  _do_select(sx: number[], sy: number[], final: boolean, append: boolean): void {
    const geometry: PolyGeometry = {
      type: 'poly',
      sx: sx,
      sy: sy,
    }
    this._select(geometry, final, append)
  }

  _emit_callback(geometry: PolyGeometry): void {
    const r = this.computed_renderers[0]
    const frame = this.plot_model.frame

    const xscale = frame.xscales[r.x_range_name]
    const yscale = frame.yscales[r.y_range_name]

    const x = xscale.v_invert(geometry.sx)
    const y = yscale.v_invert(geometry.sy)

    const g = extend({x, y}, geometry)
    this.model.callback.execute(this.model, {geometry: g})
  }
}

const DEFAULT_POLY_OVERLAY = () => {
  return new PolyAnnotation({
    level: "overlay",
    xs_units: "screen",
    ys_units: "screen",
    fill_color: {value: "lightgrey"},
    fill_alpha: {value: 0.5},
    line_color: {value: "black"},
    line_alpha: {value: 1.0},
    line_width: {value: 2},
    line_dash: {value: [4, 4]},
  })
}

export class PolySelectTool extends SelectTool {

  callback: any // XXX
  overlay: PolyAnnotation

  tool_name = "Poly Select"
  icon = "bk-tool-icon-polygon-select"
  event_type = "tap"
  default_order = 11
}

PolySelectTool.prototype.type = "PolySelectTool"

PolySelectTool.prototype.default_view = PolySelectToolView

PolySelectTool.define({
  callback:   [ p.Instance                       ],
  overlay:    [ p.Instance, DEFAULT_POLY_OVERLAY ],
})
