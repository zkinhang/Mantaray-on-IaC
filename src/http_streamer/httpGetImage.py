import cv2
import requests
import numpy as np

def fetch_and_display_image():
    while True:
        try:
            response = requests.get('http://rov.local:5000/video_feed')
            if response.status_code == 200:
                # Convert the response content to a numpy array and then to an image
                image_array = np.frombuffer(response.content, np.uint8)
                image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

                # Display the image
                image = cv2.flip(image, 0)  # Flip the image vertically

                cv2.imshow("Video Feed", image)

                # Exit on 'q' key
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            else:
                print(f"Failed to fetch image: {response.status_code}")
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    fetch_and_display_image()
