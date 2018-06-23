import {Align} from "../../flashbang/core/Align";
import {VLayoutContainer} from "../../flashbang/layout/VLayoutContainer";
import {Setting} from "../../flashbang/settings/Setting";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Eterna} from "../Eterna";
import {Dialog} from "./Dialog";
import {GameButton} from "./GameButton";
import {GameCheckbox} from "./GameCheckbox";
import {GamePanel, GamePanelType} from "./GamePanel";

export enum EternaViewOptionsMode {
    PUZZLE = 0, PUZZLEMAKER, LAB
}

export class EternaViewOptionsDialog extends Dialog<void> {
    public constructor(mode: EternaViewOptionsMode) {
        super();
        this._optionsMode = mode;
    }

    protected added(): void {
        super.added();

        let settingsLayout: VLayoutContainer = new VLayoutContainer(18, Align.LEFT);

        let bind = (setting: Setting<boolean>, name: string) => {
            this.addObject(EternaViewOptionsDialog.createCheckbox(name, setting), settingsLayout);
        };

        bind(Eterna.settings.showNumbers, "Show nucleotides numbers (N)");
        bind(Eterna.settings.showLetters, "Show nucleotides letters");
        bind(Eterna.settings.displayFreeEnergies, "Display free energies for all structures (G)");
        bind(Eterna.settings.highlightRestricted, "Highlight restricted sequences");
        bind(Eterna.settings.autohideToolbar, "Autohide toolbar");
        bind(Eterna.settings.freezeButtonAlwaysVisible, "Freeze button always visible");

        if (this._optionsMode > EternaViewOptionsMode.PUZZLE) {
            bind(Eterna.settings.multipleFoldingEngines, "Multiple folding engines");
        }

        if (this._optionsMode >= EternaViewOptionsMode.LAB) {
            bind(Eterna.settings.useContinuousColors, "Use continuous colors for the exp. data (advanced)");
            bind(Eterna.settings.useExtendedColors, "Use extended 4-color scale for the exp. data (advanced)");
            bind(Eterna.settings.displayAuxInfo, "Display auxiliary information about RNAs");
        }

        let viewLayout: VLayoutContainer = new VLayoutContainer(22, Align.CENTER);
        viewLayout.addChild(settingsLayout);

        let ok_button: GameButton = new GameButton().label("Done", 14);
        this.addObject(ok_button, viewLayout);
        ok_button.clicked.connect(() => this.close(null));

        viewLayout.layout();

        let panel: GamePanel = new GamePanel(GamePanelType.NORMAL, 1, 0x152843, 0.27, 0xC0DCE7);
        panel.set_panel_title("Game options");
        panel.set_size(viewLayout.width + 40, viewLayout.height + 40 + panel.get_title_space());
        this.addObject(panel, this.container);
        DisplayUtil.positionRelativeToStage(panel.display, Align.CENTER, Align.CENTER, Align.CENTER, Align.CENTER);

        panel.display.interactive = true;

        this.container.addChild(viewLayout);
        DisplayUtil.positionRelative(
            viewLayout, Align.CENTER, Align.CENTER,
            panel.display, Align.CENTER, Align.CENTER, 0, panel.get_title_space() * 0.5);

        // Eterna.sound.get_mute_button().set_pos(new UDim(0, 1, 20, -85));
        // Eterna.sound.get_volume_button(1).set_pos(new UDim(0, 1, 45, -82));
        // Eterna.sound.get_volume_button(2).set_pos(new UDim(0, 1, 85, -82));
        // Eterna.sound.get_volume_button(3).set_pos(new UDim(0, 1, 125, -82));
        // Eterna.sound.get_volume_button(4).set_pos(new UDim(0, 1, 165, -82));
        // Eterna.sound.get_volume_button(5).set_pos(new UDim(0, 1, 205, -82));
        //
        // this.add_object(Eterna.sound.get_mute_button());
        // this.add_object(Eterna.sound.get_volume_button(1));
        // this.add_object(Eterna.sound.get_volume_button(2));
        // this.add_object(Eterna.sound.get_volume_button(3));
        // this.add_object(Eterna.sound.get_volume_button(4));
        // this.add_object(Eterna.sound.get_volume_button(5));
    }

    protected onBGClicked(): void {
        this.close(null);
    }

    protected get bgAlpha(): number {
        return 0.3;
    }

    private static createCheckbox(title: string, setting: Setting<boolean>): GameCheckbox {
        let checkbox: GameCheckbox = new GameCheckbox(18, title);
        checkbox.toggled.value = setting.value;
        checkbox.regs.add(setting.connect(checkbox.toggled.slot));
        checkbox.regs.add(checkbox.toggled.connect(setting.slot));
        return checkbox;
    }

    private readonly _optionsMode: EternaViewOptionsMode;
}
