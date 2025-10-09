import rclpy
from rclpy.node import Node
from std_msgs.msg import String, Bool

MORSE_CODE_DICT = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----'
}

class MorseCodeNode(Node):
    def __init__(self):
        super().__init__('morse_code_publisher_node')
        self.publisher_ = self.create_publisher(String, '/morse_signal_sequence', 10)
        self.text_subscription = self.create_subscription(
            String,
            '/text_to_morse',
            self.listener_callback,
            10)
        
        # Subscriber for acknowledgment
        self.ack_subscription = self.create_subscription(
            String,
            '/blink/ack',
            self._ack_received_callback,
            10)
        
        self.get_logger().info('Morse Code Node started. Waiting for text on /text_to_morse...')

        self.last_signal_sequence = ""
        self.waiting_for_ack = False
        self.ack_timer = None
        self.resend_attempts = 0
        
        self.declare_parameter('max_resend_attempts', 3)
        # Renamed from ack_timeout_duration_seconds
        self.declare_parameter('ack_base_timeout_seconds', 3.0) 
        self.declare_parameter('morse_unit_time_ms', 200) # Matches MORSE_UNIT_TIME_MS in C++
        self.declare_parameter('min_ack_timeout_seconds', 2.0) # Minimum timeout
        
        self.max_resend_attempts = self.get_parameter('max_resend_attempts').get_parameter_value().integer_value
        self.ack_base_timeout_seconds = self.get_parameter('ack_base_timeout_seconds').get_parameter_value().double_value
        self.morse_unit_time_ms = self.get_parameter('morse_unit_time_ms').get_parameter_value().integer_value
        self.min_ack_timeout_seconds = self.get_parameter('min_ack_timeout_seconds').get_parameter_value().double_value

    def listener_callback(self, msg):
        self.get_logger().info(f'Received text: "{msg.data}"')
        
        # If currently waiting for an ack for a previous message, cancel it.
        if self.ack_timer is not None and not self.ack_timer.is_canceled():
            self.ack_timer.cancel()
            self.get_logger().info('Previous transmission/ack wait cancelled for new message.')
        
        self.waiting_for_ack = False # Reset ack waiting state
        
        signal_sequence_str = self._text_to_signal_sequence(msg.data)
        
        if signal_sequence_str:
            self.last_signal_sequence = signal_sequence_str
            self.resend_attempts = 0
            self._send_signal_and_arm_timer()
        else:
            self.get_logger().info('No signal sequence to send for the given text.')
            self.last_signal_sequence = "" # Clear any old sequence

    def _send_signal_and_arm_timer(self):
        if not self.last_signal_sequence:
            self.get_logger().info('No signal sequence to send.')
            return

        morse_msg = String()
        morse_msg.data = self.last_signal_sequence
        self.publisher_.publish(morse_msg)
        
        # Calculate dynamic timeout
        estimated_processing_time_seconds = (len(self.last_signal_sequence) * self.morse_unit_time_ms) / 1000.0
        dynamic_ack_timeout = estimated_processing_time_seconds + self.ack_base_timeout_seconds
        
        # Ensure timeout is not less than the minimum
        actual_timeout_duration = max(dynamic_ack_timeout, self.min_ack_timeout_seconds)

        log_prefix = "Sent" if self.resend_attempts == 0 else f"Resent (attempt {self.resend_attempts})"
        self.get_logger().info(
            f'{log_prefix} signal sequence (Length: {len(self.last_signal_sequence)}). '
            f'Waiting for ack (timeout: {actual_timeout_duration:.2f}s)...'
        )
        
        self.waiting_for_ack = True
        
        # Cancel existing timer before creating a new one
        if self.ack_timer is not None and not self.ack_timer.is_canceled():
            self.ack_timer.cancel()
        
        self.ack_timer = self.create_timer(actual_timeout_duration, self._handle_ack_timeout)

    def _ack_received_callback(self, ack_msg):
        if self.waiting_for_ack:
            self.get_logger().info(f'Acknowledgment received: "{ack_msg.data}". Signal transmission successful.')
            self.waiting_for_ack = False
            if self.ack_timer is not None and not self.ack_timer.is_canceled():
                self.ack_timer.cancel()
            self.last_signal_sequence = "" # Clear the sequence as it's confirmed
        else:
            # This might happen if an ack arrives late, after a timeout or for a new message
            self.get_logger().info(f'Received an unexpected or late acknowledgment: "{ack_msg.data}".')


    def _handle_ack_timeout(self):
        # This timer is intended to be one-shot for each attempt.
        # Cancel it first, as it's periodic by default.
        if self.ack_timer is not None and not self.ack_timer.is_canceled():
            self.ack_timer.cancel() 
            # self.get_logger().debug('Ack timer fired and cancelled itself.')


        if self.waiting_for_ack: # If still waiting (ack not received)
            self.resend_attempts += 1
            if self.resend_attempts <= self.max_resend_attempts:
                self.get_logger().warn(f'Acknowledgment timeout. Resending signal (attempt {self.resend_attempts}/{self.max_resend_attempts})...')
                self._send_signal_and_arm_timer() # This will create a new timer for the new attempt
            else:
                self.get_logger().error(f'Max resend attempts ({self.max_resend_attempts}) reached for signal: {self.last_signal_sequence}. Giving up.')
                self.waiting_for_ack = False
                self.last_signal_sequence = "" # Clear the sequence
        # If not waiting_for_ack, it means ack was received just before timer callback logic ran, or state was reset.
        # No action needed in that case.

    def _text_to_signal_sequence(self, text):
        """
        Converts a text string to its Morse code signal sequence.
        '1' represents an ON state for one time unit.
        '0' represents an OFF state for one time unit.
        - Dot: "1"
        - Dash: "111"
        - Intra-character space (between dots/dashes): "0"
        - Inter-character space (between letters): "000"
        - Inter-word space (between words): "0000000"
        """
        if not text.strip(): # If text is empty or only spaces
            self.get_logger().info("Input text is empty or only spaces, no signal generated.")
            return ""

        char_sequences = []
        input_string_upper = text.upper()

        for char_code_inner in input_string_upper:
            if char_code_inner == ' ':
                # Use a special marker for word space, to be replaced later by 7 '0's
                # Only add if it's a meaningful space (not multiple spaces together leading to multiple markers)
                if char_sequences and char_sequences[-1] != '/':
                    char_sequences.append('/') 
            elif char_code_inner in MORSE_CODE_DICT:
                morse_char_str = MORSE_CODE_DICT[char_code_inner]
                current_mark_sequence = []
                for k_inner, mark_inner in enumerate(morse_char_str):
                    if mark_inner == '.':
                        current_mark_sequence.append("1")
                    elif mark_inner == '-':
                        current_mark_sequence.append("111") # Dash is 3 units ON
                    
                    # Intra-character space (1 unit OFF) if not the last mark of the character
                    if k_inner < len(morse_char_str) - 1:
                        current_mark_sequence.append("0")
                char_sequences.append("".join(current_mark_sequence))
            else:
                self.get_logger().warn(f"Character '{char_code_inner}' not in Morse dictionary, skipped.")

        if not char_sequences: # All characters were unknown or spaces that didn't form a sequence
            return ""

        final_signal_list = []
        for i_seq, seq_item in enumerate(char_sequences):
            if seq_item == '/': # If current item is a word separator marker
                # If it's the first thing (e.g. leading space) or follows another space, skip to avoid multiple word spaces
                if not final_signal_list or final_signal_list[-1] == "0000000": 
                    continue
                final_signal_list.append("0000000") # Inter-word space (7 units OFF)
            else: # It's a letter's sequence
                final_signal_list.append(seq_item)
                # Add inter-character or prepare for inter-word space if not the last element
                if i_seq < len(char_sequences) - 1:
                    if char_sequences[i_seq+1] != '/': # Next is another letter
                        final_signal_list.append("000") # Inter-character space (3 units OFF)
                    # If next is '/', the space will be handled when '/' is processed
        
        final_sequence_str = "".join(final_signal_list)

        # Ensure the sequence ends with an OFF state if it was ON, or if it's not empty
        if final_sequence_str and final_sequence_str[-1] == '1':
            final_sequence_str += "0"
        elif not final_sequence_str and text: # e.g. input was "!" (all unknown)
             pass # No valid signal generated
        
        return final_sequence_str

def main(args=None):
    rclpy.init(args=args)
    morse_code_node = MorseCodeNode()
    try:
        rclpy.spin(morse_code_node)
    except KeyboardInterrupt:
        morse_code_node.get_logger().info('Keyboard interrupt, shutting down...')
    finally:
        if morse_code_node.ack_timer is not None and not morse_code_node.ack_timer.is_canceled():
            morse_code_node.ack_timer.cancel()
        morse_code_node.destroy_node()
        rclpy.shutdown()

if __name__ == "__main__":
    main()