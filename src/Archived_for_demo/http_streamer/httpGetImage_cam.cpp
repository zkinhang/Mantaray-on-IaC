/**
 * This module fetches images from an HTTP server, displays them,
 * and re-streams them via a new HTTP server.
 */

#include <opencv2/opencv.hpp>
#include <curl/curl.h>
#include <chrono>
#include <iostream>
#include <vector>
#include <atomic>
#include <thread>
#include <mutex>
#define CPPHTTPLIB_OPENSSL_SUPPORT // If you need HTTPS support and have OpenSSL installed
#include "httplib.h" // Include the cpp-httplib header

// Global variables for the HTTP server
httplib::Server svr;
std::mutex frame_mutex;
std::vector<uchar> current_frame_jpeg;
std::atomic<bool> stop_server{false};

// Callback function for CURL to write received data
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t realsize = size * nmemb;
    std::vector<uchar>* mem = static_cast<std::vector<uchar>*>(userp);
    
    size_t prev_size = mem->size();
    mem->resize(prev_size + realsize);
    memcpy(&(*mem)[prev_size], contents, realsize);
    
    return realsize;
}

int main() {
    // --- HTTP Server Setup ---
    svr.Get("/stream", [](const httplib::Request &, httplib::Response &res) {
        res.set_header("Content-Type", "multipart/x-mixed-replace; boundary=frame");
        res.set_chunked_content_provider(
            "multipart/x-mixed-replace; boundary=frame",
            [](size_t /*offset*/, httplib::DataSink &sink) {
                std::vector<uchar> jpeg_buffer;
                while (!stop_server) {
                    {
                        std::lock_guard<std::mutex> lock(frame_mutex);
                        if (!current_frame_jpeg.empty()) {
                            jpeg_buffer = current_frame_jpeg; // Make a copy
                        }
                    } // Mutex released here

                    if (!jpeg_buffer.empty()) {
                        std::string boundary = "\r\n--frame\r\n";
                        sink.write(boundary.c_str(), boundary.length());

                        std::string header = "Content-Type: image/jpeg\r\nContent-Length: " + std::to_string(jpeg_buffer.size()) + "\r\n\r\n";
                        sink.write(header.c_str(), header.length());
                        sink.write(reinterpret_cast<const char*>(jpeg_buffer.data()), jpeg_buffer.size());
                        sink.write("\r\n", 2);
                        jpeg_buffer.clear(); // Clear the copy for the next iteration
                    }
                    // Control streaming rate
                    std::this_thread::sleep_for(std::chrono::milliseconds(33)); // ~30 FPS
                }
                sink.done();
                return true; // Return true to indicate success
            },
            [](bool success) {
                // Optional: Callback after stream finishes or fails
                if (!success) {
                    std::cerr << "Streaming failed!" << std::endl;
                }
            });
    });

    // Start server in a separate thread
    std::thread server_thread([&]() {
        std::cout << "Starting MJPEG stream server on http://0.0.0.0:8081/stream" << std::endl;
        if (!svr.listen("0.0.0.0", 8081)) { // Use a different port, e.g., 8081
             std::cerr << "Failed to start HTTP server on port 8081" << std::endl;
        }
    });
    // Detach or join later depending on desired behavior on exit
    // For now, we'll join it during cleanup

    // --- End HTTP Server Setup ---


    // Initialize CURL
    curl_global_init(CURL_GLOBAL_ALL);
    CURL* curl = curl_easy_init();
    
    if (!curl) {
        std::cerr << "Failed to initialize CURL" << std::endl;
        return 1;
    }
    
    // Configure CURL for better performance
    curl_easy_setopt(curl, CURLOPT_URL, "http://rov-cam-streamer-service:5000/video_feed");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 2L);            // 2-second timeout
    curl_easy_setopt(curl, CURLOPT_TCP_KEEPALIVE, 1L);      // Enable TCP keepalive
    curl_easy_setopt(curl, CURLOPT_FORBID_REUSE, 0L);       // Allow connection reuse
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);           // Don't use signals for timeout
    curl_easy_setopt(curl, CURLOPT_TCP_FASTOPEN, 1L);       // Use TCP Fast Open if available
    
    // Create window for displaying images
    cv::namedWindow("Video Feed CAM", cv::WINDOW_AUTOSIZE); // Changed window name slightly
    
    // Variables for FPS calculation
    auto last_fps_time = std::chrono::steady_clock::now();
    int frame_count = 0;
    
    // Pre-allocate buffer to avoid reallocations
    std::vector<uchar> buffer;
    buffer.reserve(1024 * 1024);  // Reserve 1MB initially
    
    while (true) {
        try {
            // Clear buffer for new image
            buffer.clear();
            
            // Set buffer for data to be written to
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &buffer);
            
            // Perform the request
            CURLcode res = curl_easy_perform(curl);
            if (res != CURLE_OK) {
                std::cerr << "Failed to fetch image: " << curl_easy_strerror(res) << std::endl;
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
                continue;
            }
            
            // Convert buffer to image
            cv::Mat image = cv::imdecode(buffer, cv::IMREAD_COLOR);
            if (image.empty()) {
                std::cerr << "Failed to decode image" << std::endl;
                continue;
            }
            
            // Flip image vertically (as in the Python code)
            // cv::flip(image, image, 0);
            
            // Resize the image to a larger size
            cv::Mat resized_img;
            double scale_factor = 1.5;
            cv::resize(image, resized_img, cv::Size(), scale_factor, scale_factor, cv::INTER_LINEAR);

            // --- Update Frame for HTTP Server ---
            std::vector<int> params = {cv::IMWRITE_JPEG_QUALITY, 90};
            std::vector<uchar> encoded_jpeg;
            cv::imencode(".jpg", resized_img, encoded_jpeg, params);

            { // Lock scope
                std::lock_guard<std::mutex> lock(frame_mutex);
                current_frame_jpeg = std::move(encoded_jpeg); // Move data efficiently
            }
            // --- End Update Frame ---

            // Display the image
            cv::imshow("Video Feed CAM", resized_img); // Use updated window name
            
            // Calculate and display FPS
            frame_count++;
            auto now = std::chrono::steady_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - last_fps_time).count();
            
            if (elapsed >= 1) {
                double fps = static_cast<double>(frame_count) / elapsed;
                std::cout << "FPS: " << fps << std::endl;
                frame_count = 0;
                last_fps_time = now;
            }
            
            // Check for 'q' key (exit)
            int key = cv::waitKey(1);
            if (key == 'q' || key == 'Q') {
                break;
            }
        }
        catch (const std::exception& e) {
            std::cerr << "Error: " << e.what() << std::endl;
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
    
    // Clean up
    std::cout << "Stopping server..." << std::endl;
    stop_server = true; // Signal the server thread to stop
    svr.stop();         // Stop the server listening loop
    if (server_thread.joinable()) {
        server_thread.join(); // Wait for the server thread to finish
    }
    std::cout << "Server stopped." << std::endl;

    curl_easy_cleanup(curl);
    curl_global_cleanup();
    cv::destroyAllWindows();
    
    return 0;
}
