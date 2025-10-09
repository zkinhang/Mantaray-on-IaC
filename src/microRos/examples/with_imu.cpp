// Basic depencies
#include <Arduino.h>
#include <ESP32Servo.h>
#include <micro_ros_platformio.h>

// Add on depencies
// libraries for motion sensor and computing quaternions and angles
#include <Wire.h>
#include <MPU6050.h>
#include "MadgwickAHRS.h"

// These are core ROS2 libraries for creating nodes, publishers, and executors
#include <rcl/rcl.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>

// Standard ROS2 message type, float 32 array(subscriber) and string(publisher)
#include <std_msgs/msg/string.h>
#include <std_msgs/msg/float32_multi_array.h>

// Ensure that the transport layer being used is Arduino Serial.
// If it's not, compilation is stopped and error is printed.
#if !defined(MICRO_ROS_TRANSPORT_ARDUINO_SERIAL)
#error This example is only available for Arduino framework with serial transport.
#endif

// Define ROS2 objects for subscription and publisher with its message, an executor, support objects, an allocator, a node
rcl_publisher_t publisher;
std_msgs__msg__String success_msg;
rcl_publisher_t publisher_imu;
std_msgs__msg__Float32MultiArray imu_msg;

rcl_subscription_t subscriber;
std_msgs__msg__Float32MultiArray pwm;


rclc_executor_t executor;
rclc_support_t support;
rcl_allocator_t allocator;
rcl_node_t node;
rcl_timer_t timer;

// Initalization for the variables
// Define the format of receiving message
// float pwm_array[6] = {0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f};
float pwm_array[8] = {0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f};
float imu_data[3] = {0.0f, 0.0f, 0.0f};
// Define valuables and objects for thruster control
// determine some gereral constants for servo PWM standards
// choose which configure to use: 6 or 8 thrusters
int thruster_size = 8;
// int thruster_pin_no[6] = {12, 14, 27, 26, 25, 33};
int thruster_pin_no[8] = {14,15,21,20,16,17,19,18};
// Servo thruster[6];
Servo thruster[8];
const int servoMiddleUs = 1500;
int thrusterTrim = 0;

// for gyro range to +/- 2000 degree per second, the scaling factor is 16.4LSB / degree/ second
// which is converted to radian unit for quaternion computation
const float mpu6050gyroScaleFactor = 1 / 16.4 / 180.0 * 3.14159;
// acc default range: 16384 LSB/g where g = 9.81ms^-2
const float mpu6050accScaleFactor = 1.0 / 16384; // =1/16,384

// create MPU6050 objects
MPU6050 mpu;


// following parts to be used in future
// pwm signal pin for thruster
// thrusterNWUPin    = 2    // North West Up
// thrusterNWDPin    = 3   //  North West Down
// thrusterNEUPin    = 4    // North East Up
// thrusterNEDPin    = 5   //  North East Down
// thrusterSWUPin    = 6    // South West Up
// thrusterSWDPin    = 7   //  South West Down
// thrusterSEUPin    = 8    // South East Up
// thrusterSEDPin    = 9   //  South East Down

// // // trim values of the servo pwm signals
// thrusterNWUTrim = -15 // -> North West Up
// thrusterNWDTrim = -15 //  -> North West Down
// thrusterNEUTrim = -15 // -> North East Up
// thrusterNEDTrim = -15 //  -> North East Down
// thrusterSWUTrim = -15 // -> South West Up
// thrusterSWDTrim = -15 //  -> South West Down
// thrusterSEUTrim = -15 // -> South East Up
// thrusterSEDTrim = -15 //  -> South East Down

// const int servoTailLdir = 1;        // direction mapping for tail servo motor
// const int servoTailRdir = -1;

// Macros for checking return of ROS2 functions and entering an infinite error loop in case of error
#define RCCHECK(fn) { rcl_ret_t temp_rc = fn; if((temp_rc != RCL_RET_OK)){error_loop();}}
#define RCSOFTCHECK(fn) { rcl_ret_t temp_rc = fn; if((temp_rc != RCL_RET_OK)){}}

// Infinite error loop function. If something fails, the device will get stuck here
void error_loop() {
    while(1) {
        delay(100);
    }
}

void subscription_callback(const void * msgin)
{
	const std_msgs__msg__Float32MultiArray * msg = (const std_msgs__msg__Float32MultiArray *)msgin;
    if (msg->data.size != thruster_size) {
        // Handle the error case where the sizes do not match
        sprintf(success_msg.data.data, "Error: PWM array size does not match thruster size.");
        success_msg.data.size = strlen(success_msg.data.data);
        rcl_publish(&publisher, &success_msg, NULL);
        return;
    }
    // Create an array to record the values written to the thrusters
    float recorded_values[thruster_size];
    // Write the PWM values to the thrusters and record them
    for (int i = 0; i < thruster_size; ++i) {
        thruster[i].writeMicroseconds(msg->data.data[i]);
        recorded_values[i] = msg->data.data[i];
    }
    // Construct the success message string
	sprintf(success_msg.data.data, "thruster write pwm success: %f, %f, %f, %f, %f, %f", recorded_values[0], recorded_values[1], recorded_values[2], recorded_values[3], recorded_values[4], recorded_values[5]);
    success_msg.data.size = strlen(success_msg.data.data);
    rcl_publish(&publisher, &success_msg, NULL);
    return;
}

