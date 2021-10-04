/*
 * Decoder for NAS LoRaWAN®  IP68 PULSE READER + ANALOG UM3023
 * 
 * Jonas Schwartze - j.schwartze@nibelungen-wohnbau.de
 *
 * This file can be used under any terms and conditions of the MIT Licence.
 * See LICENCE file for details. 
 */

function Decoder(b, fport) {
	var decoded = {};
	var bytes = [];
	for (var i in b) {
		bytes.push(b[i]);
	}
	switch (fport) {
		case 24: //status
			decoded = decode_status(bytes.slice());
			decoded.type="status";
			break;
		case 25: //usage
			decoded = decode_usage(bytes.slice());
			decoded.type="usage";
			break;
		case 49: //config_request
			decoded = decode_config_request(bytes.slice());
			break;
		case 99: //debug_boot
			decoded = decode_debug_boot(bytes.slice());
			decoded.type="debug_boot";
			break;
	}
	decoded.bytes = "0x"+ bufferToHex(b);
	decoded.size = b.length;
	decoded.fport = fport;
	return decoded;
}

function decode_status(bytes) {
	var decoded = {};
	var byte_index = 0;
	var inputs = 
			{
				digital_1: { name:"digital_1", payload_size: 8, index: 0 },
				digital_2: { name:"digital_2", payload_size: 8, index: 1 },
				analog_1: { name:"analog_1",  payload_size: 8, index: 2 },
				analog_2: { name:"analog_2", payload_size: 8, index: 3 }
			};
	var reported_inputs = [];
	for (var input in inputs) {
		decoded[input + "_reported"] = bytes[0] >> inputs[input].index & 1 == 1;
		if (decoded[input + "_reported"]) {
			reported_inputs.push(input);
		}
	}
	decoded.user_triggered_packet = bytes[byte_index] >> 6 & 1 == 1;
	decoded.active_alerts = bytes[byte_index] >> 7 & 1 == 1;
	if (decoded.active_alerts) {
		byte_index++;
		decoded.digital_interface_alert = bytes[byte_index] >> 0 & 1 == 1;
		decoded.secondary_interface_alert = bytes[byte_index] >> 1 & 1 == 1;
		decoded.temperature_alert = bytes[byte_index] >> 2 & 1 == 1;
	}
	byte_index++;
	decoded.battery_percentage = (bytes[byte_index] - 1) / 2.54;
	byte_index++;
	decoded.battery_index = bytes[byte_index];
	byte_index++;
	decoded.mcu_temp = bytes[byte_index];
	byte_index++;
	decoded.min_mcu_temp = ( bytes[byte_index] & 15 ) * -2;
	decoded.max_mcu_temp = ( bytes[byte_index] >> 4 ) * 2;
	byte_index++;
	decoded.downlink_rssi = bytes[byte_index] * -1;

	byte_index++;
	for (var input in reported_inputs) {
		decoded[reported_inputs[input]+"_input_state"] = 
				bytes[byte_index+input] >> 0 & 1 == 1;
		decoded[reported_inputs[input]+"_input_state_string"] = 
				decoded[reported_inputs[input]+"_input_state"]?"closed":"open";
		decoded[reported_inputs[input]+"_operational_mode"] = 
				bytes[byte_index+input] >> 1 & 1 == 1;
		decoded[reported_inputs[input]+"_operational_mode_string"] = 
				decoded[reported_inputs[input]+"_operational_mode"]?"trigger_mode":"pulse_mode";
		decoded[reported_inputs[input]+"_alert_state"] = 
				bytes[byte_index+input] >> 2 & 1 == 1;
		decoded[reported_inputs[input]+"_alert_state_string"] = 
		decoded[reported_inputs[input]+"_alert_state"]?"on":"off";
		decoded[reported_inputs[input]+"_device_serial_sent"] = 
		bytes[byte_index+input] >> 3 & 1 == 1;
		decoded[reported_inputs[input]+"_medium_type"] = 
				bytes[byte_index+input] >> 4;
		switch (decoded[reported_inputs[input]+"_medium_type"]) {
			case 0: decoded[reported_inputs[input]+"_medium_type_string"] = "n/a_"; break; 
			case 1: decoded[reported_inputs[input]+"_medium_type_string"] = "pulses_"; break;
			case 2: decoded[reported_inputs[input]+"_medium_type_string"] = "water_L"; break;
			case 3: decoded[reported_inputs[input]+"_medium_type_string"] = "electricity_Wh"; break;
			case 4: decoded[reported_inputs[input]+"_medium_type_string"] = "gas_L"; break;
			case 5: decoded[reported_inputs[input]+"_medium_type_string"] = "heat_Wh"; break;
			default: decoded[reported_inputs[input]+"_medium_type_string"] = ""; break;
		}
		var payload_size = inputs[reported_inputs[input]].payload_size;
		var from = byte_index + 1 + ( Number(input) * payload_size ) + Number(input);
		var to = from + payload_size;
		var hex = bytes.slice(from, to);
		var value = parseInt(bufferToHex(hex.reverse()),16);
		decoded[reported_inputs[input]] = value;
	}
	//TODO: report other bytes
	return decoded; 
}

