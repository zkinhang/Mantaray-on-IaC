import serial.tools.list_ports
import serial
import time
import numpy as np
import argparse
import sys
from serial.tools.list_ports_common import ListPortInfo

class ThrusterBoard:
    def __init__(self, port, baudrate=115200, mapping=None) -> None:
        self.ser = serial.Serial(port, baudrate, timeout=1/60)
        self.data = ""
        
        if mapping is not None:
            self.mapping = np.array(mapping)
        else:
            # Default mapping for standalone testing if not specified via CLI
            self.mapping = np.array([-4, 2, 3, -1, -5, -8, 6, 7])
        
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
        print(f"Active Mapping Config: {self.mapping}")

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
        # Apply mapping: determine internal index and direction sign
        abs_mapping = np.abs(self.mapping) - 1
        after_mapping = power_matrix[abs_mapping]
        power_matrix = np.clip(after_mapping, -1, 1)
        for i in range(8):
            sign = -1 if self.mapping[i] < 0 else 1
            # Protocol: (127 * power * sign) + 128 - 5 (Center at ~123-128)
            output_power = max(0, min((127 * power_matrix[i] * sign) + 128 - 5, 255))
            data_send += int(output_power).to_bytes(1, 'little')
        data_send += b'\xAA'
        self.write(data_send)
        return self.read()

    def stop_all(self):
        """Force stop all thrusters immediately."""
        print("\nSafety Protocol: Shutting down all motors...")
        self.set_Thruster(np.zeros(8))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Mantaray Integrated Thruster Testing Utility')
    # Use 0 as the ID for "All Thrusters" mode
    parser.add_argument('thruster', type=int, choices=range(0, 9), 
                        help='Thruster ID (1-8) or 0 to test ALL units simultaneously')
    parser.add_argument('--power', type=float, default=0.3, 
                        help='Power level (range -1.0 to 1.0), default 0.3')
    parser.add_argument('--mapping', type=str, 
                        help='Custom mapping array as string (e.g., "-4,2,3,-1,-5,-8,6,7")')
    parser.add_argument('--hw_id', type=str, default="1A86:7523", 
                        help='Target device HW ID (VID:PID)')
    args = parser.parse_args()

    # Parse mapping if provided via CLI
    custom_mapping = None
    if args.mapping:
        try:
            custom_mapping = [int(x.strip()) for x in args.mapping.split(',')]
            if len(custom_mapping) != 8:
                raise ValueError("Mapping array must contain exactly 8 elements.")
        except Exception as e:
            print(f"Mapping Parse Error: {e}")
            sys.exit(1)

    # Device Discovery
    ports: list[ListPortInfo] = serial.tools.list_ports.comports()
    board = None
    for port, desc, hw_id in sorted(ports):
        # Match by HW ID or Fallback to USB0
        if args.hw_id in hw_id or "USB0" in port:
            print(f"Connecting to device at {port}...")
            board = ThrusterBoard(port, mapping=custom_mapping)
            break
            
    if board is None:
        print("Error: No compatible thruster board found. Check hardware.")
        sys.exit(1)

    mode_desc = f"ALL THRUSTERS" if args.thruster == 0 else f"THRUSTER {args.thruster}"
    print(f"Starting test for {mode_desc} at power {args.power}. Press Ctrl+C to terminate.")
    
    while True:
        test_array = np.zeros(8)
        if args.thruster == 0:
            # All-Active Mode: Deploy full force across the board
            test_array = np.ones(8) * args.power
        else:
            # Targeted Mode: Test individual unit
            test_array[args.thruster - 1] = args.power
        
        print(f"Testing thruster {args.thruster} at {args.power} power")
        data = board.set_Thruster(test_array)
        print(data)
    