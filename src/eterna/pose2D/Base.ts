﻿import * as log from "loglevel";
import {Point, Rectangle} from "pixi.js";
import {Constants} from "../Constants";
import {EPars} from "../EPars";
import {BaseAssets} from "./BaseAssets";
import {BaseDrawFlags} from "./BaseDrawFlags";

export class Base {
    public static NUM_ZOOM_LEVELS: number = 2;
    public static ZOOM_SCALE_FACTOR: number = 0.75;

    constructor (type: number) {
        BaseAssets.init();
        this.set_type(type);
    }

    public set_base_index (i: number): void {
        this._base_idx = i;
    }

    public start_sparking (): void {
        if (this._sparking) {
            return;
        }

        this._sparking = true;
        this._spark_start_time = -1;
        let rand_angle: number = Math.random() * Math.PI * 2;
        this._spark_dir = new Point(Math.cos(rand_angle), Math.sin(rand_angle));
    }

    public set_go_dir (go_x: number, go_y: number): void {
        if (Math.abs(go_x - this._go_x) > Constants.EPSILON) {
            this._go_x = go_x;
            this._redraw = true;
        }

        if (Math.abs(go_y - this._go_y) > Constants.EPSILON) {
            this._go_y = go_y;
            this._redraw = true;
        }
    }

    public set_out_dir (out_x: number, out_y: number): void {
        if (Math.abs(out_x - this._out_x) > Constants.EPSILON) {
            this._out_x = out_x;
            this._redraw = true;
        }

        if (Math.abs(out_y - this._out_y) > Constants.EPSILON) {
            this._out_y = out_y;
            this._redraw = true;
        }
    }

    public get_out_xy (): Point {
        return new Point(this._out_x, this._out_y);
    }

    public get_x (): number {
        return this._x;
    }

    public get_y (): number {
        return this._y;
    }

    public set_xy (x: number, y: number): void {

        if (Math.abs(x - this._x) > Constants.EPSILON) {
            this._x = x;
            this._redraw = true;
        }

        if (Math.abs(y - this._y) > Constants.EPSILON) {
            this._y = y;
            this._redraw = true;
        }
    }

    public set_type (type: number, playsound: boolean = false): void {
        if (this._base_type == type) {
            return;
        }

        this._base_type = type;
        this._redraw = true;

        if (playsound) {
            const soundName: string = BaseAssets.getBaseTypeSound(type);
            if (soundName != null) {
                SoundManager.instance.play_se(soundName);
            }
        }
        ROPWait.NotifyNucleotideChange(this._base_idx, type);
    }

    public get_type (): number {
        return this._base_type;
    }

    public set_visible (vis: boolean): void {
        this._visible = vis;
    }

    public set_forced (forced: boolean): void {
        this._is_forced = forced;
    }

    public set_dontcare (dontcare: boolean): void {
        this._is_dontcare = dontcare;
    }

    public set_force_unpaired (force: boolean): void {
        this._force_unpaired = force;
    }

    public need_redraw (is_static: boolean): boolean {
        if (!this._visible || this._base_type == EPars.RNABASE_CUT) {
            return false;
        }

        return this._redraw || (this._animate && !is_static) || (this._pairing && !is_static) || (this._unpairing && !is_static) || this._sparking;
    }

    public redraw (): void {
        this._redraw = true;
    }

    public set_color_level (use_color: boolean, color_level: number): void {
        if (!use_color) {
            this._color_level = -1;
            return;
        }

        this._color_level = color_level;
    }

    public set_last (lastbase: boolean): void {
        if (this._is_last != lastbase) {
            this._is_last = lastbase;
            this._redraw = true;
        }
    }

    public animate (): void {
        if (!this._animate && !this._unpairing) {
            this._animate = true;
            this._animation_start_time = -1;
        }
    }

