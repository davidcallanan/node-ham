const max_data_length = 8192;
const min_data_length = 1024; // to help with block distribution

const encode_copy = (dependencies, data) => {
	const padded_length = Math.max(data.length, min_data_length);
	const payload = new Uint8Array(2 + padded_length);
	
	payload[0] = (data.length >>> 8) & 0xFF;
	payload[1] = data.length & 0xFF;
	payload.set(data, 2);
	
	const checksum = dependencies.CRC32.buf(payload) >>> 0;
	const out = new Uint8Array(4 + payload.length);
	
	out[0] = (checksum >>> 24) & 0xFF;
	out[1] = (checksum >>> 16) & 0xFF;
	out[2] = (checksum >>> 8) & 0xFF;
	out[3] = checksum & 0xFF;
	out.set(payload, 4);
	
	return out;
};

export const ecc_encode = (dependencies, data) => {
	if (!(data instanceof Uint8Array)) {
		throw new Error("Provided `data` must be Uint8Array.");
	}
	
	if (data.length > max_data_length) {
		throw new Error(`Provided \`data\` too long: ${data.length} > ${max_data_length}.`);
	}

	const copy = encode_copy(dependencies, data);
	const out = new Uint8Array(copy.length * 3);
	out.set(copy, 0);
	out.set(copy, copy.length);
	out.set(copy, copy.length * 2);
	return out;
};
