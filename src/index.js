import { create_ham as create_ham__free } from "@davidcal/node-ham-free";
import * as path from "node:path";
import { fsync } from "node:fs";
import * as fs from "node:fs/promises";
import * as fs_ext from "fs-ext";
import * as CRC32 from "crc-32";
import { promisify } from "node:util";

/**
 * Creates a persistent,atomic,durable key-value store over a Linux filesystem.
 * 
 * Three POSIX files are used internally (`a.dat`, `b.dat`, and `t.dat`) to ensure atomicity.
 * 
 * This implementation favours reliability and durability over performance. If you perform more than 50 writes per second in a system that has competing work to do, you should assess the performance degradation.
 * 
 * Often, Ham can be used to bootstrap a better primitive.
 */
export const create_ham = (dependencies, options) => {
	return create_ham__free({
		path,
		fs,
		"fs-ext": fs_ext,
		CRC32,
		fsync_dir: promisify(fsync),
		...dependencies,
	}, options);
};

export const createHam = create_ham;
