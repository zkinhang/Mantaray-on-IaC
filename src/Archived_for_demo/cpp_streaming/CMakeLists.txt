cmake_minimum_required(VERSION 3.8)
project(cpp_streaming)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Find dependencies
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(cv_bridge REQUIRED)
find_package(OpenCV REQUIRED)

# Create executable
add_executable(opencv_node src/opencv_node.cpp)
target_include_directories(opencv_node PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>
  ${cv_bridge_INCLUDE_DIRS}
  /opt/ros/jazzy/include
)

# Link libraries
target_link_libraries(opencv_node
  ${OpenCV_LIBRARIES}
  ${cv_bridge_LIBRARIES}
)

ament_target_dependencies(opencv_node
  rclcpp
  sensor_msgs
  cv_bridge
  OpenCV
)

# Install
install(TARGETS opencv_node
  DESTINATION lib/${PROJECT_NAME})

ament_package() 
