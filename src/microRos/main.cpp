// Basic depencies
#include <Arduino.h>
#include <ESP32Servo.h>
#include <micro_ros_platformio.h>

// Add on depencies

// These are core ROS2 libraries for creating nodes, publishers, and executors
#include <rcl/rcl.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>

// Standard ROS2 message type, float 32 array(subscriber) and string(publisher)
#include <std_msgs/msg/string.h>
#include <std_msgs/msg/float32_multi_array.h>
// Removed: #include <std_msgs/msg/bool.h> as morse signal is now string

#include <Adafruit_NeoPixel.h>

// Ensure that the transport layer being used is Arduino Serial.
// If it's not, compilation is stopped and error is printed.
#if !defined(MICRO_ROS_TRANSPORT_ARDUINO_SERIAL)
#error This example is only available for Arduino framework with serial transport.
#endif

// Define LED Pin (use LED_BUILTIN or a specific GPIO)
#ifndef LED_BUILTIN
#define LED_BUILTIN 2 // Common for ESP32, adjust if necessary
#endif
// Define LED Pin
#define LED_PIN 19 // Change this to your desired digital GPIO pin number
#define LED_COUNT 16     // The number of LEDs in your strip
#define MORSE_UNIT_TIME_MS 200 // Time unit for morse code blinking (milliseconds)

// --- Initialize the NeoPixel strip ---
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

// Define ROS2 objects for subscription and publisher with its message, an executor, support objects, an allocator, a node
rcl_publisher_t publisher; // Existing publisher for gripper status
std_msgs__msg__String success_msg; // Existing message for gripper status publisher

rcl_subscription_t gripper_subscriber;
std_msgs__msg__Float32MultiArray gripper_pwm;
rcl_subscription_t sec_gripper_subscriber;
std_msgs__msg__Float32MultiArray sec_gripper_pwm;

// Morse code related ROS objects
rcl_subscription_t morse_signal_subscriber; // Changed from morse_subscriber
std_msgs__msg__String morse_signal_msg;    // Changed from std_msgs__msg__Bool morse_msg_data
rcl_publisher_t blink_ack_publisher;
std_msgs__msg__String blink_ack_msg;

rclc_executor_t executor;
rclc_support_t support;
rcl_allocator_t allocator;
rcl_node_t node;
rcl_timer_t timer;

// Initalization for the variables
// Define the format of receiving message
float gripper_pwm_array[3] = {1400.0f, 1400.0f, 1400.0f};
float sec_gripper_pwm_array[3] = {1400.0f, 1400.0f, 1400.0f};
// Define valuables and objects for thruster control
// determine some gereral constants for servo PWM standards
int servo_size = 3;
// NOTE: there should no pin conflict with the thrusters
int gripper_pins[3] = {15, 18, 4};  // Adjust these pins as needed
int sec_gripper_pins[3] = {32, 33, 35};  // Adjust these pins as needed

int test_mode =1;

Servo gripper_servos[3];  // [open/close, up/down, rotation]
Servo sec_gripper_servos[3];

const int servoMiddleUs = 1500;
int thrusterTrim = 0;

// Macros for checking return of ROS2 functions and entering an infinite error loop in case of error
#define RCCHECK(fn) { rcl_ret_t temp_rc = fn; if((temp_rc != RCL_RET_OK)){error_loop();}}
#define RCSOFTCHECK(fn) { rcl_ret_t temp_rc = fn; if((temp_rc != RCL_RET_OK)){}}

// Infinite error loop function. If something fails, the device will get stuck here
void error_loop() {
    while(1) {
        delay(100);
    }
}

