class MabotSensorStatesManager {
    constructor () {
        this.touchSensor = [];
        this.motorBall = [];
    }

    onSensorStateChanged (data) {
        this.touchSensor = data.touchSensor;
        this.motorBall = data.motorBall;
    }
}

const mabotSensorStatesManager = new MabotSensorStatesManager();

module.exports = mabotSensorStatesManager;
