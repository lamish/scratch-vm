const Cast = require('../util/cast');
const mabotSensorStatesManager = require('../bell/mabotSensorStatesManager');

class Scratch3EventBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.runtime.on('KEY_PRESSED', key => {
            this.runtime.startHats('event_whenkeypressed', {
                KEY_OPTION: key
            });
            this.runtime.startHats('event_whenkeypressed', {
                KEY_OPTION: 'any'
            });
        });

        this.runtime.on('SENSOR_COLOR', key => {
            this.runtime.startHats('bell_event_color_type', {
                // COLOR_NUM : key.colorIdx,
                COLOR: key.color
            });
        });

        this.runtime.on('SENSOR_TOUCH', key => {
            this.runtime.startHats('bell_event_touch_press', {
                TOUCHPRESS: key
            });
        });

        this.runtime.on('SENSOR_IR', key => {
            this.runtime.startHats('bell_event_infrared_cm', {
                JUDGE: key
            });
        });

        this.runtime.on('SENSOR_GYRO', key => {
            this.runtime.startHats('bell_event_gyro_angle', {});
        });

        window.initForColorSensor = null;
        console.log("__this.runtime.ioDevices", this.runtime);
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives() {
        return {
            event_whentouchingobject: this.touchingObject,
            event_broadcast: this.broadcast,
            event_broadcastandwait: this.broadcastAndWait,
            event_whengreaterthan: this.hatGreaterThanPredicate,

            bell_event_color_type: this.colorSensor, // 当颜色传感器（1） [=>,=,<=] (1)
            bell_event_gyro_angle: this.gyroSensor, // 当陀螺仪的[俯仰角度,翻滚角度,旋转角度] [=>,=,<=][0,0,20]
            bell_event_infrared_cm: this.infraredSensor, // 当红外传感器（1） [=>,=,<=] 距离 [0,0,20]
            bell_event_touch_press: this.touchSensor, // 当触控球（1）的状态为 [按下，没按下]

            event_bell_mobile_shake: this.mobileIsShake,
            event_bell_mobile_hear_sound: this.mobileIsHearSound,
            event_bell_mobile_tilt: this.mobileIsTilt,
            event_bell_finger_slide: this.fingerIsSlide

        };
    }

    getHats() {
        return {
            event_whenflagclicked: {
                restartExistingThreads: true
            },
            event_whenkeypressed: {
                restartExistingThreads: false
            },
            event_whenthisspriteclicked: {
                restartExistingThreads: true
            },
            event_whentouchingobject: {
                restartExistingThreads: false,
                edgeActivated: true
            },
            event_whenstageclicked: {
                restartExistingThreads: true
            },
            event_whenbackdropswitchesto: {
                restartExistingThreads: true
            },
            event_whengreaterthan: {
                restartExistingThreads: false,
                edgeActivated: true
            },
            event_whenbroadcastreceived: {
                restartExistingThreads: true
            },
            bell_event_color_type: {
                restartExistingThreads: true,
            },
            bell_event_touch_press: {
                restartExistingThreads: true,
            },
            bell_event_infrared_cm: {
                restartExistingThreads: true,
            },
            bell_event_gyro_angle: {
                restartExistingThreads: true,
            },
        };
    }

    touchingObject(args, util) {
        return util.target.isTouchingObject(args.TOUCHINGOBJECTMENU);
    }

    hatGreaterThanPredicate(args, util) {
        const option = Cast.toString(args.WHENGREATERTHANMENU).toLowerCase();
        const value = Cast.toNumber(args.VALUE);
        switch (option) {
            case 'timer':
                return util.ioQuery('clock', 'projectTimer') > value;
            case 'loudness':
                return this.runtime.audioEngine && this.runtime.audioEngine.getLoudness() > value;
        }
        return false;
    }

    broadcast(args, util) {
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg(
            args.BROADCAST_OPTION.id, args.BROADCAST_OPTION.name);
        if (broadcastVar) {
            const broadcastOption = broadcastVar.name;
            util.startHats('event_whenbroadcastreceived', {
                BROADCAST_OPTION: broadcastOption
            });
        }
    }

    broadcastAndWait(args, util) {
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg(
            args.BROADCAST_OPTION.id, args.BROADCAST_OPTION.name);
        if (broadcastVar) {
            const broadcastOption = broadcastVar.name;
            // Have we run before, starting threads?
            if (!util.stackFrame.startedThreads) {
                // No - start hats for this broadcast.
                util.stackFrame.startedThreads = util.startHats(
                    'event_whenbroadcastreceived', {
                        BROADCAST_OPTION: broadcastOption
                    }
                );
                if (util.stackFrame.startedThreads.length === 0) {
                    // Nothing was started.
                    return;
                }
            }
            // We've run before; check if the wait is still going on.
            const instance = this;
            // Scratch 2 considers threads to be waiting if they are still in
            // runtime.threads. Threads that have run all their blocks, or are
            // marked done but still in runtime.threads are still considered to
            // be waiting.
            const waiting = util.stackFrame.startedThreads
                .some(thread => instance.runtime.threads.indexOf(thread) !== -1);
            if (waiting) {
                // If all threads are waiting for the next tick or later yield
                // for a tick as well. Otherwise yield until the next loop of
                // the threads.
                if (
                    util.stackFrame.startedThreads
                        .every(thread => instance.runtime.isWaitingThread(thread))
                ) {
                    util.yieldTick();
                } else {
                    util.yield();
                }
            }
        }
    }


    colorSensor(args, util) {
        // util.startBranch(1, true);
        // console.log('colorSensor args--:', args, util);
        const mabot_color_sensor_index = Cast.toNumber(args.COLOR_NUM);
        const target_color = Cast.toNumber(args.COLOR);
        const target_mode = 3; // 模式 1：环境光模式数据2：反射模式数据3：颜色模式数据
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_event_color_type',
                params: {
                    mabot_color_sensor_index,
                    target_mode,
                    target_color
                }
            }
        });
        document.dispatchEvent(event);
        const colorSensor = mabotSensorStatesManager.colorSensor;
        if (colorSensor.statusChanged) {
            colorSensor.statusChanged = false;
            if (colorSensor.colorSensorIndex === mabot_color_sensor_index && colorSensor.colorData[0] === target_color) {
                console.log("color equals，");
                return true;
            } else {
                console.log("color not equals，");
                // if (mabotSensorStatesManager.colorSensorIndex !== mabot_color_sensor_index)
                //     console.log(`mabotSensorStatesManager.colorSensorIndex:${mabotSensorStatesManager.colorSensorIndex},mabot_color_sensor_index:${mabot_color_sensor_index}`)
                // if (mabotSensorStatesManager.colorData[0] !== target_color)
                //     console.log(`mabotSensorStatesManager.colorData[0]: ${mabotSensorStatesManager.colorData[0]},target_color: ${target_color}`)
                return false;
            }
        }
    }

    gyroSensor(args) {
        const direction = Cast.toString(args.DIRECTION);
        const equalsOrNot = Cast.toString(args.JUDGE);
        const angle = Cast.toNumber(args.ANGLE);

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_event_gyro_angle',
                params: {}
            }
        });
        document.dispatchEvent(event);
        const gyroSensor = mabotSensorStatesManager.gyroSensor;
        if (gyroSensor.statusChanged) {
            gyroSensor.statusChanged = false;
            let detectedAngle = 0;
            /**
             *
             * ['俯仰角度', 'gyro_x'],
             * ['旋转角度', 'gyro_y'],
             * ['翻滚角度', 'gyro_z'],
             *
             */
            if (direction === "gyro_x")
                detectedAngle = gyroSensor.gyro_x;
            else if (direction === "gyro_y")
                detectedAngle = gyroSensor.gyro_y;
            else if (direction === "gyro_z")
                detectedAngle = gyroSensor.gyro_z;

            console.log("detectedAngle angle:", detectedAngle, angle);
            if (detectedAngle >= angle) {
                // console.log("detectedAngle >= angle");
                return equalsOrNot === "GREATER";
            } else {
                // console.log("detectedAngle <= angle");
                return equalsOrNot === "LESS";
            }
        }
    }

    infraredSensor(args) {
        const target_infrared = Cast.toNumber(args.INFRARED);
        const target_infrared_as = Cast.toString(args.JUDGE);
        const target_infrared_value = Cast.toNumber(args.DISTANCE);

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_event_infrared_cm',
                params: {
                    target_infrared
                }
            }
        });
        document.dispatchEvent(event);
        const IRSensor = mabotSensorStatesManager.IRSensor;
        if (IRSensor.statusChanged) {
            IRSensor.statusChanged = false;
            console.log(`distance infraredSensor`, IRSensor.IRSensorIndex, IRSensor.touch_ball_index)
            if (IRSensor.IRSensorIndex === target_infrared && IRSensor.distance >= target_infrared_value) {
                console.log("distance greater than " + target_infrared_value, target_infrared_as === "GREATER");
                return target_infrared_as === "GREATER";
            } else {
                console.log("distance less than " + target_infrared_value, target_infrared_as === "LESS");
                return target_infrared_as === "LESS";
            }
        }
    }

    touchSensor(args) {
        const target_touch = Cast.toNumber(args.TOUCH);
        const target_touch_isPress = Cast.toNumber(args.TOUCHPRESS);

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_event_touch_press',
                params: {
                    target_touch,
                }
            }
        });
        document.dispatchEvent(event);
        const touchSensor = mabotSensorStatesManager.touchSensor;
        if (touchSensor.statusChanged) {
            touchSensor.statusChanged = false;
            console.log(`Sensor touch ball`, touchSensor.touch_ball_index, target_touch, touchSensor.touch_ball_pressed)
            if (touchSensor.touch_ball_index === target_touch && touchSensor.touch_ball_pressed === true) {
                console.log("pressed，", touchSensor.touch_ball_index);
                return target_touch_isPress === 1;
            } else {
                console.log("unpressed，", touchSensor.touch_ball_pressed);
                return target_touch_isPress === 0;
            }
        }
    }


    mobileIsShake(args, util) {
        return false;
    }

    mobileIsHearSound(args, util) {
        return false;
    }

    mobileIsTilt(args, util) {
        return false;
    }

    fingerIsSlide(args, util) {
        return false;
    }

}

module.exports = Scratch3EventBlocks;
