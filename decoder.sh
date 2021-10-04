#!/bin/sh

set -x

if [ "$2" = "" ]; then
	FPORT=25
else
	FPORT="$2"
fi

HEX=$( echo -n "$1" | base64 -d | od -t x8 -An --endian=big | sed "s/0000$//" | sed "s/ *//g" )
node decoder.js "$HEX" "$FPORT"