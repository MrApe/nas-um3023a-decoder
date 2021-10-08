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

function is_set_in(key,obj) {
	return ( typeof obj[key] !== 'undefined' );
}

function get_bool(key, obj) {
	return (
				typeof obj[key] !== 'undefined' &&
				( 
					(obj[key]==="true" ) ||
					(obj[key]==="t" ) ||
					(obj[key]==="yes" ) ||
					(obj[key]==="true" ) ||
					(obj[key]===1 ) ||
					(obj[key]===true )
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
		typeof downlink.type !== 'undefined' 
		   &&  downlink.type == "reporting_config_request"
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
	var configuration = [];
	// Header (Byte 0): fixed to 0x00
	var header_byte = 0;
	configuration.push(header_byte);

	// Configuration (Byte 1)
	var usage_interval_sent = ( get_bool("usage_interval_sent", downlink) 
						   && is_set_in("usage_interval", downlink) );
	var status_interval_sent = ( get_bool("status_interval_sent", downlink) 
						 	&& is_set_in("status_interval", downlink) );
	var usage_config_sent = get_bool("usage_config_sent", downlink);
	
	var configuration_byte = usage_interval_sent;
	configuration_byte <<= 1;
	configuration_byte |= status_interval_sent;
	configuration_byte <<= 1;
	configuration_byte |= usage_config_sent;

	configuration.push(configuration_byte);

	// Usage Interval (Bytes 2-3) in min
	if (usage_interval_sent) {
		push_interval_into(downlink.usage_interval, configuration);
	}

	// Status Interval (Bytes 4-5) in min
	if (status_interval_sent) {
		push_interval_into(downlink.status_interval, configuration);
	}

	// Usage Config (Byte 6)
	if (usage_config_sent) {
		var usage_config_byte = get_bool("usage_without_new_data", downlink);
		configuration.push(usage_config_byte);
	}

	return configuration;
}

function push_interval_into(num, bytes) {
	var interval = num > 65535 ? 65535 : num;
	interval_byte_1 = interval & 0xff;
	bytes.push(interval_byte_1);
	interval_byte_2 = interval >> 8;
	bytes.push(interval_byte_2);
}

function encode_interface_configuration(downlink) {
	var interface_configuration = [];
	return interface_configuration;	
}

function is_general_configuration(downlink) {
	return (
		typeof downlink.type !== 'undefined' 
		   &&  downlink.type == "general_configuration"
		);
}

function is_interface_configuration(downlink) {
	return (
		typeof downlink.type !== 'undefined' 
		   &&  downlink.type == "interface_configuration"
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
} catch(err) {}

