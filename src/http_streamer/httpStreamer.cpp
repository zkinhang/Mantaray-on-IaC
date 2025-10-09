/**
 * This module captures video from a camera and serves the image over HTTP.
 */

#include <opencv2/opencv.hpp>
#include "httplib.h"   // Include cpp-httplib (https://github.com/yhirose/cpp-httplib)
#include <thread>
#include <mutex>
#include <atomic>
#include <iostream>
#include <chrono>

class VideoStreaming {
public:
    VideoStreaming() : frame_available_(false) {
        // Initialize camera
        bool camera_found = false;
        int max_indices_to_check = 10; // Check up to /dev/video9

        for (int i = 0; i < max_indices_to_check; ++i) {
            std::string device_path = "/dev/video" + std::to_string(i);
            cap_.open(device_path, cv::CAP_V4L2);
            if (cap_.isOpened()) {
                std::cout << "Success! Camera found and opened at " << device_path << std::endl;
                camera_found = true;
                break; // Exit the loop once a camera is found
            }
        }

        if (!camera_found) {
            throw std::runtime_error("Error: Could not find or open any working cameras.");
        }
        
        // Set camera properties for better performance
        cap_.set(cv::CAP_PROP_BUFFERSIZE, 1);  // Minimize latency
        cap_.set(cv::CAP_PROP_FPS, 30);        // Higher FPS for reduced latency
        cap_.set(cv::CAP_PROP_FOURCC, cv::VideoWriter::fourcc('M','J','P','G'));
        
        // Set up HTTP server
        setupRoutes();
        
        // Start capture thread
        capture_thread_ = std::thread(&VideoStreaming::updateFrame, this);
    }
    
    ~VideoStreaming() {
        stop_capture_ = true;
        
        if (capture_thread_.joinable()) {
            capture_thread_.join();
        }
        
        if (cap_.isOpened()) {
            cap_.release();
        }
    }
    
    void run() {
        std::cout << "Starting HTTP server on port 5000..." << std::endl;
        server_.listen("0.0.0.0", 5000);
    }

private:
    void setupRoutes() {
        // Define route for video feed
        server_.Get("/video_feed", [this](const httplib::Request&, httplib::Response& res) {
            if (!frame_available_) {
                res.status = 503; // Service Unavailable
                res.set_content("No frame available", "text/plain");
                return;
            }
            
            std::vector<uchar> jpeg_buffer;
            {
                std::lock_guard<std::mutex> lock(buffer_mutex_);
                jpeg_buffer = buffer_;
            }
            
            // Fix: set content with MIME type
            res.set_header("Content-Type", "image/jpeg");
            res.body.assign(reinterpret_cast<char*>(jpeg_buffer.data()), jpeg_buffer.size());
        });
    }
    
    void updateFrame() {
        auto last_print_time = std::chrono::steady_clock::now();
        int frame_count = 0;
        
        while (!stop_capture_) {
            cv::Mat frame;
            bool success = cap_.read(frame);
            
            if (!success) {
                std::cerr << "Failed to capture frame" << std::endl;
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
                continue;
            }
            
            frame_count++;
            auto now = std::chrono::steady_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - last_print_time).count();
            
            // Print FPS and frame size every second
            if (elapsed >= 1) {
                std::cout << "FPS: " << frame_count / elapsed 
                          << ", Frame size: " << frame.cols << "x" << frame.rows << std::endl;
                frame_count = 0;
                last_print_time = now;
            }
            
            // Encode to JPEG with optimized quality (80% is a good balance)
            std::vector<uchar> jpeg_buffer;
            std::vector<int> encode_params = {cv::IMWRITE_JPEG_QUALITY, 80};
            
            if (cv::imencode(".jpg", frame, jpeg_buffer, encode_params)) {
                std::lock_guard<std::mutex> lock(buffer_mutex_);
                buffer_ = jpeg_buffer;
                frame_available_ = true;
            } else {
                std::cerr << "Failed to encode frame" << std::endl;
            }
            
            // Small delay to prevent excessive CPU usage
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }

    cv::VideoCapture cap_;
    httplib::Server server_;
    std::thread capture_thread_;
    std::vector<uchar> buffer_;
    std::mutex buffer_mutex_;
    std::atomic<bool> frame_available_;
    std::atomic<bool> stop_capture_{false};
};

int main() {
    try {
        VideoStreaming streamer;
        streamer.run();  // This will block until the server is stopped
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}
