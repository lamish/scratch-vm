const Cast = require('../util/cast');

class Sensor {
    constructor (runtime) {
        this._color = null;
        this.runtime = runtime;
    }
    postData (data) {
        this._color = data;
        this.runtime.emit('SENSOR_RUN', data.color);
    }
}

module.exports = Sensor;