// access IMU data and compute it, use timer to update data
void timer_callback(rcl_timer_t * timer, int64_t last_call_time)
{
    RCLC_UNUSED(last_call_time);
    if (timer != NULL) {
        // update IMU raw measurements
        int16_t ax, ay, az; // Accelerometer readings
        int16_t gx, gy, gz; // Gyroscope readings
        mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz); // Read sensor data
        // convert IMU raw value to calibrated values in standard units
        float gyroX = gx * mpu6050gyroScaleFactor;
        float gyroY = gy * mpu6050gyroScaleFactor;
        float gyroZ = gz * mpu6050gyroScaleFactor;
        float accX = ax * mpu6050accScaleFactor;
        float accY = ay * mpu6050accScaleFactor;
        float accZ = az * mpu6050accScaleFactor;
        // compute quaternion and updated q(0,1,2,3) vectors
        MadgwickAHRSupdateIMU(gyroX, gyroY, gyroZ, accX, accY, accZ);
        // compute yaw, pitch, roll angles
        quaternionToEuler(q0, q1, q2, q3);
        // Construct a Float32MultiArray message to hold yaw, pitch, and roll
        imu_data[0] = yaw;
        imu_data[1] = pitch;
        imu_data[2] = roll;

        imu_msg.data.data = imu_data;

        // Publish the IMU data
        rcl_publish(&publisher_imu, &imu_msg, NULL);
    }
}

void setup() {
    // Start serial communication with a baud rate of 115200
    Serial.begin(115200);
    // initialize IMU
    Wire.begin();         // initialize I2C bus
    mpu.initialize();
    // Uncomment the following line to calibrate the MPU6050
    mpu.CalibrateAccel();
    mpu.CalibrateGyro();
    mpu.setDLPFMode(3);           // Set digital low pass filter to eliminate noise
    mpu.setFullScaleGyroRange(3); // Set gyro range to +/- 2000 degrees per second

    // initalize thrusters by writing the middle value
    for (int i = 0; i < thruster_size; i++){
        thruster[i].attach(thruster_pin_no[i]);
    }
    for (int i = 0; i < thruster_size; i++){
        thruster[i].writeMicroseconds(servoMiddleUs + thrusterTrim);
    }
    // Configure Micro-ROS library to use Arduino serial
    set_microros_serial_transports(Serial);
    // Allow some time for everything to start properly
    delay(2000);

    // Get the default memory allocator provided by rcl
    allocator = rcl_get_default_allocator();

    // Initialize rclc_support with default allocator
    RCCHECK(rclc_support_init(&support, 0, NULL, &allocator));

    // Initialize a ROS node with the name "micro_ros_platformio_node"
    RCCHECK(rclc_node_init_default(&node, "second_esp32_node", "", &support));

    // Initialize a ROS publisher with the name "micro_ros_platformio_node_publisher" to publish Int32 messages
    RCCHECK(rclc_publisher_init_default(
        &publisher,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, String),
        "/microros/written_pwm2"));
    RCCHECK(rclc_publisher_init_default(
        &publisher_imu,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Float32MultiArray),
        "/microros/angles"));

    // create subscriber
    RCCHECK(rclc_subscription_init_default(
      &subscriber,
      &node,
      ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Float32MultiArray),
      "/receiver/input"));


    // Initialize a timer with a period of 1 second which calls the function timer_callback() every time it expires
    const unsigned int timer_timeout = 10;
    RCCHECK(rclc_timer_init_default(
        &timer,
        &support,
        RCL_MS_TO_NS(timer_timeout),
        timer_callback));

    // Initialize an executor that will manage the execution of all the ROS entities (publishers, subscribers, services, timers)
    executor = rclc_executor_get_zero_initialized_executor();
    RCCHECK(rclc_executor_init(&executor, &support.context, 2, &allocator));
    // Add our timer to the executor
    RCCHECK(rclc_executor_add_timer(&executor, &timer));
    RCCHECK(rclc_executor_add_subscription(&executor, &subscriber, &pwm, &subscription_callback, ON_NEW_DATA));


    // **Important** initalization for the every topics (no matter publisher ni subscriber)
    success_msg.data.data = (char * ) malloc(200 * sizeof(char));
    success_msg.data.size = 0;
    success_msg.data.capacity = 200;

    pwm.data.data = pwm_array;
    pwm.data.size = 6;
    pwm.data.capacity = sizeof(pwm_array);

    // Create a Float32MultiArray message to hold yaw, pitch, and roll
    imu_msg.data.data = imu_data;
    imu_msg.data.size = 3;
    imu_msg.data.capacity = sizeof(imu_data);
}

void loop() {
// Wait a little bit
    delay(100);
    // Execute pending tasks in the executor. This will handle all ROS communications.
    rclc_executor_spin(&executor);
    // clean up
    rcl_ret_t rc;
    rc = rclc_executor_fini(&executor);
    rc += rcl_publisher_fini(&publisher, &node);
    rc += rcl_subscription_fini(&subscriber, &node);
    rc += rcl_node_fini(&node);
    rc += rclc_support_fini(&support);
    if (rc != RCL_RET_OK) {
        printf("Error while cleaning up!\n");
    }
}