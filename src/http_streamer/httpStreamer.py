"""This module captures video from a camera and serves the image over HTTP."""

import cv2
from flask import Flask, Response
import threading


class VideoStreaming:
    """Class for capturing images from the camera."""

    def __init__(self):
        """Initialize the video streaming."""
        self.app: Flask = Flask(__name__)
        self.cap = cv2.VideoCapture(0)

        # Set camera properties for better performance
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize latency
        self.cap.set(cv2.CAP_PROP_FPS, 25)        # Set FPS
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M','J','P','G'))

        # Check if the camera is opened successfully
        if not self.cap.isOpened():
            raise RuntimeError("Could not open camera.")
        self.buffer = None  # Initialize buffer
        # Start the Flask server in a separate thread
        self.setup_routes()

       
        threading.Thread(target=self.run_server).start()
        self.update_frame()

    def setup_routes(self):
        # Define routes for image upload and AUV info update
        self.app.add_url_rule('/video_feed', 'video_feed', self.video_feed, methods=['GET'])
            
    def run_server(self):
        """Run the Flask server."""
        self.app.run(host='0.0.0.0', port=5000, threaded=True)

    
    def video_feed(self):
        """Return a single video frame."""
        frame = self.get_frame()
        return Response(frame, mimetype='image/jpeg')

    def update_frame(self):
        """Continuously capture frames from the camera and save to buffer."""
        while True:
            success, frame = self.cap.read()  # Read the camera frame
            # print size
            print(f"Captured frame size: {frame.shape[1]}x{frame.shape[0]}")
            if not success:
                raise RuntimeError("Failed to capture image.")
            else:
                # Encode the frame in JPEG format
                ret, self.buffer = cv2.imencode('.jpg', frame)

    def get_frame(self):
        """Return the latest frame from the buffer."""
        if self.buffer is None:
            raise RuntimeError("No frame available.")
        return self.buffer.tobytes()  # Return the frame
