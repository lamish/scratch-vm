const Cast = require('../util/cast');

class Sensor {
    constructor (runtime) {
        this.type = "";
        //this._color = null;
        this.runtime = runtime;
    }
    postData (data) {
        if (!data.type) return;
        switch (data.type) {
            case "COLOR":
                //this._color = data;
                this.runtime.emit('SENSOR_COLOR', { colorIdx:data.colorIdx, color:data.color});
                break;
            case "TOUCH":
                this.runtime.emit('SENSOR_TOUCH', data.touch);
                break;
            case "IR":
                this.runtime.emit('SENSOR_IR', data.ir);
                break;
            case "GYRO":
                this.runtime.emit('SENSOR_GYRO', data.gyro);
                break;
        }
    }
}

module.exports = Sensor;
