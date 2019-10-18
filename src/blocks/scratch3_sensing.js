const Cast = require('../util/cast');
const Timer = require('../util/timer');
const getMonitorIdForBlockWithArgs = require('../util/get-monitor-id');
const mabotSensorStatesManager = require('../bell/mabotSensorStatesManager');

class Scratch3SensingBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The "answer" block value.
         * @type {string}
         */
        this._answer = '';

        /**
         * The timer utility.
         * @type {Timer}
         */
        this._timer = new Timer();

        /**
         * The stored microphone loudness measurement.
         * @type {number}
         */
        this._cachedLoudness = -1;

        /**
         * The time of the most recent microphone loudness measurement.
         * @type {number}
         */
        this._cachedLoudnessTimestamp = 0;

        /**
         * The list of queued questions and respective `resolve` callbacks.
         * @type {!Array}
         */
        this._questionList = [];

        this.runtime.on('ANSWER', this._onAnswer.bind(this));
        this.runtime.on('PROJECT_START', this._resetAnswer.bind(this));
        this.runtime.on('PROJECT_STOP_ALL', this._clearAllQuestions.bind(this));
        this.runtime.on('STOP_FOR_TARGET', this._clearTargetQuestions.bind(this));
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives() {
        return {
            sensing_touchingobject: this.touchingObject,
            sensing_touchingcolor: this.touchingColor,
            sensing_coloristouchingcolor: this.colorTouchingColor,
            sensing_distanceto: this.distanceTo,
            sensing_timer: this.getTimer,
            sensing_resettimer: this.resetTimer,
            sensing_of: this.getAttributeOf,
            sensing_mousex: this.getMouseX,
            sensing_mousey: this.getMouseY,
            sensing_setdragmode: this.setDragMode,
            sensing_mousedown: this.getMouseDown,
            sensing_keypressed: this.getKeyPressed,
            sensing_current: this.current,
            sensing_dayssince2000: this.daysSince2000,
            sensing_loudness: this.getLoudness,
            sensing_loud: this.isLoud,
            sensing_askandwait: this.askAndWait,
            sensing_answer: this.getAnswer,
            sensing_username: this.getUsername,
            sensing_userid: () => {
            }, // legacy no-op block

            // add by liuming
            mabot_read_sensor_touch_ball: this.mabot_read_sensor_touch_ball,

            bell_detect_touch_press_state: this.DetectTouchPressState,
            bell_detect_color_equal_value: this.DetectColorEqualValue,
            bell_detect_infrared_equal_cm: this.DetectInfraredEqualCm,
            bell_detect_gyro_angle_value: this.DetectGyroAngleValue,
            bell_detect_get_color_value: this.DetectGetColorValue,
            bell_detect_get_infrared_value: this.DetectGetInfraredValue,
            bell_detect_get_gyro_value: this.DetectGetGyroValue,

            bell_detect_reset_gyro : this.DetectResetGyro,
            bell_detect_set_color_mode : this.DetectSetColorMode,
        };
    }

    // eslint-disable-next-line camelcase
    mabot_read_sensor_touch_ball(args) {
        // eslint-disable-next-line camelcase
        const mabot_sensor_index = Cast.toNumber(args.mabot_sensor_index);
        console.log("mabot_sensor_index: ", mabotSensorStatesManager.touch_ball_index);
        console.log("touch_ball_pressed: ", mabotSensorStatesManager.touch_ball_pressed);
        return mabotSensorStatesManager.touchSensor[mabot_sensor_index];
    }

    getMonitored() {
        return {
            sensing_answer: {
                getId: () => 'answer'
            },
            sensing_loudness: {
                getId: () => 'loudness'
            },
            sensing_timer: {
                getId: () => 'timer'
            },
            sensing_current: {
                // This is different from the default toolbox xml id in order to support
                // importing multiple monitors from the same opcode from sb2 files,
                // something that is not currently supported in scratch 3.
                getId: (_, fields) => getMonitorIdForBlockWithArgs('current', fields) // _${param}`
            }
        };
    }

    _onAnswer(answer) {
        this._answer = answer;
        const questionObj = this._questionList.shift();
        if (questionObj) {
            const [_question, resolve, target, wasVisible, wasStage] = questionObj;
            // If the target was visible when asked, hide the say bubble unless the target was the stage.
            if (wasVisible && !wasStage) {
                this.runtime.emit('SAY', target, 'say', '');
            }
            resolve();
            this._askNextQuestion();
        }
    }

    _resetAnswer() {
        this._answer = '';
    }

    _enqueueAsk(question, resolve, target, wasVisible, wasStage) {
        this._questionList.push([question, resolve, target, wasVisible, wasStage]);
    }

    _askNextQuestion() {
        if (this._questionList.length > 0) {
            const [question, _resolve, target, wasVisible, wasStage] = this._questionList[0];
            // If the target is visible, emit a blank question and use the
            // say event to trigger a bubble unless the target was the stage.
            if (wasVisible && !wasStage) {
                this.runtime.emit('SAY', target, 'say', question);
                this.runtime.emit('QUESTION', '');
            } else {
                this.runtime.emit('QUESTION', question);
            }
        }
    }

    _clearAllQuestions() {
        this._questionList = [];
        this.runtime.emit('QUESTION', null);
    }

    _clearTargetQuestions(stopTarget) {
        const currentlyAsking = this._questionList.length > 0 && this._questionList[0][2] === stopTarget;
        this._questionList = this._questionList.filter(question => (
            question[2] !== stopTarget
        ));

        if (currentlyAsking) {
            this.runtime.emit('SAY', stopTarget, 'say', '');
            if (this._questionList.length > 0) {
                this._askNextQuestion();
            } else {
                this.runtime.emit('QUESTION', null);
            }
        }
    }

    askAndWait(args, util) {
        const _target = util.target;
        return new Promise(resolve => {
            const isQuestionAsked = this._questionList.length > 0;
            this._enqueueAsk(String(args.QUESTION), resolve, _target, _target.visible, _target.isStage);
            if (!isQuestionAsked) {
                this._askNextQuestion();
            }
        });
    }

    getAnswer() {
        return this._answer;
    }

    touchingObject(args, util) {
        return util.target.isTouchingObject(args.TOUCHINGOBJECTMENU);
    }

    touchingColor(args, util) {
        const color = Cast.toRgbColorList(args.COLOR);
        return util.target.isTouchingColor(color);
    }

    colorTouchingColor(args, util) {
        const maskColor = Cast.toRgbColorList(args.COLOR);
        const targetColor = Cast.toRgbColorList(args.COLOR2);
        return util.target.colorIsTouchingColor(targetColor, maskColor);
    }

    distanceTo(args, util) {
        if (util.target.isStage) return 10000;

        let targetX = 0;
        let targetY = 0;
        if (args.DISTANCETOMENU === '_mouse_') {
            targetX = util.ioQuery('mouse', 'getScratchX');
            targetY = util.ioQuery('mouse', 'getScratchY');
        } else {
            args.DISTANCETOMENU = Cast.toString(args.DISTANCETOMENU);
            const distTarget = this.runtime.getSpriteTargetByName(
                args.DISTANCETOMENU
            );
            if (!distTarget) return 10000;
            targetX = distTarget.x;
            targetY = distTarget.y;
        }

        const dx = util.target.x - targetX;
        const dy = util.target.y - targetY;
        return Math.sqrt((dx * dx) + (dy * dy));
    }

    setDragMode(args, util) {
        util.target.setDraggable(args.DRAG_MODE === 'draggable');
    }

    getTimer(args, util) {
        return util.ioQuery('clock', 'projectTimer');
    }

    resetTimer(args, util) {
        util.ioQuery('clock', 'resetProjectTimer');
    }

    getMouseX(args, util) {
        return util.ioQuery('mouse', 'getScratchX');
    }

    getMouseY(args, util) {
        return util.ioQuery('mouse', 'getScratchY');
    }

    getMouseDown(args, util) {
        return util.ioQuery('mouse', 'getIsDown');
    }

    current(args) {
        const menuOption = Cast.toString(args.CURRENTMENU).toLowerCase();
        const date = new Date();
        switch (menuOption) {
            case 'year':
                return date.getFullYear();
            case 'month':
                return date.getMonth() + 1; // getMonth is zero-based
            case 'date':
                return date.getDate();
            case 'dayofweek':
                return date.getDay() + 1; // getDay is zero-based, Sun=0
            case 'hour':
                return date.getHours();
            case 'minute':
                return date.getMinutes();
            case 'second':
                return date.getSeconds();
        }
        return 0;
    }

    getKeyPressed(args, util) {
        return util.ioQuery('keyboard', 'getKeyIsDown', [args.KEY_OPTION]);
    }

    daysSince2000() {
        const msPerDay = 24 * 60 * 60 * 1000;
        const start = new Date(2000, 0, 1); // Months are 0-indexed.
        const today = new Date();
        const dstAdjust = today.getTimezoneOffset() - start.getTimezoneOffset();
        let mSecsSinceStart = today.valueOf() - start.valueOf();
        mSecsSinceStart += ((today.getTimezoneOffset() - dstAdjust) * 60 * 1000);
        return mSecsSinceStart / msPerDay;
    }

    getLoudness() {
        if (typeof this.runtime.audioEngine === 'undefined') return -1;
        if (this.runtime.currentStepTime === null) return -1;

        // Only measure loudness once per step
        const timeSinceLoudness = this._timer.time() - this._cachedLoudnessTimestamp;
        if (timeSinceLoudness < this.runtime.currentStepTime) {
            return this._cachedLoudness;
        }

        this._cachedLoudnessTimestamp = this._timer.time();
        this._cachedLoudness = this.runtime.audioEngine.getLoudness();
        return this._cachedLoudness;
    }

    isLoud() {
        return this.getLoudness() > 10;
    }

    getAttributeOf(args) {
        let attrTarget;

        if (args.OBJECT === '_stage_') {
            attrTarget = this.runtime.getTargetForStage();
        } else {
            args.OBJECT = Cast.toString(args.OBJECT);
            attrTarget = this.runtime.getSpriteTargetByName(args.OBJECT);
        }

        // attrTarget can be undefined if the target does not exist
        // (e.g. single sprite uploaded from larger project referencing
        // another sprite that wasn't uploaded)
        if (!attrTarget) return 0;

        // Generic attributes
        if (attrTarget.isStage) {
            switch (args.PROPERTY) {
                // Scratch 1.4 support
                case 'background #':
                    return attrTarget.currentCostume + 1;

                case 'backdrop #':
                    return attrTarget.currentCostume + 1;
                case 'backdrop name':
                    return attrTarget.getCostumes()[attrTarget.currentCostume].name;
                case 'volume':
                    return attrTarget.volume;
            }
        } else {
            switch (args.PROPERTY) {
                case 'x position':
                    return attrTarget.x;
                case 'y position':
                    return attrTarget.y;
                case 'direction':
                    return attrTarget.direction;
                case 'costume #':
                    return attrTarget.currentCostume + 1;
                case 'costume name':
                    return attrTarget.getCostumes()[attrTarget.currentCostume].name;
                case 'size':
                    return attrTarget.size;
                case 'volume':
                    return attrTarget.volume;
            }
        }

        // Target variables.
        const varName = args.PROPERTY;
        const variable = attrTarget.lookupVariableByNameAndType(varName, '', true);
        if (variable) {
            return variable.value;
        }

        // Otherwise, 0
        return 0;
    }

    getUsername(args, util) {
        return util.ioQuery('userData', 'getUsername');
    }

    //************bell- Mabot Star******************

    DetectTouchPressState(args) {
        const mabot_touch_ball_index = Cast.toNumber(args.MOTOR);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_touch_press_state',
                params: {
                    mabot_touch_ball_index,
                }
            }
        });
        document.dispatchEvent(event);

        //console.log("mabot_sensor_index: ", mabotSensorStatesManager.touch_ball_index);
        return new Promise(function (resolve) {
            let init1 = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    if (mabotSensorStatesManager.touch_ball_index === mabot_touch_ball_index && mabotSensorStatesManager.touch_ball_pressed === true) {
                        console.log("pressed，", mabotSensorStatesManager.touch_ball_pressed);
                        resolve(true);
                    } else {
                        console.log("unpressed，", mabotSensorStatesManager.touch_ball_pressed);
                        resolve(false);
                    }
                    mabotSensorStatesManager.statusChanged = false;
                    clearInterval(init1);
                }
            }, 10);
        });
    }

    DetectColorEqualValue(args) {
        const mabot_color_sensor_index = Cast.toNumber(args.MOTOR);
        const equalsOrNot = Cast.toString(args.TOUCHPRESS);
        const color = Cast.toNumber(args.COLOR);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_color_equal_value',
                params: {
                    mabot_color_sensor_index, equalsOrNot, color
                }
            }
        });
        document.dispatchEvent(event);
        //console.log("args: " + args.MOTOR + " " + args.TOUCHPRESS + " " + args.COLOR);
        return new Promise(function (resolve) {
            let init1 = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    if (mabotSensorStatesManager.colorSensorIndex === mabot_color_sensor_index && mabotSensorStatesManager.colorData[0] === color) {
                        console.log("color equals，");
                        if (equalsOrNot === "EQUALS")
                            resolve(true);
                        else
                            resolve(false);
                    } else {
                        console.log("color not equals，");
                        if (equalsOrNot === "UNEQUALS")
                            resolve(true);
                        else
                            resolve(false);
                    }
                    mabotSensorStatesManager.statusChanged = false;
                    clearInterval(init1);
                } else {
                    // console.log("mabot_color_sensor_index: " + mabotSensorStatesManager.colorSensorIndex);
                    // console.log("color: " + mabotSensorStatesManager.colorData);
                }
            }, 20);
        });
    }

    DetectInfraredEqualCm(args) {
        const mabot_IR_sensor_index = Cast.toNumber(args.MOTOR);
        const equalsOrNot = Cast.toString(args.TOUCHPRESS);
        const distance = Cast.toNumber(args.DISTANCE);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_infrared_equal_cm',
                params: {
                    mabot_IR_sensor_index, equalsOrNot, distance
                }
            }
        });
        document.dispatchEvent(event);
        //console.log("args: " + args.MOTOR+ " " + args.TOUCHPRESS + " " + args.COLOR);
        return new Promise(function (resolve) {
            let init1 = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    if (mabotSensorStatesManager.IRSensorIndex === mabot_IR_sensor_index && mabotSensorStatesManager.distance >= distance) {
                        console.log("distance greater than " + distance);
                        if (equalsOrNot === "GREATER")
                            resolve(true);
                        else
                            resolve(false);
                    } else {
                        console.log("distance less than " + distance);
                        if (equalsOrNot === "LESS")
                            resolve(true);
                        else
                            resolve(false);
                    }
                    mabotSensorStatesManager.statusChanged = false;
                    clearInterval(init1);
                }
            }, 20);
        });
    }

    DetectGyroAngleValue(args) {
        const direction = Cast.toString(args.DIRECTION);
        const equalsOrNot = Cast.toString(args.COMPUTE);
        const angle = Cast.toNumber(args.ANGLE);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_gyro_angle_value',
                params: {}
            }
        });
        document.dispatchEvent(event);
        //console.log("args: " + args.MOTOR+ " " + args.TOUCHPRESS + " " + args.COLOR);
        return new Promise(function (resolve) {
            let init1 = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    let detectedAngle = 0;
                    if (direction === "gyro_x")
                        detectedAngle = mabotSensorStatesManager.gyro_x[0] + mabotSensorStatesManager.gyro_x[1] * 256;
                    else if (direction === "gyro_y")
                        detectedAngle = mabotSensorStatesManager.gyro_y[0] + mabotSensorStatesManager.gyro_y[1] * 256;
                    else if (direction === "gyro_z")
                        detectedAngle = mabotSensorStatesManager.gyro_z[0] + mabotSensorStatesManager.gyro_z[1] * 256;

                    detectedAngle = detectedAngle % 360;
                    // console.log(direction + " : " + detectedAngle);
                    // console.log(equalsOrNot + " , " + angle);
                    if (detectedAngle >= angle) {
                        if (equalsOrNot === "GREATER")
                            resolve(true);
                        else
                            resolve(false);
                    } else {
                        if (equalsOrNot === "LESS")
                            resolve(true);
                        else
                            resolve(false);
                    }
                    mabotSensorStatesManager.statusChanged = false;
                    clearInterval(init1);
                }
            }, 20);
        });
    }

    DetectGetColorValue(args) {
        const mabot_color_sensor_index = Cast.toNumber(args.MOTOR);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_color_equal_value',
                params: {
                    mabot_color_sensor_index,
                }
            }
        });
        document.dispatchEvent(event);
        return new Promise(function (resolve) {
            let init1 = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    if (mabotSensorStatesManager.colorSensorIndex === mabot_color_sensor_index) {
                        resolve(mabotSensorStatesManager.colorData[0]);
                    } else
                        resolve(0);
                    mabotSensorStatesManager.statusChanged = false;
                    clearInterval(init1);
                }
            }, 20);
        });
    }

    DetectGetInfraredValue(args) {
        const mabot_IR_sensor_index = Cast.toNumber(args.MOTOR);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_infrared_equal_cm',
                params: {
                    mabot_IR_sensor_index,
                }
            }
        });
        document.dispatchEvent(event);
        return new Promise(function (resolve) {
            let init1 = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    if (mabotSensorStatesManager.IRSensorIndex === mabot_IR_sensor_index) {
                        resolve(mabotSensorStatesManager.distance);
                    } else
                        resolve(0);
                    mabotSensorStatesManager.statusChanged = false;
                    clearInterval(init1);
                }
            }, 20);
        });
    }

    DetectGetGyroValue(args) {
        const direction = Cast.toString(args.DIRECTION);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_gyro_angle_value',
                params: {}
            }
        });
        document.dispatchEvent(event);

        return new Promise(function (resolve) {
            let init1 = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    // let detectedAngle = [];
                    // if (direction === "gyro_x")
                    //     detectedAngle[0] = (mabotSensorStatesManager.gyro_x[0] + mabotSensorStatesManager.gyro_x[1] * 256) % 360;
                    // else if (direction === "gyro_y")
                    //     detectedAngle[1] = (mabotSensorStatesManager.gyro_y[0] + mabotSensorStatesManager.gyro_y[1] * 256) % 360;
                    // else if (direction === "gyro_z")
                    //     detectedAngle[2] = (mabotSensorStatesManager.gyro_z[0] + mabotSensorStatesManager.gyro_z[1] * 256) % 360;
                    // resolve(detectedAngle);
                    let detectedAngle = 0;
                    if (direction === "gyro_x")
                        detectedAngle = mabotSensorStatesManager.gyro_x[0] + mabotSensorStatesManager.gyro_x[1] * 256;
                    else if (direction === "gyro_y")
                        detectedAngle = mabotSensorStatesManager.gyro_y[0] + mabotSensorStatesManager.gyro_y[1] * 256;
                    else if (direction === "gyro_z")
                        detectedAngle = mabotSensorStatesManager.gyro_z[0] + mabotSensorStatesManager.gyro_z[1] * 256;
                    detectedAngle = detectedAngle % 360;
                    resolve(detectedAngle);
                    mabotSensorStatesManager.statusChanged = false;
                    clearInterval(init1);
                }
            }, 20);
        });
    }

    DetectResetGyro(){
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_reset_gyro',
                params: {}
            }
        });
        document.dispatchEvent(event);
    }

    DetectSetColorMode(args){
        const colorSensorIndex = Cast.toNumber(args.indexOfColorSensor);
        const colorMode = Cast.toNumber(args.colorMode);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_detect_set_color_mode',
                params: {
                    colorSensorIndex, colorMode
                }
            }
        });
        document.dispatchEvent(event);
    }
}

module.exports = Scratch3SensingBlocks;
