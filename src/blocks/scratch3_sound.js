const MathUtil = require('../util/math-util');
const Cast = require('../util/cast');
const Clone = require('../util/clone');

/**
 * Occluded boolean value to make its use more understandable.
 * @const {boolean}
 */
const STORE_WAITING = true;

class Scratch3SoundBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.waitingSounds = {};

        // Clear sound effects on green flag and stop button events.
        this.stopAllSounds = this.stopAllSounds.bind(this);
        this._stopWaitingSoundsForTarget = this._stopWaitingSoundsForTarget.bind(this);
        this._clearEffectsForAllTargets = this._clearEffectsForAllTargets.bind(this);
        if (this.runtime) {
            this.runtime.on('PROJECT_STOP_ALL', this.stopAllSounds);
            this.runtime.on('PROJECT_STOP_ALL', this._clearEffectsForAllTargets);
            this.runtime.on('STOP_FOR_TARGET', this._stopWaitingSoundsForTarget);
            this.runtime.on('PROJECT_START', this._clearEffectsForAllTargets);
        }

        this._onTargetCreated = this._onTargetCreated.bind(this);
        if (this.runtime) {
            runtime.on('targetWasCreated', this._onTargetCreated);
        }
    }

    /**
     * The key to load & store a target's sound-related state.
     * @type {string}
     */
    static get STATE_KEY () {
        return 'Scratch.sound';
    }

    /**
     * The default sound-related state, to be used when a target has no existing sound state.
     * @type {SoundState}
     */
    static get DEFAULT_SOUND_STATE () {
        return {
            effects: {
                pitch: 0,
                pan: 0
            }
        };
    }

    /**
     * The minimum and maximum MIDI note numbers, for clamping the input to play note.
     * @type {{min: number, max: number}}
     */
    static get MIDI_NOTE_RANGE () {
        return {min: 36, max: 96}; // C2 to C7
    }

    /**
     * The minimum and maximum beat values, for clamping the duration of play note, play drum and rest.
     * 100 beats at the default tempo of 60bpm is 100 seconds.
     * @type {{min: number, max: number}}
     */
    static get BEAT_RANGE () {
        return {min: 0, max: 100};
    }

    /** The minimum and maximum tempo values, in bpm.
     * @type {{min: number, max: number}}
     */
    static get TEMPO_RANGE () {
        return {min: 20, max: 500};
    }

    /** The minimum and maximum values for each sound effect.
     * @type {{effect:{min: number, max: number}}}
     */
    static get EFFECT_RANGE () {
        return {
            pitch: {min: -360, max: 360}, // -3 to 3 octaves
            pan: {min: -100, max: 100} // 100% left to 100% right
        };
    }

    /**
     * @param {Target} target - collect sound state for this target.
     * @returns {SoundState} the mutable sound state associated with that target. This will be created if necessary.
     * @private
     */
    _getSoundState (target) {
        let soundState = target.getCustomState(Scratch3SoundBlocks.STATE_KEY);
        if (!soundState) {
            soundState = Clone.simple(Scratch3SoundBlocks.DEFAULT_SOUND_STATE);
            target.setCustomState(Scratch3SoundBlocks.STATE_KEY, soundState);
            target.soundEffects = soundState.effects;
        }
        return soundState;
    }

    /**
     * When a Target is cloned, clone the sound state.
     * @param {Target} newTarget - the newly created target.
     * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
     * @listens Runtime#event:targetWasCreated
     * @private
     */
    _onTargetCreated (newTarget, sourceTarget) {
        if (sourceTarget) {
            const soundState = sourceTarget.getCustomState(Scratch3SoundBlocks.STATE_KEY);
            if (soundState && newTarget) {
                newTarget.setCustomState(Scratch3SoundBlocks.STATE_KEY, Clone.simple(soundState));
                this._syncEffectsForTarget(newTarget);
            }
        }
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            sound_play: this.playSound,
            sound_playuntildone: this.playSoundAndWait,
            sound_stopallsounds: this.stopAllSounds,
            sound_seteffectto: this.setEffect,
            sound_changeeffectby: this.changeEffect,
            sound_cleareffects: this.clearEffects,
            sound_sounds_menu: this.soundsMenu,
            sound_beats_menu: this.beatsMenu,
            sound_effects_menu: this.effectsMenu,
            sound_setvolumeto: this.setVolume,
            sound_changevolumeby: this.changeVolume,
            sound_volume: this.getVolume,
            sound_mabot_set_all_lights_to_one_mode :this.setMabotLights, // 主控 or 驱动球(1) 灯光颜色为 [颜色],  模式为[呼吸,渐变,变化]
            bell_light_color_mode_concurrence :this.setMabotLights, // 设置 主控 or 驱动球(1)灯光颜色为 [颜色],  模式为[呼吸,渐变,变化], 持续（2）秒, 是否阻断
            bell_light_closed :this.closedMabotLight, // 主控驱动球(1) 灯光关闭
            bell_light_play_buzzer :this.playBuzzer, // 播放蜂鸣器, 音调 [高,中,低], 音阶[1,2,...,9]
            bell_light_play_buzzer_concurrence :this.playBuzzer, // 播放蜂鸣器, 音调 [高,中,低], 音阶[1,2,...,9], 持续（2）秒, 是否阻断
            bell_light_closed_buzzer :this.closeMabotBuzzer, // 停止蜂鸣
        };
    }

    getMonitored () {
        return {
            sound_volume: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_volume`
            }
        };
    }

    playSound (args, util) {
        // Don't return the promise, it's the only difference for AndWait
        this._playSound(args, util);
    }

    playSoundAndWait (args, util) {
        return this._playSound(args, util, STORE_WAITING);
    }

    _playSound (args, util, storeWaiting) {
        const index = this._getSoundIndex(args.SOUND_MENU, util);
        if (index >= 0) {
            const {target} = util;
            const {sprite} = target;
            const {soundId} = sprite.sounds[index];
            if (sprite.soundBank) {
                if (storeWaiting === STORE_WAITING) {
                    this._addWaitingSound(target.id, soundId);
                } else {
                    this._removeWaitingSound(target.id, soundId);
                }
                return sprite.soundBank.playSound(target, soundId);
            }
        }
    }

    _addWaitingSound (targetId, soundId) {
        if (!this.waitingSounds[targetId]) {
            this.waitingSounds[targetId] = new Set();
        }
        this.waitingSounds[targetId].add(soundId);
    }

    _removeWaitingSound (targetId, soundId) {
        if (!this.waitingSounds[targetId]) {
            return;
        }
        this.waitingSounds[targetId].delete(soundId);
    }

    _getSoundIndex (soundName, util) {
        // if the sprite has no sounds, return -1
        const len = util.target.sprite.sounds.length;
        if (len === 0) {
            return -1;
        }

        // look up by name first
        const index = this.getSoundIndexByName(soundName, util);
        if (index !== -1) {
            return index;
        }

        // then try using the sound name as a 1-indexed index
        const oneIndexedIndex = parseInt(soundName, 10);
        if (!isNaN(oneIndexedIndex)) {
            return MathUtil.wrapClamp(oneIndexedIndex - 1, 0, len - 1);
        }

        // could not be found as a name or converted to index, return -1
        return -1;
    }

    getSoundIndexByName (soundName, util) {
        const sounds = util.target.sprite.sounds;
        for (let i = 0; i < sounds.length; i++) {
            if (sounds[i].name === soundName) {
                return i;
            }
        }
        // if there is no sound by that name, return -1
        return -1;
    }

    stopAllSounds () {
        if (this.runtime.targets === null) return;
        const allTargets = this.runtime.targets;
        for (let i = 0; i < allTargets.length; i++) {
            this._stopAllSoundsForTarget(allTargets[i]);
        }
    }

    _stopAllSoundsForTarget (target) {
        if (target.sprite.soundBank) {
            target.sprite.soundBank.stopAllSounds(target);
            if (this.waitingSounds[target.id]) {
                this.waitingSounds[target.id].clear();
            }
        }
    }

    _stopWaitingSoundsForTarget (target) {
        if (target.sprite.soundBank) {
            if (this.waitingSounds[target.id]) {
                for (const soundId of this.waitingSounds[target.id].values()) {
                    target.sprite.soundBank.stop(target, soundId);
                }
                this.waitingSounds[target.id].clear();
            }
        }
    }

    setEffect (args, util) {
        return this._updateEffect(args, util, false);
    }

    changeEffect (args, util) {
        return this._updateEffect(args, util, true);
    }

    _updateEffect (args, util, change) {
        const effect = Cast.toString(args.EFFECT).toLowerCase();
        const value = Cast.toNumber(args.VALUE);

        const soundState = this._getSoundState(util.target);
        if (!soundState.effects.hasOwnProperty(effect)) return;

        if (change) {
            soundState.effects[effect] += value;
        } else {
            soundState.effects[effect] = value;
        }

        const {min, max} = Scratch3SoundBlocks.EFFECT_RANGE[effect];
        soundState.effects[effect] = MathUtil.clamp(soundState.effects[effect], min, max);

        this._syncEffectsForTarget(util.target);
        // Yield until the next tick.
        return Promise.resolve();
    }

    _syncEffectsForTarget (target) {
        if (!target || !target.sprite.soundBank) return;
        target.soundEffects = this._getSoundState(target).effects;

        target.sprite.soundBank.setEffects(target);
    }

    clearEffects (args, util) {
        this._clearEffectsForTarget(util.target);
    }

    _clearEffectsForTarget (target) {
        const soundState = this._getSoundState(target);
        for (const effect in soundState.effects) {
            if (!soundState.effects.hasOwnProperty(effect)) continue;
            soundState.effects[effect] = 0;
        }
        this._syncEffectsForTarget(target);
    }

    _clearEffectsForAllTargets () {
        if (this.runtime.targets === null) return;
        const allTargets = this.runtime.targets;
        for (let i = 0; i < allTargets.length; i++) {
            this._clearEffectsForTarget(allTargets[i]);
        }
    }

    setVolume (args, util) {
        const volume = Cast.toNumber(args.VOLUME);
        return this._updateVolume(volume, util);
    }

    changeVolume (args, util) {
        const volume = Cast.toNumber(args.VOLUME) + util.target.volume;
        return this._updateVolume(volume, util);
    }

    _updateVolume (volume, util) {
        volume = MathUtil.clamp(volume, 0, 100);
        util.target.volume = volume;
        this._syncEffectsForTarget(util.target);

        // Yield until the next tick.
        return Promise.resolve();
    }

    getVolume (args, util) {
        return util.target.volume;
    }

    soundsMenu (args) {
        return args.SOUND_MENU;
    }

    beatsMenu (args) {
        return args.BEATS;
    }

    effectsMenu (args) {
        return args.EFFECT;
    }

    setMabotLights (args) {
        const target_light = args.CENTER.replace(/\s/g, "");
        const light_color = Cast.toNumber(args.COLOR);
        const light_mode = Cast.toNumber(args.MODE);
        
        const temp = target_light.split('#');
        const main_light = temp[0] ? [temp[0]] : [];
        const motor_light = temp[1] ? temp[1].split(',') : [];

        console.log(`main_light`, main_light);
        console.log(`motor_light`, motor_light)

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'sound_mabot_set_all_lights_to_one_mode',
                params: {
                    target_light: {
                        main_light,
                        motor_light
                    },
                    light_mode,
                    light_color
                }
            }
        });
        document.dispatchEvent(event);

        if(args.BLOCK != undefined && args.SECONDS != undefined){
            const block = args.BLOCK.indexOf('onebyone.png') > -1
            // const block = Cast.toBoolean(args.BLOCK); // 是否阻塞
            const seconds = Cast.toNumber(args.SECONDS); // 持续x秒
            //持续时间
            setTimeout(()=>{
                this.closedMabotLight(args);
            }, seconds * 1000);
            // 是否阻塞
            if(!block){
                return this.wait(seconds);
            }
        }
    }

    closedMabotLight(args){
        //const light_center = Cast.toNumber(args.CENTER); // 主控 or 驱动球
        const light_center = args.CENTER.replace(/\s/g, "");
        const light_mode = 1; // 模式
        const light_color = 1; // 颜色

        const temp = light_center.split('#');
        const main_light = temp[0] ? [temp[0]] : [];
        const motor_light = temp[1] ? temp[1].split(',') : [];

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_light_closed',
                params: {
                    light_center: {
                        main_light,
                        motor_light
                    },
                    light_mode,
                    light_color
                }
            }
        });
        document.dispatchEvent(event);
    }

    setBeepNum(buzzer_tone, args){
        let volume = 0;
        // buzzer_tone 1高[25-31] 2中[18-24] 3低[11-17]
        switch(buzzer_tone){
            case 1:
                volume = 24 + args;
                break;
            case 2:
                volume = 17 + args;
                break;
            case 3:
                volume = 10 + args;
                break;
        }
        return volume;
    }

    playBuzzer(args){
        const buzzer_tone = Cast.toNumber(args.TONE); // 音调
        const buzzer_volume = Cast.toNumber(args.VOLUME); // 音阶

        let volume = this.setBeepNum(buzzer_tone, buzzer_volume);

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_light_play_buzzer',
                params: {
                    volume
                }
            }
        });
        document.dispatchEvent(event);

        if(args.BLOCK != undefined && args.SECONDS != undefined){
            const block = args.BLOCK.indexOf('onebyone.png') > -1;
            // const block = Cast.toBoolean(args.BLOCK); // 是否阻塞
            const seconds = Cast.toNumber(args.SECONDS); // 持续x秒
            //持续时间
            setTimeout(()=>{
                this.closeMabotBuzzer();
            }, seconds * 1000);
            // 是否阻塞
            if(!block){
                return this.wait(seconds);
            }
        }
    }

    closeMabotBuzzer(){
        //modify by heping 2019/11/27 停止是32
        const closedCode = 32;
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_light_closed_buzzer',
                params: {
                    closedCode
                }
            }
        });
        document.dispatchEvent(event);
    }
    // 等待 or 阻塞
    wait(sec) {
        const duration = Math.max(0, 1000 * Cast.toNumber(sec));
        return new Promise(resolve => {
          setTimeout(() => {
            resolve();
          }, duration);
        });
    }
}

module.exports = Scratch3SoundBlocks;
