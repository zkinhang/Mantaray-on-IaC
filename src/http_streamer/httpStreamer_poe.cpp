/**
 * This module captures video from a camera and serves the image over HTTP.
 */

#include <opencv2/opencv.hpp>
#include "httplib.h"   // Include cpp-httplib (https://github.com/yhirose/cpp-httplib)
#include <thread>
#include <mutex>
#include <atomic>
#include <iostream>
#include <chrono>

class VideoStreaming {
public:
    VideoStreaming(const std::string& camera_url) : frame_available_(false) { // Added camera_url parameter
        // Initialize camera
        std::cout << "Attempting to open camera: " << camera_url << std::endl;
        cap_.open(camera_url); // <-- MODIFIED LINE: Use the camera URL
        
        // Set camera properties for better performance (these might not all be supported by IP cameras)
        cap_.set(cv::CAP_PROP_BUFFERSIZE, 1);  // Minimize latency
        // cap_.set(cv::CAP_PROP_FPS, 30);        // FPS might be dictated by the camera stream
        // cap_.set(cv::CAP_PROP_FOURCC, cv::VideoWriter::fourcc('M','J','P','G')); // May not be applicable or changeable for IP cameras

        // Check if camera opened successfully
        if (!cap_.isOpened()) {
            throw std::runtime_error("Could not open camera. Check the RTSP URL and network connectivity.");
        }
        std::cout << "Camera opened successfully." << std::endl;
        
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
            
            if (!success || frame.empty()) { // Added frame.empty() check
                std::cerr << "Failed to capture frame from IP camera or frame is empty." << std::endl;
                std::this_thread::sleep_for(std::chrono::milliseconds(100)); // Longer sleep if connection issue
                // Attempt to reopen the camera if it seems disconnected
                if (!cap_.isOpened()) {
                    std::cerr << "Camera connection lost. Attempting to reconnect..." << std::endl;
                    cap_.open(cap_.get(cv::CAP_PROP_POS_AVI_RATIO) == -1 ? "rtsp://admin:123456@192.168.1.10/H264?ch=1&subtype=0" : cap_.getBackendName()); // Re-open with last known URL or a default
                    if (!cap_.isOpened()) {
                        std::cerr << "Reconnect failed." << std::endl;
                        std::this_thread::sleep_for(std::chrono::seconds(5)); // Wait longer before retrying
                    } else {
                        std::cout << "Reconnected to camera." << std::endl;
                    }
                }
                continue;
            }
            
            frame_count++;
            auto now = std::chrono::steady_clock::now();
            auto elapsed_seconds = std::chrono::duration_cast<std::chrono::seconds>(now - last_print_time).count();
            
            // Print FPS and frame size every second
            if (elapsed_seconds >= 1) {
                std::cout << "FPS: " << static_cast<double>(frame_count) / elapsed_seconds 
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
            
            // Small delay to prevent excessive CPU usage if frames are coming very fast
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
    // Replace with your camera's RTSP URL
    std::string camera_ip_url = "rtsp://admin:123456@192.168.1.10/H264?ch=1&subtype=0"; 
    // Example: "rtsp://admin:password123@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0"

    try {
        VideoStreaming streamer(camera_ip_url); // Pass the URL to the constructor
        streamer.run();  // This will block until the server is stopped
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}