// Gripper callback function
void gripper_callback(const void * msgin) {
    const std_msgs__msg__Float32MultiArray * msg = (const std_msgs__msg__Float32MultiArray *)msgin;
    if (msg->data.size != servo_size) {
        // Handle the error case where the sizes do not match
        sprintf(success_msg.data.data, "Error: Gripper array size does not match servo size."); // Format error message
        success_msg.data.size = strlen(success_msg.data.data); // Set size of success message
        rcl_publish(&publisher, &success_msg, NULL); // Publish error message
        return; // Exit function
    }
    // Create an array to record the values written to the gripper servos
    float recorded_gripper_values[servo_size]; // Array to hold recorded PWM values
    // Write the PWM values to the gripper servos and record them
    for (int i = 0; i < servo_size; ++i) { // Loop through each gripper servo
        gripper_servos[i].writeMicroseconds(msg->data.data[i]); // Write PWM value to gripper servo
        recorded_gripper_values[i] = msg->data.data[i]; // Record the PWM value
    }
    // Construct the success message string
    sprintf(success_msg.data.data, "first gripper write pwm success: %f, %f, %f", recorded_gripper_values[0], recorded_gripper_values[1], recorded_gripper_values[2]); // Format success message
    success_msg.data.size = strlen(success_msg.data.data); // Set size of success message
    rcl_publish(&publisher, &success_msg, NULL); // Publish success message
    return; // Exit function
}

void sec_gripper_callback(const void * msgin) {
    const std_msgs__msg__Float32MultiArray * msg = (const std_msgs__msg__Float32MultiArray *)msgin;
    if (msg->data.size != servo_size) {
        // Handle the error case where the sizes do not match
        sprintf(success_msg.data.data, "Error: Gripper array size does not match servo size."); // Format error message
        success_msg.data.size = strlen(success_msg.data.data); // Set size of success message
        rcl_publish(&publisher, &success_msg, NULL); // Publish error message
        return; // Exit function
    }
    // Create an array to record the values written to the gripper servos
    float sec_recorded_gripper_values[servo_size]; // Array to hold recorded PWM values
    // Write the PWM values to the gripper servos and record them
    for (int i = 0; i < servo_size; ++i) { // Loop through each gripper servo
        sec_gripper_servos[i].writeMicroseconds(msg->data.data[i]); // Write PWM value to gripper servo
        sec_recorded_gripper_values[i] = msg->data.data[i]; // Record the PWM value
    }
    // Construct the success message string
    sprintf(success_msg.data.data, "second gripper write pwm success: %f, %f, %f", sec_recorded_gripper_values[0], sec_recorded_gripper_values[1], sec_recorded_gripper_values[2]); // Format success message
    success_msg.data.size = strlen(success_msg.data.data); // Set size of success message
    rcl_publish(&publisher, &success_msg, NULL); // Publish success message
    return; // Exit function
}

// Callback function for morse code signal sequence messages
void morse_signal_subscription_callback(const void * msgin) {
    const std_msgs__msg__String * signal_msg = (const std_msgs__msg__String *)msgin;
    if (signal_msg != NULL && signal_msg->data.data != NULL) {
        // Assuming Serial is initialized for logging on ESP32 if needed
        // printf("Received morse signal: %s\n", signal_msg->data.data);

        for (size_t i = 0; i < signal_msg->data.size; ++i) {
            char bit = signal_msg->data.data[i];
            if (bit == '1') { // LED ON
                for (int j = 0; j < strip.numPixels(); j++) {
                    strip.setPixelColor(j, strip.Color(255, 255, 255)); // White
                }
                strip.show();
            } else { // LED OFF ('0' or any other char for safety)
                strip.fill(strip.Color(0, 0, 0)); // Black (off)
                strip.show();
            }
            delay(MORSE_UNIT_TIME_MS);
        }
        
        // Ensure LED is off after sequence
        strip.fill(strip.Color(0, 0, 0));
        strip.show();

        // Send acknowledgment
        sprintf(blink_ack_msg.data.data, "Morse signal sequence processed.");
        blink_ack_msg.data.size = strlen(blink_ack_msg.data.data);
        rcl_publish(&blink_ack_publisher, &blink_ack_msg, NULL);
        // printf("Published blink ack.\n");
    }
}

