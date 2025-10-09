# --- Build Stage ---
# This stage installs dependencies, builds the workspace, and installs Python packages.
FROM ros:jazzy-ros-base AS builder

WORKDIR /ros2_ws

# Install build tools and pip
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-venv \
    libevdev-dev \
    ros-dev-tools \
    # Add C++ dependencies from your CMakeLists.txt
    libopencv-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a Python virtual environment and activate it for clean package installation
ENV VENV_PATH=/opt/venv
RUN python3 -m venv $VENV_PATH
ENV PATH="$VENV_PATH/bin:$PATH"

# Install Python packages from requirements.txt into the venv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy and build the ROS 2 workspace
COPY ./src ./src
# Build serial first, then source and build the rest
RUN ["/bin/bash", "-c", " \
    source /opt/ros/jazzy/setup.bash && \
    echo '--- Building serial dependency first ---' && \
    colcon build --packages-select serial && \
    echo '--- Sourcing the local workspace to find the new package ---' && \
    source install/setup.bash && \
    echo '--- Building all remaining packages ---' && \
    colcon build && \
    source install/setup.bash \
"]

# Build the C++ nodes
RUN ["/bin/bash", "-c", "cmake -S src/http_streamer -B src/http_streamer/build && cmake --build src/http_streamer/build"]

# --- Final Stage ---
# This stage creates the small, final image for running the nodes.
FROM ros:jazzy-ros-base

# Install only the RUNTIME dependencies needed
RUN apt-get update && apt-get install -y \
    libopencv-core* \
    libopencv-imgproc* \
    libopencv-imgcodecs* \
    libopencv-highgui* \
    libcurl4 \
    libssl3 \
    ros-jazzy-foxglove-bridge \
    && rm -rf /var/lib/apt/lists/*

# # Create the 'input' group with the specific GID to match the host
RUN groupadd --gid 995 input

WORKDIR /ros2_ws

# Copy installed Python packages from the builder's virtual environment
COPY --from=builder /opt/venv/lib/python3.12/site-packages /usr/lib/python3/dist-packages

# Copy the built ROS 2 workspace from the builder stage
COPY --from=builder /ros2_ws/install ./install

# Copy the other launch files to run directly in src
COPY --from=builder /ros2_ws/src/launch_file /ros2_ws/src/launch_file

# Copy the microros folder
COPY --from=builder /ros2_ws/src/microRos /ros2_ws/src/microRos

# Copy the compiled C++ executables into a directory in the PATH
COPY --from=builder /ros2_ws/src/http_streamer/build/httpGetImage /usr/local/bin/
COPY --from=builder /ros2_ws/src/http_streamer/build/httpGetImage_cam /usr/local/bin/

# Copy and set up the entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh   # - ./src:/ros2_ws/src
ENTRYPOINT ["/entrypoint.sh"]

# Default command if none is provided
CMD ["bash"]