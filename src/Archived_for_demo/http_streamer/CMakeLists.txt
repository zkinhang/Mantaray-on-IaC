cmake_minimum_required(VERSION 3.10)
project(http_streamer)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable optimizations
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")

# Find packages
find_package(OpenCV REQUIRED)
find_package(CURL REQUIRED)
find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

# Include directories
include_directories(
  include
  ${OpenCV_INCLUDE_DIRS}
  ${CURL_INCLUDE_DIRS}
)

# HTTP Server
add_executable(httpStreamer httpStreamer.cpp)
target_link_libraries(httpStreamer
  ${OpenCV_LIBS}
  ${CMAKE_THREAD_LIBS_INIT}
)

# HTTP Client
add_executable(httpGetImage httpGetImage.cpp)
target_link_libraries(httpGetImage
  ${OpenCV_LIBS}
  ${CURL_LIBRARIES}
  ${CMAKE_THREAD_LIBS_INIT}
  Threads::Threads # Add this for pthread
  OpenSSL::SSL     # Add this
  OpenSSL::Crypto  # Add this
)

# HTTP Client 2
add_executable(httpGetImage_cam httpGetImage_cam.cpp)
target_link_libraries(httpGetImage_cam
  ${OpenCV_LIBS}
  ${CURL_LIBRARIES}
  ${CMAKE_THREAD_LIBS_INIT}
  Threads::Threads # Add this for pthread
  OpenSSL::SSL     # Add this
  OpenSSL::Crypto  # Add this
)

# Install
install(TARGETS httpStreamer httpGetImage httpGetImage_cam
  DESTINATION bin)
