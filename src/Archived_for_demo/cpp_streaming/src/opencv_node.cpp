#include <rclcpp/rclcpp.hpp>
#include <sensor_msgs/msg/image.hpp>
#include <cv_bridge/cv_bridge.hpp>
#include <opencv2/opencv.hpp>
#include <memory>

class VideoStreaming : public rclcpp::Node
{
public:
    VideoStreaming() : Node("video_streaming")
    {
        // Create publisher with a larger queue size for better throughput
        image_publisher_ = this->create_publisher<sensor_msgs::msg::Image>(
            "camera/image_raw2", 10);

        // Open camera with high-performance settings
        cap_.open(0);
        if (!cap_.isOpened()) {
            RCLCPP_ERROR(this->get_logger(), "Failed to open camera");
            throw std::runtime_error("Could not open camera");
        }

        // Set camera properties for better performance
        cap_.set(cv::CAP_PROP_BUFFERSIZE, 1);  // Minimize latency
        cap_.set(cv::CAP_PROP_FPS, 30);        // Set FPS
        cap_.set(cv::CAP_PROP_FOURCC, cv::VideoWriter::fourcc('M','J','P','G'));

        // Create timer with higher frequency (30Hz)
        timer_ = this->create_wall_timer(
            std::chrono::milliseconds(33),  // ~30 FPS
            std::bind(&VideoStreaming::imageCallback, this));

        // Preallocate message to avoid repeated allocation
        img_msg_ = std::make_shared<sensor_msgs::msg::Image>();
    }

    ~VideoStreaming()
    {
        if (cap_.isOpened()) {
            cap_.release();
        }
    }

private:
    void imageCallback()
    {
        if (!cap_.isOpened()) {
            RCLCPP_ERROR(this->get_logger(), "Camera disconnected");
            return;
        }

        cv::Mat frame;
        if (!cap_.read(frame)) {
            RCLCPP_ERROR(this->get_logger(), "Failed to capture frame");
            return;
        }

        try {
            // Convert to ROS message using cv_bridge
            // Using shared_ptr and move semantics for better performance
            auto cv_ptr = cv_bridge::CvImage(std_msgs::msg::Header(), "bgr8", frame);
            img_msg_ = cv_ptr.toImageMsg();
            img_msg_->header.stamp = this->now();
            img_msg_->header.frame_id = "camera_frame";

            // Publish the image
            image_publisher_->publish(*img_msg_);
            RCLCPP_DEBUG(this->get_logger(), "Published image");
        }
        catch (const cv_bridge::Exception& e) {
            RCLCPP_ERROR(this->get_logger(), "cv_bridge exception: %s", e.what());
        }
        catch (const std::exception& e) {
            RCLCPP_ERROR(this->get_logger(), "Error: %s", e.what());
        }
    }

    cv::VideoCapture cap_;
    rclcpp::Publisher<sensor_msgs::msg::Image>::SharedPtr image_publisher_;
    rclcpp::TimerBase::SharedPtr timer_;
    sensor_msgs::msg::Image::SharedPtr img_msg_;
};

int main(int argc, char** argv)
{
    rclcpp::init(argc, argv);
    auto node = std::make_shared<VideoStreaming>();
    rclcpp::spin(node);
    rclcpp::shutdown();
    return 0;
} 