    public set_pairing (pairing: boolean, go_x: number, go_y: number, duration: number, pair_type: number): void {
        let target_angle: number = Math.atan2(go_y, go_x) * 180.0 / Math.PI;


        if (this._pairing && !pairing) {
            this._unpairing = true;
            this._redraw = true;
        }

        if (!this._pairing && pairing) {
            this._redraw = true;
        }

        if (this._pair_type != pair_type) {
            this._redraw = true;
        }


        this._pairing = pairing;

        if (this._pairing) {
            this._unpairing = false;
        }

        this._pairing_start_time = -1;
        this._pairing_complete_time = -1;
        this._pairing_duration = duration;
        this._pairing_start_degree = this._last_satelite1_abs_degree;
        this._pairing_target_degree = target_angle;
        this._pairing_start_radius = this._last_satelite1_radius;
        this._pair_type = pair_type;

        if (Math.abs(this._pairing_target_degree - this._pairing_start_degree) > 180) {
            if (this._pairing_target_degree > this._pairing_start_degree) {
                this._pairing_target_degree -= 360;
            } else {
                this._pairing_target_degree += 360;
            }
        }
    }

    public is_clicked (x: number, y: number, zoomlev: number, lenient: boolean): number {
        let diffx: number, diffy: number;

        diffx = this._x - x;
        diffy = this._y - y;

        let sq_dist: number = diffx * diffx + diffy * diffy;

        if (!lenient) {
            let threshold: number = BaseAssets.getHitTestDistanceThreshold(zoomlev);
            if (sq_dist < threshold * threshold) {
                return sq_dist;
            }
        } else if (sq_dist < 225) {
            return sq_dist;
        }
        return -1;
    }

