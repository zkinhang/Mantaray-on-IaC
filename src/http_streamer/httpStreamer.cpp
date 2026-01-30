/**
 * This module captures video from a camera and serves MJPEG stream over HTTP.
 */

#include <opencv2/opencv.hpp>
#include "httplib.h"
#include <thread>
#include <mutex>
#include <atomic>
#include <iostream>
#include <chrono>
#include <condition_variable>

class VideoStreaming {
public:
    VideoStreaming() : frame_available_(false), stop_server_(false), new_frame_(false) {
        // Initialize camera
        bool camera_found = false;
        int max_indices_to_check = 10;

        for (int i = 0; i < max_indices_to_check; ++i) {
            std::string device_path = "/dev/video" + std::to_string(i);
            cap_.open(device_path, cv::CAP_V4L2);
            if (cap_.isOpened()) {
                std::cout << "Success! Camera found and opened at " << device_path << std::endl;
                camera_found = true;
                break;
            }
        }

        if (!camera_found) {
            throw std::runtime_error("Error: Could not find or open any working cameras.");
        }
        
        // Set camera properties for minimal latency
        cap_.set(cv::CAP_PROP_BUFFERSIZE, 1);
        cap_.set(cv::CAP_PROP_FPS, 30);
        cap_.set(cv::CAP_PROP_FOURCC, cv::VideoWriter::fourcc('M','J','P','G'));
        
        setupRoutes();
        capture_thread_ = std::thread(&VideoStreaming::updateFrame, this);
    }
    
    ~VideoStreaming() {
        stop_capture_ = true;
        stop_server_ = true;
        frame_cv_.notify_all();
        
        if (capture_thread_.joinable()) {
            capture_thread_.join();
        }
        
        if (cap_.isOpened()) {
            cap_.release();
        }
    }
    
    void run() {
        std::cout << "Starting HTTP MJPEG stream server on port 5000..." << std::endl;
        server_.listen("0.0.0.0", 5000);
    }

private:
    void setupRoutes() {
        // MJPEG stream endpoint with minimal latency
        server_.Get("/stream", [this](const httplib::Request&, httplib::Response& res) {
            res.set_header("Content-Type", "multipart/x-mixed-replace; boundary=frame");
            res.set_header("Cache-Control", "no-cache, no-store, must-revalidate");
            res.set_header("Pragma", "no-cache");
            res.set_header("Expires", "0");
            res.set_header("Access-Control-Allow-Origin", "*");
            
            res.set_chunked_content_provider(
                "multipart/x-mixed-replace; boundary=frame",
                [this](size_t /*offset*/, httplib::DataSink &sink) {
                    while (!stop_server_) {
                        std::vector<uchar> jpeg_buffer;
                        {
                            std::unique_lock<std::mutex> lock(buffer_mutex_);
                            // Wait for new frame with timeout
                            frame_cv_.wait_for(lock, std::chrono::milliseconds(100), 
                                [this]{ return new_frame_.load() || stop_server_.load(); });
                            
                            if (stop_server_) break;
                            
                            if (!frame_available_ || buffer_.empty()) {
                                continue;
                            }
                            
                            jpeg_buffer = buffer_;
                            new_frame_ = false;
                        }

                        if (!jpeg_buffer.empty()) {
                            std::string boundary = "\r\n--frame\r\n";
                            sink.write(boundary.c_str(), boundary.length());

                            std::string header = "Content-Type: image/jpeg\r\nContent-Length: " + 
                                               std::to_string(jpeg_buffer.size()) + "\r\n\r\n";
                            sink.write(header.c_str(), header.length());
                            sink.write(reinterpret_cast<const char*>(jpeg_buffer.data()), jpeg_buffer.size());
                            sink.write("\r\n", 2);
                        }
                        
                        // No artificial delay - stream frames as fast as they arrive
                    }
                    sink.done();
                    return true;
                },
                [](bool success) {
                    if (!success) {
                        std::cerr << "Streaming failed!" << std::endl;
                    }
                });
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
            
            if (elapsed >= 1) {
                std::cout << "FPS: " << frame_count / elapsed 
                          << ", Frame size: " << frame.cols << "x" << frame.rows << std::endl;
                frame_count = 0;
                last_print_time = now;
            }
            
            // Encode with slightly lower quality for faster encoding
            std::vector<uchar> jpeg_buffer;
            std::vector<int> encode_params = {cv::IMWRITE_JPEG_QUALITY, 75};
            
            if (cv::imencode(".jpg", frame, jpeg_buffer, encode_params)) {
                {
                    std::lock_guard<std::mutex> lock(buffer_mutex_);
                    buffer_ = std::move(jpeg_buffer);
                    frame_available_ = true;
                    new_frame_ = true;
                }
                frame_cv_.notify_all();  // Wake up streams immediately
            } else {
                std::cerr << "Failed to encode frame" << std::endl;
            }
            
            // Minimal delay
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }

    cv::VideoCapture cap_;
    httplib::Server server_;
    std::thread capture_thread_;
    std::vector<uchar> buffer_;
    std::mutex buffer_mutex_;
    std::condition_variable frame_cv_;
    std::atomic<bool> frame_available_;
    std::atomic<bool> new_frame_;
    std::atomic<bool> stop_capture_{false};
    std::atomic<bool> stop_server_;
};

int main() {
    try {
        VideoStreaming streamer;
        streamer.run();
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}