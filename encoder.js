/*
 * Decoder for NAS LoRaWAN®  IP68 PULSE READER + ANALOG UM3023
 * 
 * Jonas Schwartze - j.schwartze@nibelungen-wohnbau.de
 *
 * This file can be used under any terms and conditions of the MIT Licence.
 * See LICENCE file for details. 
 */



function Encoder(fport, downlink, variables) {
	var bytes = [];
	switch (fport) {
		case 49: //config_request
			bytes = encode_config_request(downlink);
			break;
		case 50: //config_request
			bytes = encode_configuration(downlink);
			break;
		case 51: //config_request
			bytes = encode_update_mode(downlink);
			break;
		default: ;;
	}
	var encoded = [];
	for (var i in bytes) {
		encoded.push(Number(bytes[i]));
	}
	return encoded;
}

var medium_type_valueset = 
	[
		["na","n/a","n.a.","undefined"],
		["pulses","pulse","puls","pulse","impuls","impulse"],
		["water in l","water","wasser in l","wasser"],
		["electricity in wh","electricity","strom in wh","strom"],
		["gas in l","gas"],
		["heat in wh","heat","wärme in wh","wärme","waerme in wh","waerme"]
	];
var operational_mode_valueset = 
	[
		["pulses","pulse","puls","pulse","impuls","impulse"],
		["trigger"]
	];
var reading_mode_valueset = 
	[
		["absolute","absolut"],
		["offset","abweichung"]
	];
var trigger_length_valueset = 
	[
		["1 sec","1sec","1s","1 second"],
		["10 sec","10sec","10s","10","10 seconds"],
		["1 min","1min","1m","1 minute"],
		["1 h","1h","1 hour"]
	];


function is_set_in(key,obj) {
	return ( typeof get(key,obj) !== 'undefined' );
}

function get(key, object) {
	return object[Object.keys(object).filter(function(k) {
		return k.toLowerCase() === key.toLowerCase();
	})[0]];
}

function get_bool(key, obj) {
	return (
				typeof get(key,obj) !== 'undefined' &&
				( 
					(get(key,obj)==="true" ) ||
					(get(key,obj)==="t" ) ||
					(get(key,obj)==="yes" ) ||
					(get(key,obj)==="true" ) ||
					(get(key,obj)===1 ) ||
					(get(key,obj)===true )
				)
		);
}

function encode_config_request(downlink) {
	//always request "general_config_request" except request is of type 
	// "reporting_config_request"
	if ( is_reporting_config_request(downlink) ) {
		return [0];
	} else {
		return [1];
	} 
}

function is_reporting_config_request(downlink) {
	return (
		typeof  get("type", downlink) !== 'undefined' 
		   &&   get("type", downlink) == "reporting_config_request"
		);
}

function encode_configuration(downlink) {
	var conf = [];
	if (is_general_configuration(downlink)) 
	{
		conf = encode_general_configuration(downlink);
	}

	if (is_interface_configuration(downlink)) 
	{
		conf = encode_interface_configuration(downlink);
	}
	return conf;
}

function encode_general_configuration(downlink) {
	var general_configuration = [];
	// Header (Byte 0): fixed to 0x00
	var header_byte = 0;
	general_configuration.push(header_byte);

	// Configuration (Byte 1)
	var usage_interval_sent = ( get_bool("usage_interval_sent", downlink) 
						   && is_set_in("usage_interval", downlink) );
	var status_interval_sent = ( get_bool("status_interval_sent", downlink) 
							&& is_set_in("status_interval", downlink) );
	var usage_config_sent = get_bool("usage_config_sent", downlink);
	
	var configuration_byte = usage_config_sent;
	configuration_byte <<= 1;
	configuration_byte |= status_interval_sent;
	configuration_byte <<= 1;
	configuration_byte |= usage_interval_sent;

	general_configuration.push(configuration_byte);

	// Usage Interval (Bytes 2-3) in min
	if (usage_interval_sent) {
		push_uint16_into( get("usage_interval", downlink), general_configuration);
	}

	// Status Interval (Bytes 4-5) in min
	if (status_interval_sent) {
		push_uint16_into( get("status_interval", downlink), general_configuration);
	}

	// Usage Config (Byte 6)
	if (usage_config_sent) {
		var usage_config_byte = get_bool("usage_without_new_data", downlink);
		general_configuration.push(usage_config_byte);
	}

	return general_configuration;
}

