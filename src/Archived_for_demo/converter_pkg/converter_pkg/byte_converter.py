# converter node, get the array storing the pwm values and convert it to bytes to be written to the serial, with header and tail

# scale method:
""" servoList = self.servoMapping(servoList, encode=True)
    # convert servo value from 1100 - 1900 to 1 bytes
    servoList = [int((((value - 1500) / (400)) * 127) + 128) for value in servoList]
    # print(servoList)
    servoList = [value.to_bytes(1, 'big', signed=False) for value in servoList]
    header = bytearray.fromhex("60")
    data = []
    data += header
    data += bytearray.fromhex("0B")
    for i in servoList:
        data += i
    self.write(data)
    return self.readStreamData()
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float32MultiArray, ByteMultiArray
import time

class PwmConverter(Node):
    def __init__(self):
        super().__init__('pwm_converter')
        self.pwm_subscription = self.create_subscription(
            Float32MultiArray,
            '/receiver/input',
            self.listener_callback,
            10)
        self.byte_publisher = self.create_publisher(
            ByteMultiArray, 
            '/converter/pwm_bytes', 
            10)
        self.get_logger().info('PWM converter node initialization done: waiting for PWM values in array')


    def listener_callback(self, pwms:Float32MultiArray):
        if len(pwms.data) != 8 and len(pwms.data) != 6:
            self.get_logger().error('Received PWM values array does not contain neither 8 nor 6 elements.')
            return

        pwm_values = pwms.data
        self.get_logger().info(f'Received PWM values: {pwm_values}')
        
        # scale the pwm values to 0-255(as 1 byte)
        scaled_pwm_list = [int((((value - 1500) / (400)) * 127) + 128) for value in pwm_values]
        # print(servoList)
        scaled_pwm_list = [value.to_bytes(1, 'big', signed=False) for value in scaled_pwm_list]  

        # construct the bytes
        pwm_bytes = bytearray()
        header = b'\xAA'
        tail = b'\xFF'
        pwm_bytes.append(header[0])
        for value in scaled_pwm_list:
            pwm_bytes.extend(value)
        pwm_bytes.append(tail[0])
        
        self.get_logger().info(f'Constructed PWM bytes: {pwm_bytes}')

        byte_msg = ByteMultiArray()
        byte_msg.data = pwm_bytes
        self.input_publisher_callback(byte_msg)
        self.get_logger().info('Published PWM bytes to pwm_bytes topic')
        
    def input_publisher_callback(self, pwms:ByteMultiArray):
        self.byte_publisher.publish(pwms)
        self.get_logger().info("PWM bytes published")

def main(args=None):
    rclpy.init(args=args)
    pwm_converter = PwmConverter()
    rclpy.spin(pwm_converter)
    pwm_converter.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()