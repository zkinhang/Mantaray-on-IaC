import rclpy
from rclpy.node import Node
from std_msgs.msg import ByteMultiArray
import serial.tools.list_ports
import serial

# VID:PID for the device
mc_hw_id = "1A86:7523"

class PortSender(Node):
    def __init__(self):
        super().__init__('port_sender')
        # # initalization for the serial connection
        # timer_period = 0.001  # seconds
        # self.timer = self.create_timer(timer_period, self.timer_callback)
        self.get_logger().info(self.port_initalization())

        self.subscription = self.create_subscription(
        ByteMultiArray,
        '/converter/pwm_bytes',
        self.listener_callback,
        10)

    # def timer_callback(self):
    #     result = self.microcontroller.readline().decode('utf-8').strip()
    #     print(result)

    def port_initalization(self):
        self.get_logger().info(f'Initalizing serial connection')
        ports = serial.tools.list_ports.comports()
        self.microcontroller = None
        for port, desc, hw_id in sorted(ports):
            self.get_logger().info(f"{port}: {desc} [{hw_id}]")
            if mc_hw_id in hw_id:
                self.get_logger().info(f"Port initalization: ok")
                self.microcontroller = serial.Serial(port, 115200, timeout=1)
                self.get_logger().info(f"Serial connection ok")
                self.get_logger().info(f"Start listening commands and serial write")
                break
        if self.microcontroller is None:
            self.get_logger().info(f"Port initalization: Device not found")
            exit(1)
        return f'Port initalization: ok'

    def listener_callback(self, msg:ByteMultiArray):
        try:
            cmd_bytes = b''.join(msg.data)
            self.microcontroller.write(cmd_bytes)
            self.get_logger().info(f'Sent data: {cmd_bytes}')
            result = self.microcontroller.readline().decode('utf-8').strip()
            print(result)
        except serial.SerialException as e:
            self.get_logger().error(f'Error sending data: {e}')
            self.get_logger().info(f'Reconnecting...')
            self.get_logger().info(self.port_initalization())

def main(args=None):
    rclpy.init(args=args)
    port_sender = PortSender()
    rclpy.spin(port_sender)
    port_sender.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()