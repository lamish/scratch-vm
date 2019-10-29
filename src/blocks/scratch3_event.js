const Cast = require('../util/cast');
const mabotSensorStatesManager = require('../bell/mabotSensorStatesManager');

class Scratch3EventBlocks {
    constructor (runtime) {
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

        this.runtime.on('SENSOR_RUN', key => {
            this.runtime.startHats('bell_event_color_type',{
                COLOR: key
            })
        });

        console.log(this.runtime.ioDevices, "__this.runtime.ioDevices");
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            event_whentouchingobject: this.touchingObject,
            event_broadcast: this.broadcast,
            event_broadcastandwait: this.broadcastAndWait,
            event_whengreaterthan: this.hatGreaterThanPredicate,
            bell_event_color_type: this.colorSensor, // 当颜色传感器（1） [=>,=,<=] (1)
            bell_event_gyro_cm: this.gyroSensor, // 当陀螺仪的[俯仰角度,翻滚角度,旋转角度] [=>,=,<=][0,0,20]
            bell_event_infrared_cm: this.infraredSensor, // 当红外传感器（1） [=>,=,<=] 距离 [0,0,20]
            bell_event_touch_press: this.touchSensor, // 当触控球（1）的状态为 [按下，没按下]

            event_bell_mobile_shake: this.mobileIsShake,
            event_bell_mobile_hear_sound: this.mobileIsHearSound,
            event_bell_mobile_tilt: this.mobileIsTilt,
            event_bell_finger_slide: this.fingerIsSlide

        };
    }

    getHats () {
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
                restartExistingThreads: false
            }
        };
    }

    touchingObject (args, util) {
        return util.target.isTouchingObject(args.TOUCHINGOBJECTMENU);
    }

    hatGreaterThanPredicate (args, util) {
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

    broadcast (args, util) {
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg(
            args.BROADCAST_OPTION.id, args.BROADCAST_OPTION.name);
        if (broadcastVar) {
            const broadcastOption = broadcastVar.name;
            util.startHats('event_whenbroadcastreceived', {
                BROADCAST_OPTION: broadcastOption
            });
        }
    }

    broadcastAndWait (args, util) {
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
    
    colorSensor(args, util){
        // util.startBranch(1, true);
        console.log('colorSensor args--:',args, util);
         //setInterval(() => {
            const target_color_number = Cast.toNumber(args.COLOR_NUM);
            const target_color = Cast.toNumber(args.COLOR);
            const target_mode = 3; // 模式 1：环境光模式数据2：反射模式数据3：颜色模式数据
            const event = new CustomEvent('mabot', {
                detail: {
                    type: 'bell_event_color_type',
                    params: {
                        target_color_number, 
                        target_mode
                    }
                }
            });
            document.dispatchEvent(event);
            
            return new Promise(function (resolve) {
                if (mabotSensorStatesManager.statusChanged) {
                    if (mabotSensorStatesManager.colorSensorIndex === target_color_number && mabotSensorStatesManager.colorData[0] === target_color) {
                        console.log("color equals，");
                        resolve(true);                        
                    } else {
                        console.log("color not equals，");
                        resolve(false);
                    }
                    mabotSensorStatesManager.statusChanged = false;
                }
            });
        // }, 200)
        // return this.wait();
    }

    gyroSensor(args){
        const target_gyro = Cast.toNumber(args.GYRO);
        const target_gyro_as = Cast.toNumber(args.JUDGE);
        const target_gyro_value = Cast.toNumber(args.DISTANCE);

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_event_gyro_cm',
                params: {
                    target_gyro, 
                    target_gyro_as,
                    target_gyro_value
                }
            }
        });
        document.dispatchEvent(event);
    }

    infraredSensor(args){
        const target_infrared = Cast.toNumber(args.INFRARED);
        const target_infrared_as = Cast.toNumber(args.JUDGE);
        const target_infrared_value = Cast.toNumber(args.DISTANCE);

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_event_infrared_cm',
                params: {
                    target_infrared, 
                    target_infrared_as,
                    target_infrared_value
                }
            }
        });
        document.dispatchEvent(event);
    }

    touchSensor(args){
        const target_touch = Cast.toNumber(args.TOUCH);
        const target_touch_isPress = Cast.toNumber(args.TOUCHPRESS);

        const event = new CustomEvent('mabot', {
            detail: {
                type: 'bell_event_touch_press',
                params: {
                    target_touch, 
                    target_touch_isPress
                }
            }
        });
        document.dispatchEvent(event);
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
