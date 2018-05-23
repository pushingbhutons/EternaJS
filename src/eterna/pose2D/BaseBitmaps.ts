import {EPars} from "../EPars";
import {BitmapManager} from "../util/BitmapManager";
import {Base} from "./Base";
import {BaseDrawFlags} from "./BaseDrawFlags";
import Rectangle = PIXI.Rectangle;

/** Encapsulates bitmaps for a Base type */
export class BaseBitmaps {
    public baseType: number;

    public letter_data: any[];  // letters

    public body_data: any[];     // max-size
    public f_body_data: any[];   // "dontcare"

    public l_body_data: any[];   // max-size, letter mode
    public lf_body_data: any[];  // "dontcare"

    public lock_data: any[];     // max-size, locked
    public f_lock_data: any[];   // "dontcare"

    public mid_data: any[];      // mid-size
    public f_mid_data: any[];    // "dontcare"

    public mid_lock_data: any[]; // mid-size, locked
    public f_mid_lock_data: any[]; // "dontcare"

    public min_data: BitmapData; // min-size

    constructor (baseType: number) {
        this.baseType = baseType;
        this.letter_data = BaseBitmaps.createLetterBitmaps(baseType, Base.ZOOM_SCALE_FACTOR);

        this.body_data = BaseBitmaps.createBodyBitmaps("LBase*", baseType);
        this.f_body_data = BaseBitmaps.createBodyBitmaps("LBase*f", baseType);
        this.l_body_data = BaseBitmaps.createBodyBitmaps("LBase*", baseType);
        this.lf_body_data = BaseBitmaps.createBodyBitmaps("LBase*f", baseType);
        this.lock_data = BaseBitmaps.createBodyBitmaps("Base*Lock", baseType);
        this.f_lock_data = BaseBitmaps.createBodyBitmaps("Base*fLock", baseType);
        this.mid_data = BaseBitmaps.createBodyBitmaps("Base*Mid", baseType);
        this.f_mid_data = BaseBitmaps.createBodyBitmaps("Base*fMid", baseType);
        this.mid_lock_data = BaseBitmaps.createBodyBitmaps("Base*MidLock", baseType);
        this.f_mid_lock_data = BaseBitmaps.createBodyBitmaps("Base*fMidLock", baseType);
        this.min_data = BitmapManager.get_bitmap_named(BaseBitmaps.getBitmapName("Base*Min", baseType));
    }

    public getBodyBitmap (zoom_level: number, flags: number): BitmapData {
        const locked: boolean = (flags & BaseDrawFlags.LOCKED) != 0;
        const lettermode: boolean = (flags & BaseDrawFlags.LETTER_MODE) != 0;
        const is_dontcare: boolean = (flags & BaseDrawFlags.IS_DONTCARE) != 0;

        if (zoom_level < Base.NUM_ZOOM_LEVELS) {
            if (!locked && !lettermode) {
                return BaseBitmaps.bitmap_for_size(is_dontcare ? this.f_body_data : this.body_data, 0, zoom_level);
            } else if (!locked) {
                return BaseBitmaps.bitmap_for_size(is_dontcare ? this.lf_body_data : this.l_body_data, 0, zoom_level);
            } else {
                return BaseBitmaps.bitmap_for_size(is_dontcare ? this.f_lock_data : this.lock_data, 0, zoom_level);
            }
        } else if (zoom_level < Base.NUM_ZOOM_LEVELS * 2) {
            if (!locked) {
                return BaseBitmaps.bitmap_for_size(is_dontcare ? this.f_mid_data : this.mid_data, 0, zoom_level - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseBitmaps.bitmap_for_size(is_dontcare ? this.f_mid_lock_data : this.mid_lock_data, 0, zoom_level - Base.NUM_ZOOM_LEVELS);
            }
        } else {
            return this.min_data;
        }
    }

    public getLetterBitmap (zoom_level: number, drawFlags: number): BitmapData {
        const lettermode: boolean = (drawFlags & BaseDrawFlags.LETTER_MODE) != 0;
        const locked: boolean = (drawFlags & BaseDrawFlags.LOCKED) != 0;

        if (zoom_level < Base.NUM_ZOOM_LEVELS && ((lettermode && !locked))) {
            return BaseBitmaps.bitmap_for_size(this.letter_data, 0, zoom_level);
        }

        return null;
    }

    private static createLetterBitmaps (baseType: number, zoomScalar: number): any[] {
        let big_letter: GameText = new GameText(FontManager.instance.get_font("Verdana", 18, true));
        big_letter.set_text_color(0x0);
        big_letter.set_text(BaseBitmaps.type2Letter(baseType));

        let bitmap: BitmapData = new BitmapData(22, 22);
        bitmap.fillRect(new Rectangle(0, 0, 22, 22), 0x0);
        bitmap.draw(big_letter);

        let bitmaps: any[] = [bitmap];
        BitmapUtil.create_scaled(bitmaps, zoomScalar, Base.NUM_ZOOM_LEVELS);

        return bitmaps;
    }

    private static createBodyBitmaps (nameTemplate: string, baseType: number): any[] {
        let bmName: string = BaseBitmaps.getBitmapName(nameTemplate, baseType);
        let bitmaps: any[] = [BitmapManager.get_bitmap_named(bmName)];
        BitmapUtil.create_scaled(bitmaps, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return bitmaps;
    }

    private static getBitmapName (nameTemplate: string, baseType: number): string {
        return nameTemplate.replace(/\*/, BaseBitmaps.type2Letter(baseType));
    }

    private static type2Letter (baseType: number): string {
        switch (baseType) {
        case EPars.RNABASE_URACIL:
            return "U";
        case EPars.RNABASE_ADENINE:
            return "A";
        case EPars.RNABASE_GUANINE:
            return "G";
        case EPars.RNABASE_CYTOSINE:
            return "C";
        default:
            throw new Error("Bad baseType: " + baseType);
        }
    }

    private static bitmap_for_size (bitmaps: any[], ii: number, size_num: number): BitmapData {
        if (bitmaps.length % Base.NUM_ZOOM_LEVELS != 0) {
            throw new Error("Invalid bitmaps array length " + bitmaps.length);
        }

        let orig_length: number = bitmaps.length / Base.NUM_ZOOM_LEVELS;
        return bitmaps[(orig_length * size_num + ii)];
    }
}