function decode_usage(bytes) {
	var decoded = {};
	var inputs = 
				{
					digital_1: { name:"digital_1", payload_size: 4, index: 0 },
					digital_2: { name:"digital_2", payload_size: 4, index: 1 },
					analog_1: { name:"analog_1",  payload_size: 8, index: 2 },
					analog_2: { name:"analog_2", payload_size: 8, index: 3 }
				};
	var reported_inputs = [];
	for (var input in inputs) {
		decoded[input + "_reported"] = bytes[0] >> inputs[input].index & 1 == 1;
		if (decoded[input + "_reported"]) {
			reported_inputs.push(input);
		}
	}
	
	for (var input in reported_inputs) {
		decoded[reported_inputs[input]+"_input_state"] = bytes[input+1] >> 0 & 1 == 1;
		decoded[reported_inputs[input]+"_input_state_string"] = decoded[reported_inputs[input]+"_input_state"]?"closed":"open";
		decoded[reported_inputs[input]+"_operational_mode"] = bytes[input+1] >> 1 & 1 == 1;
		decoded[reported_inputs[input]+"_operational_mode_string"] = decoded[reported_inputs[input]+"_operational_mode"]?"trigger_mode":"pulse_mode";
		decoded[reported_inputs[input]+"_medium_type"] = bytes[input+1] >> 4;
		switch (decoded[reported_inputs[input]+"_medium_type"]) {
			case 0: decoded[reported_inputs[input]+"_medium_type_string"] = "n/a_"; break; 
			case 1: decoded[reported_inputs[input]+"_medium_type_string"] = "pulses_"; break;
			case 2: decoded[reported_inputs[input]+"_medium_type_string"] = "water_L"; break;
			case 3: decoded[reported_inputs[input]+"_medium_type_string"] = "electricity_Wh"; break;
			case 4: decoded[reported_inputs[input]+"_medium_type_string"] = "gas_L"; break;
			case 5: decoded[reported_inputs[input]+"_medium_type_string"] = "heat_Wh"; break;
			default: decoded[reported_inputs[input]+"_medium_type_string"] = ""; break;
		}
		var payload_size = inputs[reported_inputs[input]].payload_size;
		var from = 2 + ( Number(input) * payload_size ) + Number(input);
		var to = from + payload_size;
		var hex = bytes.slice(from, to);
		var value = parseInt(bufferToHex(hex.reverse()),16);
		
		decoded[reported_inputs[input]] = value;
	}
	
	return decoded; 
}

function decode_config_request(bytes) {
	var decoded = {};
	decoded.message_header = bytes[0];
	switch (decoded.message_header) {
		case 0: decoded.type = "reporting_config_request"; break;
		case 1: decoded.type = "general_config_request"; break;
		default: decoded.type = "config_request";
	}
	decoded.usage_interval = parseInt(bufferToHex(bytes.slice(1, 3)),16);
	decoded.status_interval = parseInt(bufferToHex(bytes.slice(2, 4).reverse()),16);
	decoded.usage_sent = bytes[4] >> 0 & 1 == 1;
	decoded.usage_sent_string = decoded.usage_sent?"always":"if new data";
	return decoded; 
}

function decode_debug_boot(bytes) {
	var decoded = {};
	return decoded; 
}


function merge(obj1, obj2) {
	for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
	return obj1;
}

function bcdtonumber(bytes) {
	var num = 0;
	var m = 1;
	var i;
	for (i = 0; i < bytes.length; i++) {
		num += (bytes[bytes.length - 1 - i] & 0x0F) * m;
		num += ((bytes[bytes.length - 1 - i] >> 4) & 0x0F) * m * 10;
		m *= 100;
	}
	return num;
}

function bufferToHex(buffer) {
    var s = '', h = '0123456789ABCDEF';
    for (var byte = 0; byte < buffer.length; byte++) {
		s += h[buffer[byte] >> 4] + h[buffer[byte] & 15]; 
	};
    return s;
}

function bytestofloat16(bytes) {
    var sign = (bytes & 0x8000) ? -1 : 1;
    var exponent = ((bytes >> 7) & 0xFF) - 127;
    var significand = (bytes & ~(-1 << 7));

    if (exponent == 128) 
        return 0.0;

    if (exponent == -127) {
        if (significand == 0) return sign * 0.0;
        exponent = -126;
        significand /= (1 << 6);
    } else significand = (significand | (1 << 7)) / (1 << 7);

    return sign * significand * Math.pow(2, exponent);
}

// Chirpstack decoder wrapper
function Decode(fPort, bytes, variables) {
	var decoded = Decoder(bytes, fPort, variables);
	return merge(decoded, variables);
}

// Direct node.js CLU wrapper (payload bytestring as argument)
try {
    console.log(Decoder(Buffer.from(process.argv[2], 'hex'), Number(process.argv[3])) );
} catch(err) {}