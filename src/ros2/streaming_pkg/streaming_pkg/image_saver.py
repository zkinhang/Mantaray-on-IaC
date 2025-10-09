import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge, CvBridgeError
import cv2
import os
import time

class ImageSaverNode(Node):
    def __init__(self):
        super().__init__('image_saver_node_py')

        # Declare parameters for output directories
        self.declare_parameter('output_dir_1', '/home/edwin/Desktop/captured_images/feed1')
        self.declare_parameter('output_dir_2', '/home/edwin/Desktop/captured_images/feed2')
        self.output_dir_1 = self.get_parameter('output_dir_1').get_parameter_value().string_value
        self.output_dir_2 = self.get_parameter('output_dir_2').get_parameter_value().string_value

        self.get_logger().info(f"Saving images from feed 1 to: {self.output_dir_1}")
        self.get_logger().info(f"Saving images from feed 2 to: {self.output_dir_2}")

        # Create directories if they don't exist
        try:
            os.makedirs(self.output_dir_1, exist_ok=True)
            os.makedirs(self.output_dir_2, exist_ok=True)
        except OSError as e:
            self.get_logger().error(f"Failed to create directories: {e}")
            # Decide if you want to exit or continue without saving
            rclpy.shutdown()
            return

        # Initialize counters for sequential naming
        self.counter1 = 0
        self.counter2 = 0

        # Initialize CvBridge
        self.bridge = CvBridge()

        # Create subscribers for the image topics
        self.subscription1 = self.create_subscription(
            Image,
            '/captured_image/feed1',
            self.image_callback1,
            10) # QoS profile depth 10

        self.subscription2 = self.create_subscription(
            Image,
            '/captured_image/feed2',
            self.image_callback2,
            10) # QoS profile depth 10

        self.get_logger().info("Image Saver Node started. Waiting for images...")

    def image_callback1(self, msg):
        self.get_logger().info(f"Received image from /captured_image/feed1 (seq: {msg.header.stamp.sec})")
        self.save_image(msg, self.output_dir_1, 1)

    def image_callback2(self, msg):
        self.get_logger().info(f"Received image from /captured_image/feed2 (seq: {msg.header.stamp.sec})")
        self.save_image(msg, self.output_dir_2, 2)

    def save_image(self, msg, output_dir, feed_index):
        try:
            # Convert ROS Image message to OpenCV image
            cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
        except CvBridgeError as e:
            self.get_logger().error(f"CvBridge Error converting image from feed {feed_index}: {e}")
            return
        except Exception as e:
            self.get_logger().error(f"Error converting image from feed {feed_index}: {e}")
            return

        # Increment counter and create filename
        if feed_index == 1:
            self.counter1 += 1
            count = self.counter1
        else:
            self.counter2 += 1
            count = self.counter2

        # Use timestamp for potentially more unique names, or just counter
        # timestamp_sec = msg.header.stamp.sec
        # timestamp_nanosec = msg.header.stamp.nanosec
        # filename = f"img_{timestamp_sec}_{timestamp_nanosec}.jpg"
        filename = f"img_{count:06d}.jpg" # e.g., img_000001.jpg
        save_path = os.path.join(output_dir, filename)

        # Save the image
        try:
            success = cv2.imwrite(save_path, cv_image)
            if success:
                self.get_logger().info(f"Saved image from feed {feed_index} to: {save_path}")
            else:
                self.get_logger().error(f"Failed to save image to {save_path} (cv2.imwrite returned false)")
        except Exception as e:
            self.get_logger().error(f"Error saving image {save_path}: {e}")


def main(args=None):
    rclpy.init(args=args)
    image_saver_node = ImageSaverNode()
    try:
        rclpy.spin(image_saver_node)
    except KeyboardInterrupt:
        pass
    finally:
        image_saver_node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
