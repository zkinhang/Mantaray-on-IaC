"""
This module receives images from two ROS topics and displays them using threads.
"""

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2
import numpy as np
import threading
import queue
from rclpy.executors import MultiThreadedExecutor
from rclpy.callback_groups import MutuallyExclusiveCallbackGroup

class ImageReceiver(Node):
    """Subscribes to two ROS topics to receive images and display them using OpenCV."""

    def __init__(self):
        """Initialize the node with threaded camera processing."""
        super().__init__('image_receiver')
        
        # Add connection status flags
        self.camera1_connected = False
        self.camera2_connected = False
        
        # Create image queues for each camera
        self.queue1 = queue.Queue(maxsize=1)
        self.queue2 = queue.Queue(maxsize=1)
        
        # Create separate callback groups for each subscription
        self.callback_group1 = MutuallyExclusiveCallbackGroup()
        self.callback_group2 = MutuallyExclusiveCallbackGroup()
        
        # Create subscriptions with their respective callback groups
        self.subscription1 = self.create_subscription(
            Image,
            '/camera/image_raw',
            self.image_callback1,
            1,
            callback_group=self.callback_group1)
        
        self.subscription2 = self.create_subscription(
            Image,
            '/camera/image_raw2',
            self.image_callback2,
            1,
            callback_group=self.callback_group2)
            
        self.bridge = CvBridge()
        
        # Create separate processing threads for each camera
        self.running = True
        self.process_thread1 = threading.Thread(target=self.process_camera1)
        self.process_thread2 = threading.Thread(target=self.process_camera2)
        self.display_thread = threading.Thread(target=self.display_loop)
        
        # Make threads daemon so they exit when main program exits
        self.process_thread1.daemon = True
        self.process_thread2.daemon = True
        self.display_thread.daemon = True
        
        # Latest processed images
        self.latest_image1 = None
        self.latest_image2 = None
        self.image_lock = threading.Lock()
        
        # Start all threads
        self.process_thread1.start()
        self.process_thread2.start()
        self.display_thread.start()
        
        self.get_logger().info("Image receiver node initialized")

    def image_callback1(self, msg):
        """Queue the first camera feed for processing."""
        try:
            if not self.camera1_connected:
                self.camera1_connected = True
                self.get_logger().info("Camera 1 connected")
            
            if self.queue1.full():
                self.queue1.get_nowait()
            self.queue1.put_nowait(msg)
        except queue.Full:
            pass

    def image_callback2(self, msg):
        """Queue the second camera feed for processing."""
        try:
            if not self.camera2_connected:
                self.camera2_connected = True
                self.get_logger().info("Camera 2 connected")
            
            if self.queue2.full():
                self.queue2.get_nowait()
            self.queue2.put_nowait(msg)
        except queue.Full:
            pass

    def process_camera1(self):
        """Process first camera feed independently."""
        while self.running:
            try:
                msg = self.queue1.get(timeout=0.1)
                cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
                with self.image_lock:
                    self.latest_image1 = cv_image
            except queue.Empty:
                continue
            except Exception as e:
                self.get_logger().error(f'Failed to process camera 1: {str(e)}')

    def process_camera2(self):
        """Process second camera feed independently."""
        while self.running:
            try:
                msg = self.queue2.get(timeout=0.1)
                cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
                with self.image_lock:
                    self.latest_image2 = cv_image
            except queue.Empty:
                continue
            except Exception as e:
                self.get_logger().error(f'Failed to process camera 2: {str(e)}')

    def display_loop(self):
        """Display processed images."""
        while self.running:
            self.display_images()
            if cv2.waitKey(1) & 0xFF == ord('q'):
                self.running = False
                break

    def display_images(self):
        """Thread-safe image display."""
        with self.image_lock:
            img1 = self.latest_image1
            img2 = self.latest_image2

        # Display camera 1
        if self.camera1_connected:
            if img1 is not None:
                cv2.imshow("Camera 1", img1)
                cv2.imwrite("/home/edwin/Downloads/cam/cam/images/camera_1.jpg", img1)
            else:
                blank = np.ones((480, 640, 3), dtype=np.uint8) * 255
                cv2.putText(blank, "Waiting for Camera 1...", 
                           (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, 
                           (0, 0, 0), 2)
                cv2.imshow("Camera 1", blank)

        # Display camera 2
        if self.camera2_connected:
            if img2 is not None:
                cv2.imshow("Camera 2", img2)
                cv2.imwrite("/home/edwin/Downloads/cam/cam/images/camera_2.jpg", img2)
            else:
                blank = np.ones((480, 640, 3), dtype=np.uint8) * 255
                cv2.putText(blank, "Waiting for Camera 2...", 
                           (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, 
                           (0, 0, 0), 2)
                cv2.imshow("Camera 2", blank)

        # Handle window closing
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            self.running = False

    def cleanup(self):
        """Cleanup resources."""
        self.running = False
        self.process_thread1.join()
        self.process_thread2.join()
        self.display_thread.join()
        cv2.destroyAllWindows()


def main(args=None):
    """Run the node with multi-threaded executor."""
    rclpy.init(args=args)
    
    image_receiver = ImageReceiver()
    
    # Create and use a MultiThreadedExecutor
    executor = MultiThreadedExecutor(num_threads=3)
    executor.add_node(image_receiver)
    
    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        image_receiver.cleanup()
        image_receiver.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()