function push_uint16_into(num, bytes) {
	var value = num > 65535 ? 65535 : num;
	bytes.push(value & 0xff);
	bytes.push( (value & 0xff00) >> 8);
}

function push_int16_into(num, bytes) {
	var value = num > 32767 ? 32767 : num;
	value = num < -32768 ? -32768 : num;
	bytes.push(value & 0xff);
	bytes.push( (value & 0xff00) >> 8);
}

function push_uint32_into(num, bytes, max) {
	var int_max = (typeof max == "undefined") ? 4294967295 : max;
	var value = num > int_max ? int_max : num;
	bytes.push(value & 0xff);
	bytes.push( (value & 0xff00) >> 8);
	bytes.push( (value & 0xff0000) >> 16);
	bytes.push( (value & 0xff000000) >> 24);
}

function encode_interface_configuration(downlink) {
	var interface_configuration = [];

	// Header (Byte 0): fixed to 0x01
	var header_byte = 1;
	interface_configuration.push(header_byte);

	// Settings (Byte 1): interface reporting selection
	var settings_byte = 0;
	var analog_2_reporting = ( get_bool("analog_2_reporting", downlink) ||
							   get_bool("analog_2_reported", downlink) );
	settings_byte |= analog_2_reporting;
	settings_byte <<= 1;
	var analog_1_reporting = ( get_bool("analog_1_reporting", downlink) ||
							   get_bool("analog_1_reported", downlink) );
	settings_byte |= analog_1_reporting;
	settings_byte <<= 1;
	var digital_2_reporting = ( get_bool("digital_2_reporting", downlink) ||
								get_bool("digital_2_reported", downlink) );
	settings_byte |= digital_2_reporting;
	settings_byte <<= 1;
	var digital_1_reporting = ( get_bool("digital_1_reporting", downlink) ||
								get_bool("digital_1_reported", downlink) );
	settings_byte |= digital_1_reporting;
	interface_configuration.push(settings_byte);

	// Digital Interface Configuration Block (digital_1)
	if (digital_1_reporting) {
		push_digital_interface_configuration_into(downlink, "digital_1", interface_configuration);
	}
	if (digital_2_reporting) {
		push_digital_interface_configuration_into(downlink, "digital_2", interface_configuration);
	}
	if (analog_1_reporting) {
		push_analog_interface_configuration_into(downlink, "analog_1", interface_configuration);
	}
	if (analog_2_reporting) {
		push_analog_interface_configuration_into(downlink, "analog_2", interface_configuration);
	}

	return interface_configuration; 
}

function push_digital_interface_configuration_into(downlink, interface, config) {
	var configuration_byte = 0;
	var interface_enabled = ( get_bool(interface + "_interface_enabled", downlink) ||
								get_bool(interface + "_interface_enable", downlink) );

	if (!interface_enabled) {
		config.push(configuration_byte);
		return;
	}

	var medium_type = parse_from_valueset( get(interface + "_medium_type", downlink),
	                                       medium_type_valueset, 4);
	var reading_sent = is_set_in(interface + "_reading", downlink);
	var multiplier_sent = ( is_set_in(interface + "_multiplier", downlink) || 
	                        is_set_in(interface + "_divider", downlink) );
	multiplier_sent = multiplier_sent && reading_sent && medium_type !== 0;

	configuration_byte = multiplier_sent ? medium_type : 0;
	configuration_byte <<= 1;
	configuration_byte |= reading_sent;
	configuration_byte <<= 1;
	configuration_byte |= multiplier_sent;
	configuration_byte <<= 1;
	configuration_byte <<= 1;  //byte 1 is RFU
	configuration_byte |= interface_enabled;

	config.push(configuration_byte);

	var mode_byte = 0;
	var operational_mode = parse_from_valueset( get( interface + "_operational_mode", downlink ),
	                                            operational_mode_valueset, 1);
	var device_serial_sent = is_set_in( interface + "_device_serial", downlink );
	var trigger_length = parse_from_valueset( get( interface + "_trigger_length", downlink), 
	                                          trigger_length_valueset, 2 );
	trigger_length = operational_mode == 1 ? trigger_length : 0;

	mode_byte = trigger_length;
	mode_byte <<= 2;
	mode_byte <<= 4; //byte 2-5 are RFU
	mode_byte |= device_serial_sent;
	mode_byte <<=1;
	mode_byte |= operational_mode;

	config.push(mode_byte);

	if (multiplier_sent) {
		push_uint16_into( get( interface + "_multiplier", downlink ) || 1 , config);
		push_uint16_into( get( interface + "_divider", downlink ) || 1, config);
	}

	if (reading_sent) {
		var reading_mode = parse_from_valueset( get( interface + "_reading_mode", downlink),
			                                    reading_mode_valueset, 1);
		if (reading_mode == 0) {
			push_uint32_into( get( interface + "_reading", downlink), config, 999999999);
		} else {
			push_uint16_into( 0xffff, config);
			push_int16_into( get( interface + "_reading", downlink), config);
		}
	}

	if (device_serial_sent) {
		// TODO
	}

}

