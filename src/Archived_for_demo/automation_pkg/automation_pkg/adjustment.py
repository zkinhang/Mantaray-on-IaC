"""
    This code will subscribe to the camera/image_raw topic,
    and use it to determine the adjustment needed to center the gate in the image. 
    The adjustment is then published to the thruster_pwm topic.
"""
import rclpy
from rclpy.node import Node
from std_msgs.msg import Float32MultiArray
from geometry_msgs.msg import Twist
import numpy as np
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2


class TaskQual():
    def __init__(self):
        self.image = None
        self.mask = None
        # # Yellow (old)
        # self.lower = np.array([12, 50, 52])
        # self.upper = np.array([35, 208, 212])
        # Red
        # self.lower = np.array([0, 134, 134])
        # self.upper = np.array([10, 255, 255])
        # Green
        # self.lower = np.array([43, 102, 16])
        # self.upper = np.array([82, 255, 101])
        # Yellow (testing)
        # self.lower = np.array([21, 35, 255])
        # self.upper = np.array([47, 162, 255])
        # orange (tape, normal light)
        self.lower = np.array([0, 170, 180])
        self.upper = np.array([179, 255, 255])
        
    # def adjustment(self, x_diff, y_diff):
    #     """Return the Power of the LR and depth movement"""
    #     LR = 0
    #     depth = -5
    #     LRPower = 30
    #     DPower = 30
    #     x_ratio = (x_diff / 200)
    #     print(x_diff, y_diff)
    #     if y_diff > 10:
    #         """y_diff > 0 mean the object is below the center of the image"""
    #         print("Go Down")
    #         depth = -DPower
    #     elif y_diff < -10:
    #         print("Go Up")
    #     else:
    #         print("Depth Stay")
    #     if x_diff > 10:
    #         """x_diff > 0 mean the object is at the Right side of the image"""
    #         print("Go Right")
    #         LR = LRPower * x_ratio
    #     elif x_diff < -10:
    #         print("Go Left")
    #         LR = LRPower * x_ratio
    #     else:
    #         print("LR Stay")
    #     return LR, depth
    
    def adjustment(self, x_diff, y_diff):
        """Return the Power of the LR and depth movement"""
        LR = 0.0
        depth = 0.0
        # LRPower = 0.3
        DPower = 1.0
        x_ratio = x_diff / 200
        print(x_diff, y_diff)
        if y_diff > 10:
            """y_diff > 0 mean the object is below the center of the image"""
            print("Go Down")
            depth = -DPower
        elif y_diff < -10:
            print("Go Up")
            depth = DPower
        else:
            print("Depth Stay")
        if x_diff > 10:
            """x_diff > 0 mean the object is at the Right side of the image"""
            print("Go Right")
            LR = 1.0
        elif x_diff < -10:
            print("Go Left")
            LR = -1.0
        else:
            LR = 0.0
            print("LR Stay")
        return LR, depth

    # def step(self, image, startTime=None):
    #     focalLength = 30
    #     completed = False
    #     LR, UD, FB, turn = 0, 0, 0, 0
    #     elapsed_time = time.time() - startTime
    #     if elapsed_time <= 2:
    #         FB = 20
    #         return completed, LR, UD, FB, turn, startTime
    #     else:
    #         FB = 0
    #         self.image, _, x_diff,y_diff = self.pointGate(image,self.lower,self.upper)
    #         LR,UD,FB,turn = 0,0,5,0
    #         if x_diff is not None and y_diff is not None:
    #             LR,UD = self.adjustment(x_diff,y_diff)
    #         return completed, LR, FB, UD, turn, startTime
        
    def leadToGate(self, img):
        forwardInput, rightwardInput, upwardInput, yawInput, pitchInput, rollInput = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        frame, mask, x_diff, y_diff = self.traceColour(img, self.lower, self.upper)
        forwardInput, rightwardInput, upwardInput, yawInput, pitchInput, rollInput = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        if x_diff is not None and y_diff is not None:
            yawInput, upwardInput = self.adjustment(x_diff, y_diff)
        return forwardInput, rightwardInput, upwardInput, yawInput, pitchInput, rollInput
        
    # Find two most significant contours and return the center of the two contours
    def pointGate(self, img, lower, upper):
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, lower, upper)
        _, edges = cv2.threshold(mask, 150, 255, cv2.THRESH_BINARY)
        contours, hierarchy = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        centers = []
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:2]
        x_diff = 0
        y_diff = 0
        if len(contours) > 0:
            for contour in contours:
                try:
                    center = cv2.moments(contour)["m10"] / cv2.moments(contour)["m00"]
                    center = (int(center), int(cv2.moments(contour)["m01"] / cv2.moments(contour)["m00"]))
                    centers.append(center)
                    line_thickness = 2
                    color = (0, 0, 255)
                    cv2.circle(img, center, 10, color, line_thickness)
                except ZeroDivisionError:
                    frame = None
                    return frame, mask, x_diff, y_diff
            center1 = centers[0]
            center2 = centers[1]
            center_difference = (((center1[0] + center2[0]) // 2), ((center1[1] + center2[1]) // 2))
            color = (0, 0, 255)
            colorRed = (0, 255, 0)
            cv2.circle(img, center_difference, 10, color, line_thickness)
            frame = cv2.bitwise_and(img, img, mask=mask)
            img_height, img_width = frame.shape[:2]
            half_width, half_height = img_width // 2, img_height // 2
            cv2.line(frame, (center_difference[0] - half_width, center_difference[1]), (center_difference[0] + half_width, center_difference[1]), color, line_thickness)
            cv2.line(frame, (center_difference[0], center_difference[1] - half_height), (center_difference[0], center_difference[1] + half_height), color, line_thickness)
            cv2.line(frame, (center_difference[0], center_difference[1]), (half_width, half_height), colorRed, line_thickness)
            x_diff = center_difference[0] - half_width
            y_diff = center_difference[1] - half_height
            return frame, mask, x_diff, y_diff
        return frame, mask, x_diff, y_diff
    
    def traceColour(self, img, lower, upper):
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, lower, upper)
        _, edges = cv2.threshold(mask, 150, 255, cv2.THRESH_BINARY)
        contours, hierarchy = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        x_diff = 0
        y_diff = 0
        if len(contours) > 0:
            # Find the most significant contour
            contour = max(contours, key=cv2.contourArea)
            try:
                center = cv2.moments(contour)["m10"] / cv2.moments(contour)["m00"]
                center = (int(center), int(cv2.moments(contour)["m01"] / cv2.moments(contour)["m00"]))
                line_thickness = 2
                color = (0, 0, 255)
                cv2.circle(img, center, 10, color, line_thickness)
            except ZeroDivisionError:
                frame = None
                return frame, mask, x_diff, y_diff
            colorRed = (0, 255, 0)
            frame = cv2.bitwise_and(img, img, mask=mask)
            img_height, img_width = frame.shape[:2]
            half_width, half_height = img_width // 2, img_height // 2
            cv2.line(frame, (center[0] - half_width, center[1]), (center[0] + half_width, center[1]), color, line_thickness)
            cv2.line(frame, (center[0], center[1] - half_height), (center[0], center[1] + half_height), color, line_thickness)
            cv2.line(frame, (center[0], center[1]), (half_width, half_height), colorRed, line_thickness)
            x_diff = center[0] - half_width
            y_diff = center[1] - half_height
            return frame, mask, x_diff, y_diff
        return frame, mask, x_diff, y_diff

class adjustmentNode(Node): 
    """create a node for printing ros2"""
    def __init__(self):
        super().__init__('qualification_node')
        self.task = TaskQual()
        self.image_subscriber = self.create_subscription(
            Image,
            '/camera/image_raw',
            self.adjustment_callback,
            10)
        self.bridge = CvBridge()
        self.input_publisher = self.create_publisher(
            Twist,
            '/controller/console',
            10)
        # note: the sign of downward value from controller is reversed
        self.UD_adjust = -1
        self.image_publisher = self.create_publisher(
            Image,
            '/camera/image_masked',
            10)
    
    def adjustment_callback(self, img):
        try:
            # Convert ROS Image to OpenCV image
            cv_image = self.bridge.imgmsg_to_cv2(img, desired_encoding='bgr8')
            # Display the image
            forwardInput, rightwardInput, upwardInput, yawInput, pitchInput, rollInput = self.task.leadToGate(cv_image)
            self.get_logger().info(f'Forward:{forwardInput}, Rightward:{rightwardInput}, Upward:{upwardInput}, Yaw:{yawInput}, Pitch:{pitchInput}, Roll:{rollInput}')
            # Assign the values to twist
            pwm_msg = Twist()
            pwm_msg.linear.x = rightwardInput
            pwm_msg.linear.y = forwardInput * -1.0
            pwm_msg.linear.z = yawInput
            pwm_msg.angular.x = pitchInput
            pwm_msg.angular.y = rollInput
            pwm_msg.angular.z = upwardInput * -1.0
            
            self.input_publisher.publish(pwm_msg)
            self.get_logger().info('Commond published')
            ros2_img = self.bridge.cv2_to_imgmsg(cv_image, encoding='bgr8')
            # Publish the image
            self.image_publisher.publish(ros2_img)
            self.get_logger().info('Published an image')
            
        except Exception as e:
            self.get_logger().error(f'Error: {e}')


"""main for the node"""
def main(args=None):
    rclpy.init(args=args)
    node = adjustmentNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == "__main__":
    main()