    public bit_blit (zoom_level: number, canvas: BitmapData, off_x: number, off_y: number, current_time: number, drawFlags: number, metabd: BitmapData = null, highlight_state: Object = null): Rectangle {
        if (!this._visible) {
            return null;
        }

        let dirty: Rectangle = null;
        let r: Rectangle;
        this._redraw = false;

        if (this._is_dontcare) {
            drawFlags |= BaseDrawFlags.IS_DONTCARE;
        }

        const is_static: boolean = (drawFlags & BaseDrawFlags.STATIC) != 0;
        const lowperform: boolean = (drawFlags & BaseDrawFlags.LOW_PERFORM) != 0;

        let body_data: BitmapData = BaseAssets.getBodyBitmap(this._base_type, this._color_level, zoom_level, drawFlags);
        const barcode_data: BitmapData = BaseAssets.getBarcodeBitmap(zoom_level, drawFlags);

        let random_x: number = 0;
        let random_y: number = 0;
        let angle_rand: number = 0;

        if (this._animate && !is_static) {
            if (this._animation_start_time < 0) {
                this._animation_start_time = current_time;
            }

            let prog: number = (current_time - this._animation_start_time) / 300.0;
            if (prog > 2 * Math.PI) {
                this._animate = false;
                prog = 2 * Math.PI;
            }

            let progsin: number = Math.sin(prog);
            angle_rand = Math.PI / 12.0 * progsin;

            random_x = this._go_y * progsin * 0.07;
            random_y = -this._go_x * progsin * 0.07;
        }

        let pairing_prog: number = 0;

        if (this._pairing || this._unpairing) {
            if (this._pairing_start_time < 0) {
                this._pairing_start_time = current_time;
            }

            if (this._pairing_duration == 0) {
                pairing_prog = 1;
                this._pairing_complete_time = current_time;
            } else {
                pairing_prog = (current_time - this._pairing_start_time) / (this._pairing_duration * 1000);
                if (pairing_prog >= 1) {
                    pairing_prog = 1;
                    if (this._pairing_complete_time < 0) {
                        this._pairing_complete_time = current_time;
                    }
                }
            }

            if (is_static) {
                pairing_prog = 1;
                this._pairing_complete_time = current_time;
            }

        }


        let draw_body: boolean = false;
        if (body_data) {
            draw_body = true;

            this._last_center_x = this._x + random_x + off_x;
            this._last_center_y = this._y + random_y + off_y;

            if (this._x + random_x + off_x + body_data.width / 2 < 0 || this._x + random_x + off_x - body_data.width / 2 > canvas.width)
                draw_body = false;

            if (this._y + random_y + off_y + body_data.height / 2 < 0 || this._y + random_y + off_y - body_data.height / 2 > canvas.height)
                draw_body = false;


            if (barcode_data != null && draw_body) {
                if (this._x + random_x + off_x + barcode_data.width / 2 < 0 || this._x + random_x + off_x - barcode_data.width / 2 > canvas.width)
                    draw_body = false;

                if (this._y + random_y + off_y + barcode_data.height / 2 < 0 || this._y + random_y + off_y - barcode_data.height / 2 > canvas.height)
                    draw_body = false;
            }

            if (draw_body) {
                let base_rect: Rectangle = null;
                let base_point: Point = null;

                if (barcode_data != null) {
                    base_rect = new Rectangle(0, 0, barcode_data.width, barcode_data.height);
                    base_point = new Point(this._x + random_x + off_x - barcode_data.width / 2, this._y + random_y + off_y - barcode_data.height / 2);
                    canvas.copyPixels(barcode_data, base_rect, base_point, null, null, true);
                    r = base_rect.clone();
                    r.offsetPoint(base_point);
                    dirty = (dirty == null ? r.clone() : dirty.union(r));
                }

                base_rect = new Rectangle(0, 0, body_data.width, body_data.height);
                base_point = new Point(this._x + random_x + off_x - body_data.width / 2, this._y + random_y + off_y - body_data.height / 2);
                if (this._is_forced) {
                    let temp_bd: BitmapData = body_data.clone();
                    temp_bd.colorTransform(base_rect, new ColorTransform(1, 1, 1, 0.2, 0, 0, 0, 0));
                    body_data = temp_bd;
                }

                if (highlight_state) {
                    this.bit_blit_highlight(canvas, base_rect, base_point, body_data, highlight_state);
                } else {
                    canvas.copyPixels(body_data, base_rect, base_point, null, null, true);
                }
                r = base_rect.clone();
                r.offsetPoint(base_point);
                dirty = (dirty == null ? r.clone() : dirty.union(r));

                let letterdata: BitmapData = BaseAssets.getLetterBitmap(this._base_type, zoom_level, drawFlags);
                if (letterdata != null) {
                    let letter_rect: Rectangle = new Rectangle(0, 0, letterdata.width, letterdata.height);
                    let letter_point: Point = new Point(this._x + random_x + off_x - letterdata.width / 2 + 1, this._y + random_y + off_y - letterdata.height / 2 - 2);
                    canvas.copyPixels(letterdata, letter_rect, letter_point, null, null, true);
                    r = letter_rect.clone();
                    r.offsetPoint(letter_point);
                    dirty = (dirty == null ? r.clone() : dirty.union(r));
                }

            }
        }

        if (Math.abs(this._go_x) > 0 || Math.abs(this._go_y) > 0) {
            if (zoom_level < 2 * Base.NUM_ZOOM_LEVELS && !this._is_last && !lowperform) {
                let bb_x: number = this._x + random_x + off_x + this._go_x / 2;
                let bb_y: number = this._y + random_y + off_y + this._go_y / 2;

                const bb_data: BitmapData = BaseAssets.getBackboneBitmap(zoom_level, drawFlags);
                let draw_bb: boolean = true;

                if (bb_x + bb_data.width / 2 < 0 || bb_x - bb_data.width / 2 > canvas.width)
                    draw_bb = false;

                if (bb_y + bb_data.height / 2 < 0 || bb_y - bb_data.height / 2 > canvas.height)
                    draw_bb = false;

                if (draw_bb) {
                    let bb_rect: Rectangle = new Rectangle(0, 0, bb_data.width, bb_data.height);
                    let bb_point: Point = new Point(bb_x - bb_data.width / 2, bb_y - bb_data.height / 2);
                    canvas.copyPixels(bb_data, bb_rect, bb_point, null, null, true);
                    r = bb_rect.clone();
                    r.offsetPoint(bb_point);
                    dirty = (dirty == null ? r.clone() : dirty.union(r));
                }
            }

            let go_radian: number = Math.atan2(this._go_y, this._go_x);
            let satelite_body_data: BitmapData;


            if (zoom_level < Base.NUM_ZOOM_LEVELS && !lowperform) {
                const reference_base_size: number = BaseAssets.getSatelliteReferenceBaseSize(zoom_level);

                let st0_diff_degree: number;
                let st0_x: number;
                let st0_y: number;

                let st0_angle: number = Math.PI / 5.2 + angle_rand;
                st0_diff_degree = (go_radian + st0_angle) * 180 / Math.PI - 90.0;
                st0_diff_degree = Base.to_canonical_range(st0_diff_degree);
                let st0_cos: number = Math.cos(st0_angle);
                let st0_sin: number = Math.sin(st0_angle);
                st0_x = this._go_x / 2.5 * st0_cos - this._go_y / 2.5 * st0_sin + this._x + off_x + random_x;
                st0_y = this._go_x / 2.5 * st0_sin + this._go_y / 2.5 * st0_cos + this._y + off_y + random_y;


                if (Number(st0_diff_degree / 5) < 0 || Number(st0_diff_degree / 5) > 71) {
                    if (Number(st0_diff_degree / 5) < -1 || Number(st0_diff_degree / 5) > 72) {
                        log.debug(st0_diff_degree);
                        throw new Error("WHAT0");
                    }

                    st0_diff_degree = 0;
                }


                satelite_body_data = BaseAssets.getSatellite0Bitmap(zoom_level, st0_diff_degree);

                let draw_st0: boolean = !this._force_unpaired;

                if (st0_x + satelite_body_data.width / 2 < 0 || st0_x - satelite_body_data.width / 2 > canvas.width)
                    draw_st0 = false;

                if (st0_y + satelite_body_data.height / 2 < 0 || st0_y - satelite_body_data.height / 2 > canvas.height)
                    draw_st0 = false;

                if (draw_st0) {
                    let st0_rect: Rectangle = new Rectangle(0, 0, satelite_body_data.width, satelite_body_data.height);
                    let st0_point: Point = new Point(st0_x - satelite_body_data.width / 2, st0_y - satelite_body_data.height / 2);
                    if (highlight_state) {
                        this.bit_blit_highlight(canvas, st0_rect, st0_point, satelite_body_data, highlight_state);
                    } else {
                        canvas.copyPixels(satelite_body_data, st0_rect, st0_point, null, null, true);
                    }
                    r = st0_rect.clone();
                    r.offsetPoint(st0_point);
                    dirty = (dirty == null ? r.clone() : dirty.union(r));
                }

                let draw_st1: boolean = !this._force_unpaired;
                let st1_diff_degree: number;
                let st1_x: number;
                let st1_y: number;

                let current_radian: number;

                if (!this._pairing) {

                    if (!this._unpairing) {
                        let st1_angle: number = -Math.PI / 5.2 - angle_rand;
                        st1_diff_degree = (go_radian + st1_angle) * 180 / Math.PI - 90.0;
                        st1_diff_degree = Base.to_canonical_range(st1_diff_degree);
                        let st1_cos: number = Math.cos(st1_angle);
                        let st1_sin: number = Math.sin(st1_angle);
                        st1_x = this._go_x / 2.5 * st1_cos - this._go_y / 2.5 * st1_sin + this._x + off_x + random_x;
                        st1_y = this._go_x / 2.5 * st1_sin + this._go_y / 2.5 * st1_cos + this._y + off_y + random_y;

                        this._last_satelite1_radius = reference_base_size * 0.45;
                    } else {
                        let target_angle: number = (go_radian - Math.PI / 5.2) * 180 / Math.PI;

                        if (Math.abs(target_angle - this._pairing_start_degree) > 180) {
                            if (target_angle > this._pairing_start_degree) {
                                target_angle -= 360;
                            } else {
                                target_angle += 360;
                            }
                        }

                        let current_angle: number = this._pairing_start_degree * (1 - pairing_prog) + target_angle * pairing_prog;
                        current_radian = current_angle * Math.PI / 180.0;
                        st1_diff_degree = Base.to_canonical_range(current_angle - 90.0);
                        let current_radius: number = this._pairing_start_radius * (1 - pairing_prog) + (reference_base_size * 0.45) * pairing_prog;
                        st1_x = Math.cos(current_radian) * current_radius + this._x + off_x;
                        st1_y = Math.sin(current_radian) * current_radius + this._y + off_y;
                        this._last_satelite1_radius = current_radius;

                    }

                } else {
                    let current_degree: number = this._pairing_target_degree * pairing_prog + this._pairing_start_degree * (1 - pairing_prog);
                    current_radian = current_degree * Math.PI / 180.0;

                    st1_diff_degree = current_degree - 90.0;
                    st1_diff_degree = Base.to_canonical_range(st1_diff_degree);

                    let pair_r: number = 0;

                    if (this._pairing_complete_time >= 0) {
                        pair_r = (Math.cos((current_time - this._pairing_complete_time) / 250.0 + Math.PI / 2)) * 2 + reference_base_size * 0.45;
                    } else {
                        pair_r = pairing_prog * (reference_base_size * 0.45) + (1 - pairing_prog) * this._pairing_start_radius;
                    }

                    st1_x = Math.cos(current_radian) * pair_r + this._x + off_x;
                    st1_y = Math.sin(current_radian) * pair_r + this._y + off_y;

                    this._last_satelite1_radius = pair_r;

                }

                if (Number(st1_diff_degree / 5) < 0 || Number(st1_diff_degree / 5) > 71) {
                    if (Number(st1_diff_degree / 5) < -1 || Number(st1_diff_degree / 5) > 72) {
                        log.debug(st1_diff_degree);
                        throw new Error("WHAT1");
                    }

                    st1_diff_degree = 0;
                }


                satelite_body_data = BaseAssets.getSatellite1Bitmap(zoom_level, st1_diff_degree, this._pair_type);

                if (st1_x + satelite_body_data.width / 2 < 0 || st1_x - satelite_body_data.width / 2 > canvas.width)
                    draw_st1 = false;

                if (st1_y + satelite_body_data.height / 2 < 0 || st1_y - satelite_body_data.height / 2 > canvas.height)
                    draw_st1 = false;

                this._last_satelite1_abs_degree = st1_diff_degree + 90.0;

                if (draw_st1) {
                    let st1_rect: Rectangle = new Rectangle(0, 0, satelite_body_data.width, satelite_body_data.height);
                    let st1_point: Point = new Point(st1_x - satelite_body_data.width / 2, st1_y - satelite_body_data.height / 2);

                    if (highlight_state) {
                        this.bit_blit_highlight(canvas, st1_rect, st1_point, satelite_body_data, highlight_state);
                    } else {
                        canvas.copyPixels(satelite_body_data, st1_rect, st1_point, null, null, true);
                    }
                    r = st1_rect.clone();
                    r.offsetPoint(st1_point);
                    dirty = (dirty == null ? r.clone() : dirty.union(r));
                }

            }
        }

        if (this._unpairing && this._pairing_complete_time >= 0) {
            this._unpairing = false;
        }

        if (metabd != null && body_data != null && draw_body) {
            let desired_dist: number = Math.sqrt((metabd.width / 2) * (metabd.width / 2) + (metabd.height / 2) * (metabd.height / 2));
            desired_dist += Math.sqrt((this._out_x / 2) * (this._out_x / 2) + (this._out_y / 2) * (this._out_y / 2));
            desired_dist *= 0.8;

            let out_dist: number = Math.sqrt(this._out_x * this._out_x + this._out_y * this._out_y);
            if (out_dist < Constants.EPSILON)
                return dirty;

            let meta_pos: Point = new Point(off_x + this._x + this._out_x * desired_dist / out_dist, off_y + this._y + this._out_y * desired_dist / out_dist);

            let draw_meta: boolean = true;

            if (meta_pos.x + metabd.width / 2 < 0 || meta_pos.x - metabd.width / 2 > canvas.width)
                draw_meta = false;

            if (meta_pos.y + metabd.height / 2 < 0 || meta_pos.y - metabd.height / 2 > canvas.height)
                draw_meta = false;

            if (draw_meta) {
                let meta_rect: Rectangle = new Rectangle(0, 0, metabd.width, metabd.height);
                meta_pos.x -= metabd.width / 2;
                meta_pos.y -= metabd.height / 2;
                canvas.copyPixels(metabd, meta_rect, meta_pos, null, null, true);
                r = meta_rect.clone();
                r.offsetPoint(meta_pos);
                dirty = (dirty == null ? r.clone() : dirty.union(r));
            }
        }

        return dirty;
    }

