/*
 * Decoder for NAS LoRaWAN®  IP68 PULSE READER + ANALOG UM3023
 * 
 * Jonas Schwartze - j.schwartze@nibelungen-wohnbau.de
 *
 * This file can be used under any terms and conditions of the MIT Licence.
 * See LICENCE file for details. 
 */

function Decoder(bytes, fport) {
	var decoded = {};
	switch (fport) {
		case 24: //status
			decoded = decode_status(bytes);
			break;
		case 25: //usage
			decoded = decode_usage(bytes);
			break;
		case 49: //config_request
			decoded = decode_config_request(bytes);
			break;
		case 99: //debug_boot
			decoded = decode_debug_boot(bytes);
			break;
	}
	decoded.bytes = bytes;
	decoded.fport = fport;
	return decoded;
}

function decode_status(bytes) {
	var decoded = {};
	decoded.digital_1_reported = bytes[0] >> 0 & 1 == 1;
	decoded.digital_2_reported = bytes[0] >> 1 & 1 == 1;
	decoded.digital_3_reported = bytes[0] >> 2 & 1 == 1;
	decoded.digital_4_reported = bytes[0] >> 3 & 1 == 1;
	decoded.user_triggered_packet = bytes[0] >> 6 & 1 == 1;
	decoded.active_alerts = bytes[0] >> 7 & 1 == 1;
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
		decoded[reported_inputs[input]+"_operational_mode"] = bytes[input+1] >> 0 & 1 == 1;
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
		var value = Buffer.from(bytes.slice(from, to)).readUInt32LE();
		decoded[reported_inputs[input]] = value;
	}
	
	return decoded; 
}

function decode_config_request(bytes) {
	var decoded = {};
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

