import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';

export default class LinearFoldE extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldE';

    /**
     * Asynchronously creates a new instance of the LinearFoldE folder.
     * @returns {Promise<LinearFoldE>}
     */
    public static create(): Promise<LinearFoldE | null> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/LinearFoldE')
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFoldE(program))
            .catch((err) => null);
    }

    public get name(): string {
        return LinearFoldE.NAME;
    }
}
