#!/bin/bash
set -e

# Source the ROS 2 and workspace setup files
source /opt/ros/jazzy/setup.bash
source /ros2_ws/install/setup.bash

export PYTHONPATH="/ros2_ws/.venv/lib/python3.12/site-packages:$PYTHONPATH"

# Execute the command passed into the container
exec "$@"