void setup() {
    // Start serial communication with a baud rate of 115200
    Serial.begin(115200);

    // --- Initialize the LED strip ---
    strip.begin();
    strip.show(); // Initialize all pixels to 'off'
    strip.setBrightness(150); // Optional: set brightness to 0-255 to lower power consumption

    // Initialize gripper servos
    for (int i = 0; i < 3; i++) {
        gripper_servos[i].attach(gripper_pins[i]);
    }

    // Initialize gripper servos
    for (int i = 0; i < 3; i++) {
        sec_gripper_servos[i].attach(sec_gripper_pins[i]);
    }

    // Initialize gripper servos to middle position
    for (int i = 0; i < 3; i++) {
        gripper_servos[i].writeMicroseconds(1400);  // Middle position
    }

    for (int i = 0; i < 3; i++) {
        sec_gripper_servos[i].writeMicroseconds(1400);  // Middle position
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
    RCCHECK(rclc_node_init_default(&node, "micro_ros_platformio_node", "", &support));

    // Initialize a ROS publisher for gripper status (existing)
    RCCHECK(rclc_publisher_init_default(
        &publisher,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, String),
        "/microros/written_pwm2"));

    // Initialize a ROS publisher for blink acknowledgment
    RCCHECK(rclc_publisher_init_default(
        &blink_ack_publisher,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, String),
        "/blink/ack"));

    // create gripper subscribers (existing)
    RCCHECK(rclc_subscription_init_default(
        &gripper_subscriber,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Float32MultiArray),
        "/receiver/gripper"));
    
    RCCHECK(rclc_subscription_init_default(
        &sec_gripper_subscriber,
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Float32MultiArray),
        "/receiver/sec_gripper"));

    // Create morse signal subscriber
    RCCHECK(rclc_subscription_init_default(
        &morse_signal_subscriber, // Renamed from morse_subscriber
        &node,
        ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, String), // Changed message type
        "/morse_signal_sequence")); // Changed topic name

    // Initialize an executor that will manage the execution of all the ROS entities
    executor = rclc_executor_get_zero_initialized_executor();
    // Handler = number of subscribers (2 grippers + 1 morse = 3)
    RCCHECK(rclc_executor_init(&executor, &support.context, 3, &allocator));
    // Add subscriptions to executor
    RCCHECK(rclc_executor_add_subscription(&executor, &gripper_subscriber, &gripper_pwm, &gripper_callback, ON_NEW_DATA));
    RCCHECK(rclc_executor_add_subscription(&executor, &sec_gripper_subscriber, &sec_gripper_pwm, &sec_gripper_callback, ON_NEW_DATA));
    RCCHECK(rclc_executor_add_subscription(&executor, &morse_signal_subscriber, &morse_signal_msg, &morse_signal_subscription_callback, ON_NEW_DATA));
    
    // **Important** initialization for the every topics
    // Gripper status message (existing)
    success_msg.data.data = (char * ) malloc(200 * sizeof(char));
    success_msg.data.size = 0;
    success_msg.data.capacity = 200;

    // Blink acknowledgment message
    blink_ack_msg.data.data = (char *) malloc(100 * sizeof(char)); // Allocate memory
    blink_ack_msg.data.size = 0;
    blink_ack_msg.data.capacity = 100;

    // Gripper PWM messages (existing)
    gripper_pwm.data.data = gripper_pwm_array; // Set data for gripper PWM message
    gripper_pwm.data.size = 3; // Set size of gripper PWM message
    gripper_pwm.data.capacity = sizeof(gripper_pwm_array); // Set capacity of gripper PWM message

    sec_gripper_pwm.data.data = sec_gripper_pwm_array; // Set data for gripper PWM message
    sec_gripper_pwm.data.size = 3; // Set size of gripper PWM message
    sec_gripper_pwm.data.capacity = sizeof(sec_gripper_pwm_array); // Set capacity of gripper PWM message

    // Morse signal message (for subscriber)
    // Max length of morse signal string, e.g. 512. Adjust as needed.
    // A long text can generate a very long sequence.
    // "HELLO WORLD" is approx 50 chars in morse, with spaces up to 7 units, could be 200-300 signal chars.
    const int morse_signal_capacity = 512; 
    morse_signal_msg.data.data = (char *) malloc(morse_signal_capacity * sizeof(char));
    morse_signal_msg.data.size = 0;
    morse_signal_msg.data.capacity = morse_signal_capacity;
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
    rc += rcl_publisher_fini(&blink_ack_publisher, &node); // Cleanup new publisher
    rc += rcl_subscription_fini(&gripper_subscriber, &node);
    rc += rcl_subscription_fini(&sec_gripper_subscriber, &node);
    rc += rcl_subscription_fini(&morse_signal_subscriber, &node); // Cleanup morse subscriber
    rc += rcl_node_fini(&node);
    rc += rclc_support_fini(&support);
    if (rc != RCL_RET_OK) {
        printf("Error while cleaning up!\n");
    }
}