/*
 * Decoder for NAS LoRaWAN®  IP68 PULSE READER + ANALOG UM3023
 * 
 * Jonas Schwartze - j.schwartze@nibelungen-wohnbau.de
 *
 * This file can be used under any terms and conditions of the MIT Licence.
 * See LICENCE file for details. 
 */



function Encoder(fport, obj, variables) {
	var encoded = [];
	switch (fport) {
		case 49: //config_request
			encoded = encode_config_request(obj);
			break;
		case 50: //config_request
			encoded = encode_configuration(obj);
			break;
		case 51: //config_request
			encoded = encode_update_mode(obj);
			break;
		default: ;;
	}
	return encoded;
}

function encode_config_request(bytes) {
	//always request "general_config_request" except a 
	// "reporting_config_request" is directly request 
	if ( typeof bytes.reporting_config_request !== 'undefined' 
			&&  bytes.reporting_config_request ) {
		return [0];
	} else {
		return [1];
	} 
}

function encode_configuration(obj) {
	var encoded = [];

	return encoded;
}

function encode_update_mode(obj) {
	var encoded = [];

	return encoded;
}

function encode_debug_boot(obj) {
	var encoded = [];

	return encoded;
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
console.log (downlink);
console.log (fPort);

console.log(Encoder(fPort, downlink));

} catch(err) {}