function parse_from_valueset(value, valueset, bit_length) {
	if ( typeof value == "undefined" ) return 0;

	if (!isNaN(value)) {
		var absolute = Number(value);
		if (typeof bit_length != "undefined" && !isNaN(bit_length)) {
			var max = (Math.pow(bit_length, 2) - 1);
			absolute = absolute > max ? max : absolute;
		}
		return absolute;
	} else {
	   for (var index in valueset) {
		if (valueset[index].indexOf(value.toLowerCase()) >= 0) return index;
	   }
	}

	return 0;
}

function push_analog_interface_configuration_into(downlink, interface, config) {

}

function is_general_configuration(downlink) {
	return (
		typeof  get("type", downlink) !== 'undefined' 
		   &&   get("type", downlink) == "general_configuration"
		);
}

function is_interface_configuration(downlink) {
	return (
		typeof  get("type", downlink) !== 'undefined' 
		   &&   get("type", downlink) == "interface_configuration"
		);
}

function encode_update_mode(downlink) {
	var encoded = [];

	return encoded;
}

function encode_debug_boot(downlink) {
	var encoded = [];

	return encoded;
}

function bufferToHex(buffer, group) {
	var s = '', h = '0123456789ABCDEF';
	for (var byte = 0; byte < buffer.length; byte++) {
		s += h[buffer[byte] >> 4] + h[buffer[byte] & 15];
		s += group?" ":"";
	};
	return s;
}

// Encode encodes the given object into an array of bytes.
//  - fPort contains the LoRaWAN fPort number
//  - obj is an object, e.g. {"temperature": 22.5}
//  - variables contains the device variables e.g. {"calibration": "3.5"} (both the key / value are of type string)
// The function must return an array of bytes, e.g. [225, 230, 255, 0]
function Encode(fPort, obj, variables) {
	var encoded = Encoder(fPort, obj, variables);
	return encoded;
}


/************************************************************/
/*** REMOVE THIS PART FOR USE AS CHIRPSTACK DEVICE CODEC  ***/
/***                                                      ***/
/*** Direct node.js CLU wrapper                           ***/
/************************************************************/
try {
const fs = require("fs");

const jsonString = fs.readFileSync(process.argv[2]);
const downlink = JSON.parse(jsonString);

var fPort = 49;
if (typeof process.argv[3] !== 'undefined' && process.argv[3] ) {
	fPort = Number(process.argv[3]);
}
console.log("Downlink:")
console.info (downlink);
console.log ("fPort:" + fPort);
console.log();

var bytes = Encoder(fPort, downlink);

console.log("bytes: " + bytes);
console.log("bytes (bin):");
console.log("  [");
for (var index in bytes ) {
	console.log("    " 
				+ Number(bytes[index]).toString(2).padStart(8, '0') 
				+ (index==bytes.length-1?"":",")
			   );
}
console.log("  ]");

console.log("bytes (hex): " + bufferToHex(bytes,true));
} catch(err) {
	console.log(err);
}

