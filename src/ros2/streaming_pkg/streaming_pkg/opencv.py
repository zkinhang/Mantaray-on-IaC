"""This module captures video from a camera and publishes it as ROS Image messages."""

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2


class VideoStreaming(Node):
    """Node for capturing and publishing images."""

    def __init__(self):
        """Initialize the video streaming node."""
        super().__init__('video_streaming')
        # publisher camera/image_raw
        self.image_publisher = self.create_publisher(
            Image,
            'camera/image_raw2',
            1)

        self.bridge = CvBridge()

        self.Vdopath = 'PutYourImageInputHere'
        self.cap = cv2.VideoCapture(0)
        # self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))

        # Timer to periodically publish images
        self.timer = self.create_timer(0.1, self.image_callback)

    def image_callback(self):
        """Capture frame from the camera."""
        ret, frame = self.cap.read()

        if ret:
            try:
                pass
            except cv2.error as e:
                self.get_logger().error('Error: {0}'.format(e))
                return
        else:
            self.get_logger().error('Capture image: Unexpected error')
            return

        # Convert OpenCV image to ROS Image message
        ros_image = self.bridge.cv2_to_imgmsg(frame, encoding='bgr8')

        # Publish the image
        self.image_publisher.publish(ros_image)
        self.get_logger().info('Published an image')


def main(args=None):
    """Initialize and spin the ROS node."""
    rclpy.init(args=args)
    node = VideoStreaming()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
