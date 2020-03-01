const Cast = require('../util/cast');


class Scratch3AIBlocks {

    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this.state = {
            voiceRecognizeResult: "",
        };

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
        document.addEventListener("onVoiceRecognize", this.onVoiceRecognize.bind(this));
    }


    getPrimitives() {
        return {
            ai_voice_recognize: this.voiceRecognize,
            ai_voice_recognize_result: this.showVoiceRecognizeResult,
            ai_voice_synthesis: this.voiceSynthesis,
            ai_voice_synthesis_set_voice_type: this.synthesisInVoiceType,
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
        console.log("this.state.voiceRecognizeResult: ", this.state.voiceRecognizeResult);
        return this.state.voiceRecognizeResult;
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
    }

    synthesisInVoiceType(args, util) {
        const content = Cast.toString(args.CONTENT);
        const tone = Cast.toString(args.TONE);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'ai_voice_synthesis_set_voice_type',
                params: {
                    content,
                    tone
                }
            }
        });
        document.dispatchEvent(event);
    }

    onVoiceRecognize(e) {
        let result = e.detail.res;
        console.log("__onVoiceRecognize result:", result);
        console.log("__currThis: ", this);
        
        // this.setState({
        //     voiceRecognizeResult: result,
        // });
        this.state.voiceRecognizeResult = result;
    }

}

module.exports = Scratch3AIBlocks;