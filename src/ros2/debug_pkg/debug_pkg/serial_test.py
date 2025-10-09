import serial
import serial.tools.list_ports
import serial

mc_hw_id = "1A86:7523"

def main():
    try:
        # initalization for the serial connection
        print(f'Initalizing serial connection')
        ports = serial.tools.list_ports.comports()
        microcontroller = None
        for port, desc, hw_id in sorted(ports):
            print(f"{port}: {desc} [{hw_id}]")
            if mc_hw_id in hw_id:
                print(f"Port initalization: ok")
                microcontroller = serial.Serial(port, 115200, timeout=1)
                print(f"Serial connection ok")
                print(f"Start listening commands and serial write")
                break
        if microcontroller is None:
            print(f"Port initalization: Device not found")
            exit(1)

        while True:
            result = microcontroller.readline().decode('utf-8').strip()
            print(result)
    except serial.SerialException as e:
        print(f'Error reading data: {e}')
    except KeyboardInterrupt:
        print("Program interrupted by user")

if __name__ == '__main__':
    main()