const Cast = require('../util/cast');

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

    colorSensor(args){
        const target_color_number = Cast.toNumber(args.COLOR_NUM);
        const target_color = Cast.toNumber(args.COLOR);

    }

    gyroSensor(args){
        const target_gyro = Cast.toNumber(args.GYRO);
        const target_gyro_as = Cast.toNumber(args.JUDGE);
        const target_gyro_value = Cast.toNumber(args.DISTANCE);
    }

    infraredSensor(args){
        const target_infrared = Cast.toNumber(args.INFRARED);
        const target_infrared_as = Cast.toNumber(args.JUDGE);
        const target_infrared_value = Cast.toNumber(args.DISTANCE);
    }

    touchSensor(args){
        const target_touch = Cast.toNumber(args.TOUCH);
        const target_touch_isPress = Cast.toNumber(args.TOUCHPRESS);


    }
}

module.exports = Scratch3EventBlocks;
