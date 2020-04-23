import {Signal, UnitSignal} from 'signals';

export default class RSignals {
    public static pushPuzzle = new Signal<string>();
    public static popPuzzle = new UnitSignal();
}