    public bit_blit_after_effect (zoom_level: number, canvas: BitmapData, off_x: number, off_y: number, current_time: number): Rectangle {
        if (!this._sparking) {
            return null;
        }

        let dirty: Rectangle = null;
        let r: Rectangle;

        if (this._spark_start_time < 0) {
            this._spark_start_time = current_time;
        }

        let duration: number = 1000;

        let sparkProgress: number = (current_time - this._spark_start_time) / duration;

        if (sparkProgress >= 1) {
            this._sparking = false;
            this._spark_start_time = -1;
            // prog = 1;
            return dirty;
        } else if (sparkProgress < 0) {
            sparkProgress = 0;
        }

        let spark_bitmap: BitmapData = BaseAssets.getSparkBitmap(sparkProgress);

        let flying_dist: number = 70;
        if (zoom_level < Base.NUM_ZOOM_LEVELS) {
            flying_dist = 100;
        }


        let sp_rect: Rectangle = new Rectangle(0, 0, spark_bitmap.width, spark_bitmap.height);
        let sp_point: Point = new Point(this._x + off_x - spark_bitmap.width / 2 + this._spark_dir.x * flying_dist * sparkProgress, this._y + off_y - spark_bitmap.height / 2 + this._spark_dir.y * flying_dist * sparkProgress);
        let sp_point2: Point = new Point(this._x + off_x - spark_bitmap.width / 2 - this._spark_dir.x * flying_dist * sparkProgress, this._y + off_y - spark_bitmap.height / 2 - this._spark_dir.y * flying_dist * sparkProgress);

        canvas.copyPixels(spark_bitmap, sp_rect, sp_point, null, null, true);
        r = sp_rect.clone();
        r.offsetPoint(sp_point);
        dirty = (dirty == null ? r.clone() : dirty.union(r));
        canvas.copyPixels(spark_bitmap, sp_rect, sp_point2, null, null, true);
        r = sp_rect.clone();
        r.offsetPoint(sp_point2);
        dirty = (dirty == null ? r.clone() : dirty.union(r));

        return dirty;
    }

