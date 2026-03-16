import serial.tools.list_ports
import serial
import time
import numpy as np
import argparse
from serial.tools.list_ports_common import ListPortInfo


class ThrusterBoard:
    # --- MODIFIED __init__ to accept mapping ---
    def __init__(self, port, baudrate=115200, mapping=None) -> None:
        self.ser = serial.Serial(port, baudrate, timeout=1/60)
        self.data = ""
        
        if mapping is not None:
            self.mapping = np.array(mapping)
        else:
            # Default mapping for standalone testing
            self.mapping = np.array([-4,2,3,-1,-5,-8,6,7])
        
        """
        Thruster config
        [1,2]
        [5,6]
        [7,8]
        [3,4]
        """
        self.ratio_preset = [
            0, 0,  # 1,2
            0, 0,  # 3,4
            0, 0,  # 5,6
            0, 0,  # 7,8
        ]
        self.depth: float | None = None
        self.depth_log = []
        print(f"ThrusterBoard initialized on port {port} at {baudrate} baud.")

    def read(self) -> bytes:
        """Read data from thruster board

        Returns:
            bytes: data received from thruster board
        """
        temp = self.ser.readline()
        self.data = temp
        try:
            self.ser.flushInput()
            self.ser.flushOutput()
            decodeMSG = self.data.decode('utf-8')
            # remove \r\n
            decodeMSG = decodeMSG.replace('\r\n', '')
            depth = float(decodeMSG.split("P:")[1])
            if depth > 0:
                self.depth_log.append(depth)
                print("depth : ", self.depth)
                if len(self.depth_log) > 2:
                    self.depth = np.mean(self.depth_log)
                    # clear
                    self.depth_log = []
            print("depth : ", self.depth)
        except Exception as e:
            print(e)
        return self.data

    def write(self, data: bytes) -> None:
        """Write data to thruster board

        Args:
            data (bytes): data to be sent to thruster board
        """
        self.ser.write(data)

    def set_Thruster(self, power_matrix: np.array) -> bytes:
        """Set thruster power

        Args:
            power_matrix (np.array): 8x1 matrix of thruster power
            e.g forward -> np.array([1.0, 1.0, 1.0, 1.0,-1.0, -1.0, -1.0, -1.0])
        Returns:
            bytes: data received from thruster board
        """
        data_send = b'\xFF'
        abs_mapping = np.abs(self.mapping) - 1
        after_mapping = power_matrix[abs_mapping]
        power_matrix = np.clip(after_mapping, -1, 1)
        for i in range(8):
            sign = -1 if self.mapping[i] < 0 else 1
            output_power = max(0,min((127 * power_matrix[i] * sign) + 128 - 5, 255))
            data_send += int(output_power).to_bytes(1, 'little')
        data_send += b'\xAA'
        self.write(data_send)
        return self.read()

# Run this script directly for standalone thruster testing
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Test individual thrusters')
    parser.add_argument('thruster', type=int, choices=range(0, 9),
                       help='Thruster number (1-8) to test, or 0 for ALL')
    parser.add_argument('--power', type=float, default=0.3,
                       help='Power level (0-1), default 0.3')
    args = parser.parse_args()

    # list all available ports and connect to device with VID:PID = 1A86:7523
    ports: list[ListPortInfo] = serial.tools.list_ports.comports()
    board = None
    board_hw_id = "1A86:7523" # Hardcoded for standalone test
    port_name = "USB0"       # Hardcoded for standalone test
    
    for port, desc, hw_id in sorted(ports):
        print(f"{port}: {desc} [{hw_id}]")
        if board_hw_id in hw_id or port_name in port:
            print(f"Found device, connecting to {port}...")
            board = ThrusterBoard(port) # Uses default mapping for test
            break
            
    if board is None:
        print("Device not found")
        exit(1)

    while True:
        test_array = np.zeros(8)
        if args.thruster == 0:
            # All Start: apply same power to all 8 thrusters
            test_array[:] = args.power
        else:
            # Single thruster test
            test_array[args.thruster - 1] = args.power

        print(f"Testing thruster {args.thruster} at {args.power} power")
        data = board.set_Thruster(test_array)
        print(data)
        # time.sleep(0.1)
        
