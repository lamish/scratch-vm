class MabotSensorStatesManager {
    constructor() {
        this.touchSensor = [];
        this.motorBallIndex = 0;
        this.motorBallSpeed = 0;
        this.motorBallPos = 0;
        this.horizontalJointAngle = 0;
        this.swingJointAngle = 0;

        this.touch_ball_index = 0;
        this.touch_ball_pressed = null;

        this.colorSensorIndex = 0;
        this.colorSensorMode = 0;
        this.colorData = [];

        this.IRSensorIndex = 0;
        this.distance = 0;

        this.gyro_x = 0;
        this.gyro_y = 0;
        this.gyro_z = 0;

        this.statusChanged = false;

        this.getHorizontalJointAngle = {};
        this.getSwingJointAngle = {};
        this.IRSensor = {};
        this.touchBallSensor = {};
        this.colorSensor = {};
        this.gyroSensor = {};
        this.getAllSwingJointAngle = {};
        this.getAllHorizontalJointAngle = {};
    }

    onSensorStateChanged(data) {
    
        this.touchSensor = data.touchSensor;
        this.motorBallIndex = data.motorBallIndex;
        this.motorBallSpeed = data.motorBallSpeed;
        this.motorBallPos = data.motorBallPos;
        this.horizontalJointAngle = data.horizontalJointAngle;
        this.swingJointAngle = data.swingJointAngle;

        this.touch_ball_index = data.touch_ball_index;
        this.touch_ball_pressed = data.touch_ball_pressed;

        this.colorSensorIndex = data.colorSensorIndex;
        this.colorSensorMode = data.colorSensorMode;
        this.colorData = data.colorData;

        this.IRSensorIndex = data.IRSensorIndex;
        this.distance = data.distance;

        this.gyro_x = data.gyro_x;
        this.gyro_y = data.gyro_y;
        this.gyro_z = data.gyro_z;

        this.statusChanged = true;
        
        if(data.horizontalJointAngle !== undefined) {
            this.getHorizontalJointAngle = data;
            this.getHorizontalJointAngle.statusChanged = true;
        }

        if(data.swingJointAngle !== undefined) {
            this.getSwingJointAngle = data;
            this.getSwingJointAngle.statusChanged = true;
        }

        if(data.touch_ball_index) {
            this.touchBallSensor[data.touch_ball_index] = data;
            this.touchBallSensor[data.touch_ball_index].statusChanged = true;
        }

        if(data.colorSensorIndex) {
            this.colorSensor[data.colorSensorIndex] = data;
            this.colorSensor[data.colorSensorIndex].statusChanged = true;
        }

        if(data.IRSensorIndex) {
            this.IRSensor[data.IRSensorIndex] = data;
            this.IRSensor[data.IRSensorIndex].statusChanged = true;
        }

        if(data.gyro_x) {
            this.gyroSensor = data;
            this.gyroSensor.statusChanged = true;
        }

        if(data.type == 32) {
            this.getAllSwingJointAngle = data;
            this.getAllSwingJointAngle.statusChanged = true;
        }

        if(data.type == 31) {
            this.getAllHorizontalJointAngle = data;
            this.getAllHorizontalJointAngle.statusChanged = true;
        }
       
    }
}

const mabotSensorStatesManager = new MabotSensorStatesManager();

module.exports = mabotSensorStatesManager;
