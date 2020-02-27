const Cast = require('../util/cast');


class Scratch3AIBlocks {

    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // this._clearEffectsForAllTargets = this._clearEffectsForAllTargets.bind(this);
        if (this.runtime) {
            // this.runtime.on('PROJECT_STOP_ALL', this.stopAllSounds);
            // this.runtime.on('PROJECT_STOP_ALL', this._clearEffectsForAllTargets);
            // this.runtime.on('STOP_FOR_TARGET', this._stopWaitingSoundsForTarget);
            // this.runtime.on('PROJECT_START', this._clearEffectsForAllTargets);
        }

        // this._onTargetCreated = this._onTargetCreated.bind(this);
        if (this.runtime) {
            // runtime.on('targetWasCreated', this._onTargetCreated);
        }
    }

    getPrimitives() {
        return {
            ai_voice_recognize: this.voiceRecognize,
            ai_voice_recognize_result: this.showVoiceRecognizeResult,
            ai_voice_synthesis: this.voiceSynthesis,
        };
    }

    // Record audio
    voiceRecognize(args) {
        const sec = Cast.toNumber(args.SECS);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'ai_voice_recognize',
                params: {
                    sec,
                }
            }
        });

        document.dispatchEvent(event);
        console.log(`record sec ：`, sec);
    }

    showVoiceRecognizeResult(args) {

    }

    voiceSynthesis(args, util) {
        const content = Cast.toString(args.CONTENT);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'ai_voice_synthesis',
                params: {
                    content,
                }
            }
        });

        document.dispatchEvent(event);
        console.log(`voiceSynthesis content ：`, content);
        console.log("__util:", util);
        
        const { target } = util;
        const { sprite } = target;

        // if (sprite.soundBank) {
        //     return sprite.soundBank.playSound(target, );
        // }
    }

}

module.exports = Scratch3AIBlocks;