import rclpy
from rclpy.node import Node
from std_msgs.msg import Empty
from sensor_msgs.msg import Image
from cv_bridge import CvBridge, CvBridgeError
import cv2
import time
import threading
import requests # Import requests
import numpy as np # Import numpy

class ImageCaptureNode(Node):
    _printed_build_info = False
    _print_lock = threading.Lock()

    def __init__(self):
        super().__init__('image_capture_node_py')

        # Print OpenCV build info once for debugging video backends
        with ImageCaptureNode._print_lock:
            if not ImageCaptureNode._printed_build_info:
                try:
                    build_info = cv2.getBuildInformation()
                    self.get_logger().info("--- OpenCV Build Information ---")
                    # Log line by line to avoid truncation
                    for line in build_info.splitlines():
                        self.get_logger().info(line)
                    self.get_logger().info("------------------------------")
                    ImageCaptureNode._printed_build_info = True
                except Exception as e:
                    self.get_logger().warn(f"Could not get OpenCV build information: {e}")

        # Declare parameters for stream URLs
        self.declare_parameter('stream_url_1', 'http://localhost:8080/stream')
        self.declare_parameter('stream_url_2', 'http://localhost:8081/stream')
        self.stream_url_1 = self.get_parameter('stream_url_1').get_parameter_value().string_value
        self.stream_url_2 = self.get_parameter('stream_url_2').get_parameter_value().string_value

        self.get_logger().info(f"Using Stream 1 URL: {self.stream_url_1}")
        self.get_logger().info(f"Using Stream 2 URL: {self.stream_url_2}")

        # Create publishers
        self.publisher1 = self.create_publisher(Image, '/captured_image/feed1', 10)
        self.publisher2 = self.create_publisher(Image, '/captured_image/feed2', 10)
        self.get_logger().info("Publishing to /captured_image/feed1 and /captured_image/feed2")

        # Create subscriber for the trigger
        self.trigger_subscriber = self.create_subscription(
            Empty,
            '/trigger_capture',
            self.trigger_callback,
            10)
        self.get_logger().info("Subscribed to /trigger_capture")

        # Initialize CvBridge
        self.bridge = CvBridge()

        self.get_logger().info("Python Image Capture Node started.")

    def trigger_callback(self, msg):
        self.get_logger().info("Capture triggered!")
        # Capture and publish from both streams sequentially
        self.capture_and_publish(self.stream_url_1, self.publisher1, "Stream 1")
        self.capture_and_publish(self.stream_url_2, self.publisher2, "Stream 2")

    def capture_and_publish(self, url, publisher, stream_name):
        """
        Fetches a single frame from an MJPEG stream using requests and publishes it.
        """
        self.get_logger().info(f"[{stream_name}] Attempting capture via requests from {url}")
        frame = None
        try:
            # Use requests to get the stream, timeout is important
            response = requests.get(url, stream=True, timeout=5) # 5 second timeout
            response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

            stream_bytes = b''
            # Read the stream chunk by chunk
            for chunk in response.iter_content(chunk_size=1024):
                stream_bytes += chunk
                # Find the start and end of a JPEG frame
                start = stream_bytes.find(b'\xff\xd8') # JPEG start marker
                end = stream_bytes.find(b'\xff\xd9') # JPEG end marker

                if start != -1 and end != -1 and end > start:
                    jpg_data = stream_bytes[start:end+2] # Extract JPEG data (+2 for end marker)
                    # Decode the JPEG data into an OpenCV image (NumPy array)
                    frame = cv2.imdecode(np.frombuffer(jpg_data, dtype=np.uint8), cv2.IMREAD_COLOR)

                    if frame is not None and frame.size > 0:
                         self.get_logger().info(f"[{stream_name}] Successfully decoded frame via requests/imdecode")
                         break # Got one frame, exit the loop
                    else:
                         self.get_logger().warn(f"[{stream_name}] Failed to decode JPEG data chunk.")
                         # Reset relevant part of buffer to avoid reprocessing bad data? Maybe just continue.
                         stream_bytes = stream_bytes[end+2:] # Keep unprocessed data

                # Limit buffer size to prevent excessive memory usage if boundaries aren't found
                if len(stream_bytes) > 2 * 1024 * 1024: # Example limit: 2MB
                    self.get_logger().warn(f"[{stream_name}] Stream buffer exceeded limit without finding complete frame. Resetting.")
                    stream_bytes = b'' # Reset buffer

            # Close the response connection
            response.close()

        except requests.exceptions.RequestException as e:
            self.get_logger().error(f"[{stream_name}] Request failed: {e}")
            return
        except Exception as e:
            self.get_logger().error(f"[{stream_name}] Error during requests/decoding: {e}")
            return

        # Check if we successfully got a frame
        if frame is None:
            self.get_logger().error(f"[{stream_name}] Failed to capture/decode frame via requests.")
            return

        # --- Frame obtained, proceed with CvBridge and publishing ---
        try:
            self.get_logger().info(f"[{stream_name}] Successfully read frame (type: {type(frame)})")

            # Convert OpenCV image (NumPy array) to ROS message using cv_bridge
            ros_image = self.bridge.cv2_to_imgmsg(frame, encoding="bgr8")
            ros_image.header.stamp = self.get_clock().now().to_msg()
            ros_image.header.frame_id = stream_name.lower().replace(" ", "_")

            # Publish the message
            publisher.publish(ros_image)
            self.get_logger().info(f"[{stream_name}] Published image")

        except CvBridgeError as e:
            self.get_logger().error(f"[{stream_name}] CvBridge Error converting frame: {e}")
        except Exception as e:
             self.get_logger().error(f"[{stream_name}] Error during bridge/publish: {e}")


def main(args=None):
    rclpy.init(args=args)
    image_capture_node = ImageCaptureNode()
    try:
        rclpy.spin(image_capture_node)
    except KeyboardInterrupt:
        image_capture_node.get_logger().info('Keyboard interrupt detected, shutting down.')
    finally:
        # Destroy the node explicitly
        # (optional - otherwise it will be done automatically
        # when the garbage collector destroys the node object)
        if rclpy.ok(): # Check if context is still valid before destroying
             image_capture_node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
