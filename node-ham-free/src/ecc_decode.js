const max_data_length = 8192;
const min_data_length = 1024;

const decode_copy = (dependencies, copy) => {
	const checksum_a = ((copy[0] << 24) | (copy[1] << 16) | (copy[2] << 8) | copy[3]) >>> 0;
	const payload = copy.subarray(4);
	const checksum_b = dependencies.CRC32.buf(payload) >>> 0;
	
	if (checksum_a !== checksum_b) {
		return undefined;
	}
	
	const length = (payload[0] << 8) | payload[1];
	
	if (length > payload.length - 2) {
		return undefined;
	};
	
	return payload.subarray(2, 2 + length);
};

const bitwise_compare = (a, b) => {
	if (a.length !== b.length) {
		return false;
	}

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	
	return true;
};


export const ecc_decode = (dependencies, data) => {
	if (!(data instanceof Uint8Array)) {
		throw new Error("Provided `data` must be Uint8Array.");
	}

	if (data.length < (4 + 2 + min_data_length) * 3 || (data.length % 3) !== 0) {
		throw new Error("Unrecoverable corrupt data [00].");
	}
	
	if (data.length > (4 + 2 + max_data_length) * 3) {
		throw new Error("Unrecoverable corrupt data [01].");
	}

	const copy_length = data.length / 3;
	
	const copies = [
		data.subarray(0, copy_length),
		data.subarray(copy_length, copy_length * 2),
		data.subarray(copy_length * 2),
	].map((copy) => decode_copy(dependencies, copy)).filter((c) => c !== undefined);

	if (copies.length === 0) {
		throw new Error("Unrecoverable corrupt data [02].");
	}
	
	if (copies.length === 1) {
		return copies[0];
	}

	let winner = undefined;
	
	outer:
	for (let i = 0; i < copies.length; i++) {
		for (let j = 0; j < copies.length; j++) {
			if (i !== j && bitwise_compare(copies[i], copies[j])) {
				winner = copies[i];
				break outer;
			}
		}
	}

	if (winner === undefined) {
		throw new Error("Unrecoverable corrupt data [03].");
	}

	return winner;
};