    public get_last_drawn_pos (): Point {
        return new Point(this._last_center_x, this._last_center_y);
    }

    private bit_blit_highlight (canvas: BitmapData, rect: Rectangle, point: Point, bd_data: BitmapData, highlight_state: Object): void {
        if (highlight_state.isOn && highlight_state.nuc.indexOf(this._base_idx) == -1) {
            let bd: BitmapData = bd_data.clone();
            let ct: ColorTransform = new ColorTransform();
            ct.alphaMultiplier = 0.55;
            bd.colorTransform(rect, ct);
            canvas.copyPixels(bd, rect, point, null, null, true);
        } else {
            canvas.copyPixels(bd_data, rect, point, null, null, true);
            // draw it twice more to highlight
            if (highlight_state.isOn) {
                canvas.copyPixels(bd_data, rect, point, null, null, true);
                canvas.copyPixels(bd_data, rect, point, null, null, true);
            }
        }
    }

    private static to_canonical_range (deg: number): number {
        if (deg > 0) {
            deg = deg - (Number(deg / 360.0) * 360);
            if (deg >= 360) {
                deg = 359;
            }
            return deg;
        } else if (deg < 0) {
            let deg2: number = deg + (Number(-deg / 360.0) * 360);
            if (deg2 < 0) {
                return deg2 + 360;
            } else {
                return deg2;
            }
        }

        return deg;
    }

    private _base_type: number = -1;
    // The index of the base in the base array.
    private _base_idx: number = -1;
    private _x: number = 0;
    private _y: number = 0;
    private _go_x: number = 0;
    private _go_y: number = 0;
    private _out_x: number = 0;
    private _out_y: number = 0;
    private _redraw: boolean = true;
    private _last_center_x: number;
    private _last_center_y: number;
    private _animation_start_time: number;
    private _animate: boolean = false;
    private _pairing: boolean = false;
    private _unpairing: boolean;
    private _pairing_start_time: number = -1;
    private _pairing_complete_time: number = -1;
    private _pairing_duration: number = 1;
    private _pairing_target_degree: number;
    private _pairing_start_degree: number;
    private _pairing_start_radius: number = 0;
    private _pair_type: number = -1;
    private _last_satelite1_abs_degree: number = -Math.PI / 5.2;
    private _last_satelite1_radius: number = 0;
    private _is_last: boolean;
    private _color_level: number = -1;
    private _is_forced: boolean;
    private _is_dontcare: boolean;
    private _force_unpaired: boolean;
    private _sparking: boolean = false;
    private _spark_start_time: number = -1;
    private _spark_dir: Point;
    private _visible: boolean = true;
}