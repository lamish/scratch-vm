class MabotSensorStatesManager {
    constructor() {
        this.touchSensor = [];
    }

    onSensorStateChanged(data) {
        this.touchSensor = data.touchSensor
    }
}

const mabotSensorStatesManager = new MabotSensorStatesManager();

module.exports = mabotSensorStatesManager;
