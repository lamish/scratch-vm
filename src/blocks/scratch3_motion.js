const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');
const Timer = require('../util/timer');
const mabotSensorStatesManager = require('../bell/mabotSensorStatesManager');
const ANGLE_LOOP_TIME = 50;
const ANGLE_LOOP_TIMEOUT = 1000;
const TIME_OUT = 1000;

class Scratch3MotionBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.timeout = 500;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives() {
        return {
            motion_movesteps: this.moveSteps,
            motion_gotoxy: this.goToXY,
            motion_goto: this.goTo,
            motion_turnright: this.turnRight,
            motion_turnleft: this.turnLeft,
            motion_pointindirection: this.pointInDirection,
            motion_pointtowards: this.pointTowards,
            motion_glidesecstoxy: this.glide,
            motion_glideto: this.glideTo,
            motion_ifonedgebounce: this.ifOnEdgeBounce,
            motion_setrotationstyle: this.setRotationStyle,
            motion_changexby: this.changeX,
            motion_setx: this.setX,
            motion_changeyby: this.changeY,
            motion_sety: this.setY,
            motion_xposition: this.getX,
            motion_yposition: this.getY,
            motion_direction: this.getDirection,
            motion_motorBall_rotate_on_power_for_seconds: this.setMotorBallPower,
            motion_motorBall_rotate_on_power: this.setMotorBallPower1,
            motion_motorBall_rotate_on_speed_for_seconds: this.setMabotMotorBallSpeed,
            motion_motorBall_rotate_on_speed: this.setMabotMotorBallSpeed1,
            motion_motorBall_stop: this.mabotMotorBallStop,
            motion_motorBall_reset: this.mabotMotorBallReset,

            motion_motorBall_get_angle: this.getMabotMotorBallAngle,
            motion_motorBall_get_speed: this.getMabotMotorBallSpeed,

            motion_horizontalJoint_set_angle: this.setMabotHorizontalJoint,
            motion_swingJoint_set_angle: this.setMabotSwingJoint,

            motion_horizontalJoint_get_angle: this.getMabotHorizontalJoint,
            motion_swingJoint_get_angle: this.getMabotSwingJoint,
            // Legacy no-op blocks:
            motion_scroll_right: () => {
            },
            motion_scroll_up: () => {
            },
            motion_align_scene: () => {
            },
            motion_xscroll: () => {
            },
            motion_yscroll: () => {
            }
        };
    }

    setMotorBallPower(args) {

        const mabot_motor_ball_index = Cast.toNumber(args.mabot_motor_ball_index);
        const rotate_direction = Cast.toString(args.rotate_direction);
        const uiPower = Cast.toNumber(args.power);
        const rotate_for_seconds = Cast.toNumber(args.rotate_for_seconds);
        const block = args.BLOCK.indexOf('onebyone.png') > -1 ? true : false; // 是否同步执行
        const mutation = args.mutation ? (args.mutation.children || []) : []; // 选择多个驱动球时

        // 功率0-100 要转换成35-100， 因为功率太小驱动球不转
        const mapPower = (power) => {
            power = Cast.toNumber(power);
            return Math.floor(power * 0.65) + 35;
        }

        const power = mapPower(uiPower);

        const mutationList = mutation.map(item => {
            return {
                mabot_motor_ball_index: Cast.toNumber(item.seq),
                rotate_direction: Cast.toString(item.rotate_direction),
                power: mapPower(item.power),
                rotate_for_seconds: Cast.toNumber(item.rotate_for_seconds)
            }
        });

        const mainBallObj = {
            mabot_motor_ball_index,
            rotate_direction,
            power,
            rotate_for_seconds
        }
        const mabot_ball_list = [mainBallObj, ...mutationList];

        // console.log(`args`, args)
        // console.log(`BLOCK`, block)
        // console.log(`mabot_ball_list`, mabot_ball_list);

        let maxTime = 0;

        mabot_ball_list.forEach(item => {

            if(item.rotate_for_seconds > maxTime) {
                maxTime = item.rotate_for_seconds;
            }
            let event = new CustomEvent('mabot', {
                detail: {
                    type: 'motion_motorBall_rotate_on_power_for_seconds',
                    params: {
                        mabot_motor_ball_index: item.mabot_motor_ball_index,
                        rotate_direction: item.rotate_direction,
                        power: (item.power * 0.8),
                        rotate_for_seconds: item.rotate_for_seconds,
                    }
                }
            });
            document.dispatchEvent(event);
        })

        console.log(`maxTime`, maxTime)

        // 是否阻塞
        if(block){
            return this.wait(maxTime);
        }
        //return mabotSensorStatesManager.motorBall[mabot_motor_ball_index];
    }

    setMotorBallPower1(args) {
        const mabot_motor_ball_index = Cast.toNumber(args.mabot_motor_ball_index);
        const rotate_direction = Cast.toString(args.rotate_direction);
        const uiPower = Cast.toNumber(args.power);
        const mutation = args.mutation ? (args.mutation.children || []) : []; // 选择多个驱动球时

        // 功率0-100 要转换成35-100， 因为功率太小驱动球不转
        const mapPower = (power) => {
            power = Cast.toNumber(power);
            return Math.floor(power * 0.65) + 35; 
        }

        const power = mapPower(uiPower);

        const mutationList = mutation.map(item => {
            return {
                mabot_motor_ball_index: Cast.toNumber(item.seq),
                rotate_direction: Cast.toString(item.rotate_direction),
                power: mapPower(item.power)
            }
        });

        const mainBallObj = {
            mabot_motor_ball_index,
            rotate_direction,
            power
        }
        const mabot_ball_list = [mainBallObj, ...mutationList]; 


        let maxTime = 0;

        mabot_ball_list.forEach(item => {
            if(item.rotate_for_seconds > maxTime) {
                maxTime = item.rotate_for_seconds;
            }
            let event = new CustomEvent('mabot', {
                detail: {
                    type: 'motion_motorBall_rotate_on_power',
                    params: {
                        mabot_motor_ball_index: item.mabot_motor_ball_index, 
                        rotate_direction: item.rotate_direction,
                        power: (item.power * 0.8)
                    }
                }
            });
            document.dispatchEvent(event);
        })

    }

    setMabotMotorBallSpeed(args) {
        const mabot_motor_ball_index = Cast.toNumber(args.mabot_motor_ball_index);
        const rotate_direction = Cast.toString(args.rotate_direction);
        const speed = Cast.toNumber(args.speed);
        const rotate_for_seconds = Cast.toNumber(args.rotate_for_seconds);
        const block = args.BLOCK.indexOf('onebyone.png') > -1 ? true : false; // 是否同步执行
        const mutation = args.mutation ? (args.mutation.children || []) : []; // 选择多个驱动球时


        const mutationList = mutation.map(item => {
            return {
                mabot_motor_ball_index: Cast.toNumber(item.seq),
                rotate_direction: Cast.toString(item.rotate_direction),
                speed: Cast.toNumber(item.speed),
                rotate_for_seconds: Cast.toNumber(item.rotate_for_seconds)
            }
        });

        const mainBallObj = {
            mabot_motor_ball_index,
            rotate_direction,
            speed,
            rotate_for_seconds
        }

        const mabot_ball_list = [mainBallObj, ...mutationList];

        let maxTime = 0;

        mabot_ball_list.forEach(item => {
            // console.log(item.rotate_for_seconds, maxTime, item.rotate_for_seconds > maxTime)
            if(item.rotate_for_seconds > maxTime) {
                maxTime = item.rotate_for_seconds;
            }
            let event = new CustomEvent('mabot', {
                detail: {
                    type: 'motion_motorBall_rotate_on_speed_for_seconds',
                    params: {
                        mabot_motor_ball_index: item.mabot_motor_ball_index,
                        rotate_direction: item.rotate_direction,
                        speed: item.speed,
                        rotate_for_seconds: item.rotate_for_seconds,
                    }
                }
            });
            document.dispatchEvent(event);
        })

        console.log(`maxTime`, maxTime)

        // 是否阻塞
        if(block){
            return this.wait(maxTime);
        }

    }

    setMabotMotorBallSpeed1(args) {
        const mabot_motor_ball_index = Cast.toNumber(args.mabot_motor_ball_index);
        const rotate_direction = Cast.toString(args.rotate_direction);
        const speed = Cast.toNumber(args.speed);
        const mutation = args.mutation ? (args.mutation.children || []) : []; // 选择多个驱动球时

        const mutationList = mutation.map(item => {
            return {
                mabot_motor_ball_index: Cast.toNumber(item.seq),
                rotate_direction: Cast.toString(item.rotate_direction),
                speed: Cast.toNumber(item.speed)
            }
        });

        const mainBallObj = {
            mabot_motor_ball_index,
            rotate_direction,
            speed
        }
        const mabot_ball_list = [mainBallObj, ...mutationList];


        let maxTime = 0;
        // console.log(`mabot_ball_list`, mabot_ball_list)
        mabot_ball_list.forEach(item => {
            if(item.rotate_for_seconds > maxTime) {
                maxTime = item.rotate_for_seconds;
            }
            let event = new CustomEvent('mabot', {
                detail: {
                    type: 'motion_motorBall_rotate_on_speed',
                    params: {
                        mabot_motor_ball_index: item.mabot_motor_ball_index,
                        rotate_direction: item.rotate_direction,
                        speed: item.speed
                    }
                }
            });
            document.dispatchEvent(event);
        });

    }

    mabotMotorBallStop(args) {
        // const mabot_motor_ball_index = Cast.toNumber(args.mabot_motor_ball_index);
        const mabot_motor_ball_index = args.mabot_motor_ball_index.replace(/\s/g, ""); // 去掉空格
        const immediateOrNot = Cast.toString(args.immediatelyOrNot);
        (mabot_motor_ball_index.split(',') || []).map(value => {
            const event = new CustomEvent('mabot', {
                detail: {
                    type: 'motion_motorBall_stop',
                    params: {
                        mabot_motor_ball_index: Cast.toNumber(value),
                        immediateOrNot
                    }
                }
            });
            document.dispatchEvent(event);
        });
    }

    mabotMotorBallReset(args) {
        const indexList = args.mabot_motor_ball_index.replace(/\s/g, "");
        // const mabot_motor_ball_index = Cast.toNumber(args.mabot_motor_ball_index);
        (indexList.split(',') || []).forEach(value => {
            const index = Cast.toNumber(value);
            const event = new CustomEvent('mabot', {
                detail: {
                    type: 'motion_motorBall_reset',
                    params: {
                        mabot_motor_ball_index: index,
                    }
                }
            });
            document.dispatchEvent(event);
        });

    }


    getMabotMotorBallAngle(args) {
        const mabot_motor_ball_index = Cast.toNumber(args.mabot_motor_ball_index);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'motion_motorBall_get_angle',
                params: {
                    mabot_motor_ball_index,
                }
            }
        });
        document.dispatchEvent(event);

        return new Promise((resolve) => {
            let timeout = null;
            let init = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    if (mabotSensorStatesManager.motorBallIndex === mabot_motor_ball_index){
                        // resolve(mabotSensorStatesManager.motorBallPos[3] * Math.pow(256, 3) + mabotSensorStatesManager.motorBallPos[2] * Math.pow(256, 2) +
                        //     mabotSensorStatesManager.motorBallPos[1] * 256 + mabotSensorStatesManager.motorBallPos[0]);
                        let result = (mabotSensorStatesManager.motorBallPos / 1600 * 360).toFixed(2);
                        console.log(mabotSensorStatesManager.motorBallPos ," parse to ", result);
                        resolve(result);
                        //验证resolve 是否会影响后面程序的执行。
                        mabotSensorStatesManager.statusChanged = false;
                        clearTimeout(timeout);
                        clearInterval(init);
                    }
                }
            }, 20);
            timeout = setTimeout(() => {
                clearInterval(init);
                resolve();
            }, this.timeout);
        });
    }

    getMabotMotorBallSpeed(args) {
        const mabot_motor_ball_index = Cast.toNumber(args.mabot_motor_ball_index);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'motion_motorBall_get_speed',
                params: {
                    mabot_motor_ball_index,
                }
            }
        });
        document.dispatchEvent(event);

        return new Promise((resolve) => {
            let timeout = null;
            let init = setInterval(function () {
                if (mabotSensorStatesManager.statusChanged) {
                    if (mabotSensorStatesManager.motorBallIndex === mabot_motor_ball_index){
                        resolve(mabotSensorStatesManager.motorBallSpeed);
                        mabotSensorStatesManager.statusChanged = false;
                        clearTimeout(timeout);
                        clearInterval(init);
                    }
                }
            }, 20);
            timeout = setTimeout(() => {
                clearInterval(init);
                resolve();
            }, this.timeout);
        });
    }

    setMabotHorizontalJoint(args) {
        const mabot_horizontalJoint_index = Cast.toNumber(args.mabot_horizontalJoint_index);
        const block = args.BLOCK.indexOf(`onebyone.png`) > -1;
        const mabot_horizontalJoint_angle = Cast.toString(+args.mabot_horizontalJoint_angle + 90);
        const mutation = args.mutation ? (args.mutation.children || []) : []; // 选择多个驱动球时
        console.log(`args`, args)

        const mutationList = mutation.map(item => {
            return {
                mabot_horizontalJoint_index: Cast.toNumber(item.seq),
                mabot_horizontalJoint_angle: Cast.toString(+item.mabot_horizontaljoint_angle+90)
            }
        });

        const mainBallObj = {
            mabot_horizontalJoint_index,
            mabot_horizontalJoint_angle
        }
        const mabot_ball_list = [mainBallObj, ...mutationList];

        mabot_ball_list.forEach(item => {
            let event = new CustomEvent('mabot', {
                detail: {
                    type: 'motion_horizontalJoint_set_angle',
                    params: {
                        mabot_horizontalJoint_index: item.mabot_horizontalJoint_index,
                        mabot_horizontalJoint_angle: item.mabot_horizontalJoint_angle
                    }
                }
            });
            document.dispatchEvent(event);
        });

        // 是否阻塞
        if(block){
            const promiseList = mabot_ball_list.map(item => {
                const mabot_horizontalJoint_index = item.mabot_horizontalJoint_index;
                const changeAngle = item.mabot_horizontalJoint_angle - 90; // 角度转换

                const p = new Promise((resolve) => {
                    let timer = null;

                    let interval = setInterval(() => {
                        // 获取角度
                        /* this.getMabotHorizontalJoint({mabot_horizontalJoint_index}).then(angle => {
                            // console.log(`changeAngle`,changeAngle, `angle`, angle)
                            if(angle >= changeAngle - 5 && angle <= changeAngle + 5) {
                                // 在误差范围内则判定动作完成
                                console.log(`HorizontalJoint在误差范围内则判定动作完成`)
                                clearInterval(interval);
                                clearTimeout(timer);
                                resolve();
                            }
                        }); */
                        this.getAllMabotHorizontalJoint().then(angleArr => {
                            console.log(`angleArr`, angleArr)
                            const angle = angleArr[mabot_horizontalJoint_index - 1];
                            if(angle >= changeAngle - 10 && angle <= changeAngle + 10) {
                                // 在误差范围内则判定动作完成
                                console.log(`HorizontalJoint在误差范围内则判定动作完成`)
                                clearInterval(interval);
                                clearTimeout(timer);
                                resolve();
                            }
                        });
    
                    }, 200);

                    timer = setTimeout(() => {
                        // 超时也判定动作完成
                        console.log(`HorizontalJoint超时也判定动作完成`)
                        clearInterval(interval);
                        resolve();
                    }, TIME_OUT);
                });

                return p;
            });
            return Promise.all(promiseList);
        }

    }

    setMabotSwingJoint(args) {
        const mabot_swingJoint_index = Cast.toNumber(args.mabot_swingJoint_index);
        const block = args.BLOCK.indexOf(`onebyone.png`) > -1;
        const mabot_swingJoint_angle = Cast.toString(+args.mabot_swingJoint_angle + 90);
        const mutation = args.mutation ? (args.mutation.children || []) : []; // 选择多个驱动球时
        console.log(`mabot_swingJoint_angle`, mabot_swingJoint_angle)

        const mutationList = mutation.map(item => {
            return {
                mabot_swingJoint_index: Cast.toNumber(item.seq),
                mabot_swingJoint_angle: Cast.toString(+item.mabot_swingjoint_angle+90)
            }
        });

        const mainBallObj = {
            mabot_swingJoint_index,
            mabot_swingJoint_angle
        }
        const mabot_ball_list = [mainBallObj, ...mutationList];

        mabot_ball_list.forEach(item => {
            let event = new CustomEvent('mabot', {
                detail: {
                    type: 'motion_swingJoint_set_angle',
                    params: {
                        mabot_swingJoint_index: item.mabot_swingJoint_index,
                        mabot_swingJoint_angle: item.mabot_swingJoint_angle
                    }
                }
            });
            document.dispatchEvent(event);
        });

        // 是否阻塞
        if(block){
            const promiseList = mabot_ball_list.map(item => {
                const mabot_swingJoint_index = item.mabot_swingJoint_index;
                const changeAngle = item.mabot_swingJoint_angle - 90;

                const p = new Promise((resolve) => {
                    let timer = null;

                    let interval = setInterval(() => {
                        // 获取角度
                       /*  this.getMabotSwingJoint({mabot_swingJoint_index}).then(angle => {
                            if(angle >= changeAngle - 5 && angle <= changeAngle + 5) {
                                // 在误差范围内则判定动作完成
                                console.log(`SwingJoint在误差范围内则判定动作完成`)
                                clearInterval(interval);
                                clearTimeout(timer);
                                resolve();
                            }
                        }); */
                        this.getAllMabotSwingJoint().then(angleArr => {
                            console.log(`angleArr`, angleArr)
                            const angle = angleArr[mabot_swingJoint_index - 1];
                            if(angle >= changeAngle - 10 && angle <= changeAngle + 10) {
                                // 在误差范围内则判定动作完成
                                console.log(`SwingJoint在误差范围内则判定动作完成`)
                                clearInterval(interval);
                                clearTimeout(timer);
                                resolve();
                            }
                        });

                    }, 200);

                    timer = setTimeout(() => {
                        // 超时也判定动作完成
                        console.log(`SwingJoint超时也判定动作完成`)
                        clearInterval(interval);
                        resolve();
                    }, TIME_OUT);
                });

                return p;
            });
            return Promise.all(promiseList);
        }

    }


    getMabotHorizontalJoint(args) {
        const mabot_horizontalJoint_index = Cast.toNumber(args.mabot_horizontalJoint_index);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'motion_horizontalJoint_get_angle',
                params: {
                    mabot_horizontalJoint_index,
                }
            }
        });
        document.dispatchEvent(event);
        return new Promise(function (resolve) {
            let timeout = null;
            let init = setInterval(function () {
                const getHorizontalJointAngle = mabotSensorStatesManager.getHorizontalJointAngle
                if (getHorizontalJointAngle.statusChanged) {
                    const angle = getHorizontalJointAngle.horizontalJointAngle - 90;
                    resolve(angle);
                    getHorizontalJointAngle.statusChanged = false;
                    clearTimeout(timeout);
                    clearInterval(init);
                }
            }, ANGLE_LOOP_TIME);
            timeout = setTimeout(() => {
                clearInterval(init);
            }, 1000)
        });
    }

    getMabotSwingJoint(args) {
        const mabot_swingJoint_index = Cast.toNumber(args.mabot_swingJoint_index);
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'motion_swingJoint_get_angle',
                params: {
                    mabot_swingJoint_index,
                }
            }
        });
        document.dispatchEvent(event);
        return new Promise(function (resolve) {
            let timeout = null;
            let init = setInterval(function () {
                const getSwingJointAngle = mabotSensorStatesManager.getSwingJointAngle;
                console.log(`getSwingJointAngle`, getSwingJointAngle)
                if (getSwingJointAngle.statusChanged) {
                    const angle = getSwingJointAngle.swingJointAngle - 90;
                    resolve(angle);
                    getSwingJointAngle.statusChanged = false;
                    clearTimeout(timeout);
                    clearInterval(init);
                }
            }, ANGLE_LOOP_TIME);
            timeout = setTimeout(() => {
                clearInterval(init);
            }, ANGLE_LOOP_TIMEOUT);
        });
    }

    // 获取全部摇摆球角度
    getAllMabotSwingJoint() {
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'motion_swingJoint_get_all_angle',
                params: {
                }
            }
        });
        document.dispatchEvent(event);
        return new Promise(function (resolve) {
            let timeout = null;
            let init = setInterval(function () {
                const getAllSwingJointAngle = mabotSensorStatesManager.getAllSwingJointAngle;
                console.log(`getAllSwingJointAngle`, getAllSwingJointAngle)
                if (getAllSwingJointAngle.statusChanged) {
                    const angleArr = (getAllSwingJointAngle.angles || []).map(item => (item - 90)); // 转换
                    console.log(`angleArr`, angleArr)
                    resolve(angleArr);
                    getAllSwingJointAngle.statusChanged = false;
                    clearTimeout(timeout);
                    clearInterval(init);
                }
            }, ANGLE_LOOP_TIME);
            timeout = setTimeout(() => {
                clearInterval(init);
            }, ANGLE_LOOP_TIMEOUT);
        });
    }

    // 获取全部水平关节球角度
    getAllMabotHorizontalJoint() {
        const event = new CustomEvent('mabot', {
            detail: {
                type: 'motion_horizontalJoint_get_all_angle',
                params: {
                }
            }
        });
        document.dispatchEvent(event);
        return new Promise(function (resolve) {
            let timeout = null;
            let init = setInterval(function () {
                const getAllHorizontalJointAngle = mabotSensorStatesManager.getAllHorizontalJointAngle;
               
                if (getAllHorizontalJointAngle.statusChanged) {
                    const angleArr = (getAllHorizontalJointAngle.angles || []).map(item => (item - 90)); // 转换
                    console.log(`Horizontal_angleArr`, angleArr)
                    resolve(angleArr);
                    getAllHorizontalJointAngle.statusChanged = false;
                    clearTimeout(timeout);
                    clearInterval(init);
                }
            }, ANGLE_LOOP_TIME);
            timeout = setTimeout(() => {
                clearInterval(init);
            }, ANGLE_LOOP_TIMEOUT);
        });
    }



    getMonitored() {
        return {
            motion_xposition: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_xposition`
            },
            motion_yposition: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_yposition`
            },
            motion_direction: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_direction`
            }
        };
    }

    moveSteps(args, util) {
        const steps = Cast.toNumber(args.STEPS);
        const radians = MathUtil.degToRad(90 - util.target.direction);
        const dx = steps * Math.cos(radians);
        const dy = steps * Math.sin(radians);
        util.target.setXY(util.target.x + dx, util.target.y + dy);
    }

    goToXY(args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        util.target.setXY(x, y);
    }

    getTargetXY(targetName, util) {
        let targetX = 0;
        let targetY = 0;
        if (targetName === '_mouse_') {
            targetX = util.ioQuery('mouse', 'getScratchX');
            targetY = util.ioQuery('mouse', 'getScratchY');
        } else if (targetName === '_random_') {
            const stageWidth = this.runtime.constructor.STAGE_WIDTH;
            const stageHeight = this.runtime.constructor.STAGE_HEIGHT;
            targetX = Math.round(stageWidth * (Math.random() - 0.5));
            targetY = Math.round(stageHeight * (Math.random() - 0.5));
        } else {
            targetName = Cast.toString(targetName);
            const goToTarget = this.runtime.getSpriteTargetByName(targetName);
            if (!goToTarget) return;
            targetX = goToTarget.x;
            targetY = goToTarget.y;
        }
        return [targetX, targetY];
    }

    goTo(args, util) {
        const targetXY = this.getTargetXY(args.TO, util);
        if (targetXY) {
            util.target.setXY(targetXY[0], targetXY[1]);
        }
    }

    turnRight(args, util) {
        const degrees = Cast.toNumber(args.DEGREES);
        util.target.setDirection(util.target.direction + degrees);
    }

    turnLeft(args, util) {
        const degrees = Cast.toNumber(args.DEGREES);
        util.target.setDirection(util.target.direction - degrees);
    }

    pointInDirection(args, util) {
        const direction = Cast.toNumber(args.DIRECTION);
        util.target.setDirection(direction);
    }

    pointTowards(args, util) {
        let targetX = 0;
        let targetY = 0;
        if (args.TOWARDS === '_mouse_') {
            targetX = util.ioQuery('mouse', 'getScratchX');
            targetY = util.ioQuery('mouse', 'getScratchY');
        } else if (args.TOWARDS === '_random_') {
            util.target.setDirection(Math.round(Math.random() * 360) - 180);
            return;
        } else {
            args.TOWARDS = Cast.toString(args.TOWARDS);
            const pointTarget = this.runtime.getSpriteTargetByName(args.TOWARDS);
            if (!pointTarget) return;
            targetX = pointTarget.x;
            targetY = pointTarget.y;
        }

        const dx = targetX - util.target.x;
        const dy = targetY - util.target.y;
        const direction = 90 - MathUtil.radToDeg(Math.atan2(dy, dx));
        util.target.setDirection(direction);
    }

    glide(args, util) {
        if (util.stackFrame.timer) {
            const timeElapsed = util.stackFrame.timer.timeElapsed();
            if (timeElapsed < util.stackFrame.duration * 1000) {
                // In progress: move to intermediate position.
                const frac = timeElapsed / (util.stackFrame.duration * 1000);
                const dx = frac * (util.stackFrame.endX - util.stackFrame.startX);
                const dy = frac * (util.stackFrame.endY - util.stackFrame.startY);
                util.target.setXY(
                    util.stackFrame.startX + dx,
                    util.stackFrame.startY + dy
                );
                util.yield();
            } else {
                // Finished: move to final position.
                util.target.setXY(util.stackFrame.endX, util.stackFrame.endY);
            }
        } else {
            // First time: save data for future use.
            util.stackFrame.timer = new Timer();
            util.stackFrame.timer.start();
            util.stackFrame.duration = Cast.toNumber(args.SECS);
            util.stackFrame.startX = util.target.x;
            util.stackFrame.startY = util.target.y;
            util.stackFrame.endX = Cast.toNumber(args.X);
            util.stackFrame.endY = Cast.toNumber(args.Y);
            if (util.stackFrame.duration <= 0) {
                // Duration too short to glide.
                util.target.setXY(util.stackFrame.endX, util.stackFrame.endY);
                return;
            }
            util.yield();
        }
    }

    glideTo(args, util) {
        const targetXY = this.getTargetXY(args.TO, util);
        if (targetXY) {
            this.glide({SECS: args.SECS, X: targetXY[0], Y: targetXY[1]}, util);
        }
    }

    ifOnEdgeBounce(args, util) {
        const bounds = util.target.getBounds();
        if (!bounds) {
            return;
        }
        // Measure distance to edges.
        // Values are positive when the sprite is far away,
        // and clamped to zero when the sprite is beyond.
        const stageWidth = this.runtime.constructor.STAGE_WIDTH;
        const stageHeight = this.runtime.constructor.STAGE_HEIGHT;
        const distLeft = Math.max(0, (stageWidth / 2) + bounds.left);
        const distTop = Math.max(0, (stageHeight / 2) - bounds.top);
        const distRight = Math.max(0, (stageWidth / 2) - bounds.right);
        const distBottom = Math.max(0, (stageHeight / 2) + bounds.bottom);
        // Find the nearest edge.
        let nearestEdge = '';
        let minDist = Infinity;
        if (distLeft < minDist) {
            minDist = distLeft;
            nearestEdge = 'left';
        }
        if (distTop < minDist) {
            minDist = distTop;
            nearestEdge = 'top';
        }
        if (distRight < minDist) {
            minDist = distRight;
            nearestEdge = 'right';
        }
        if (distBottom < minDist) {
            minDist = distBottom;
            nearestEdge = 'bottom';
        }
        if (minDist > 0) {
            return; // Not touching any edge.
        }
        // Point away from the nearest edge.
        const radians = MathUtil.degToRad(90 - util.target.direction);
        let dx = Math.cos(radians);
        let dy = -Math.sin(radians);
        if (nearestEdge === 'left') {
            dx = Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'top') {
            dy = Math.max(0.2, Math.abs(dy));
        } else if (nearestEdge === 'right') {
            dx = 0 - Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'bottom') {
            dy = 0 - Math.max(0.2, Math.abs(dy));
        }
        const newDirection = MathUtil.radToDeg(Math.atan2(dy, dx)) + 90;
        util.target.setDirection(newDirection);
        // Keep within the stage.
        const fencedPosition = util.target.keepInFence(util.target.x, util.target.y);
        util.target.setXY(fencedPosition[0], fencedPosition[1]);
    }

    setRotationStyle(args, util) {
        util.target.setRotationStyle(args.STYLE);
    }

    changeX(args, util) {
        const dx = Cast.toNumber(args.DX);
        util.target.setXY(util.target.x + dx, util.target.y);
    }

    setX(args, util) {
        const x = Cast.toNumber(args.X);
        util.target.setXY(x, util.target.y);
    }

    changeY(args, util) {
        const dy = Cast.toNumber(args.DY);
        util.target.setXY(util.target.x, util.target.y + dy);
    }

    setY(args, util) {
        const y = Cast.toNumber(args.Y);
        util.target.setXY(util.target.x, y);
    }

    getX(args, util) {
        return this.limitPrecision(util.target.x);
    }

    getY(args, util) {
        return this.limitPrecision(util.target.y);
    }

    getDirection(args, util) {
        return util.target.direction;
    }

    // This corresponds to snapToInteger in Scratch 2
    limitPrecision(coordinate) {
        const rounded = Math.round(coordinate);
        const delta = coordinate - rounded;
        const limitedCoord = (Math.abs(delta) < 1e-9) ? rounded : coordinate;

        return limitedCoord;
    }

    wait(sec) {
        const duration = Math.max(0, 1000 * Cast.toNumber(sec));
        return new Promise(resolve => {
            setTimeout(() => {
            resolve();
            }, duration);
        });
    }
}

module.exports = Scratch3MotionBlocks;
