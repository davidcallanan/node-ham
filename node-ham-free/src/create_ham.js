import { ecc_decode } from "./ecc_decode.js";
import { ecc_encode } from "./ecc_encode.js";
import { create_lock } from "./uoe/create_lock.js";
import { create_promise } from "./uoe/create_promise.js";
import { promisify } from "node:util";

const max_key_length = 8192;
const max_value_length = 8192;

/**
 * Creates a persistent,atomic,durable key-value store over a Linux filesystem.
 * 
 * Three POSIX files are used internally (`a.dat`, `b.dat`, and `t.dat`) to ensure atomicity.
 * 
 * This implementation favours reliability and durability over performance. If you perform more than 50 writes per second in a system that has competing work to do, you should assess the performance degradation.
 * 
 * Often, Ham can be used to bootstrap a better primitive.
 */
export const create_ham = async (dependencies, options) => {
	const open = async (key) => {
		if (!(key instanceof Uint8Array)) {
			throw new Error("Provided `key` must be Uint8Array.");
		}
		
		if (key.length > max_key_length) {
			throw new Error(`Provided \`key\` too long: ${key.length} > ${max_key_length}.`);
		}
		
		const write_lock = create_lock();
		
		const key_hex = Array.from(key).map((b) => b.toString(16).padStart(2, "0")).join("");
		
		const path_base = dependencies.path.join(options.path, key_hex);
		
		await dependencies.fs.mkdir(path_base, { recursive: true });
		
		const fd_lock = await dependencies.fs.open(dependencies.path.join(path_base, "access.lock"), "w");
		
		const fcntl = promisify(dependencies["fs-ext"].fcntl);
		
		try {
			await fcntl(fd_lock.fd, dependencies["fs-ext"].constants.F_SETLK, dependencies["fs-ext"].constants.F_WRLCK);
		} catch (error) {
			await fd_lock.close();
			
			throw new Error(`Lock could not be acquired. This may be because the lock is already held by another process. Refrain from deleting 'access.lock' as this may cause corruption. Please identify the process holding the lock and kill it.\n\nCaused by:\n\n${error.message}`);
		}
		
		const path_a = dependencies.path.join(path_base, "a.dat");
		const path_b = dependencies.path.join(path_base, "b.dat");
		const path_t = dependencies.path.join(path_base, "t.dat");
		
		const _recover = async () => {
			await dependencies.fs.rm(path_t, { force: true });
			
			try {
				var b_stat = await dependencies.fs.stat(path_b);
			} catch (e) {
				if (e.code !== "ENOENT") {
					throw e;
				}
			}
			
			if (b_stat !== undefined) {
				if (!b_stat.isFile()) {
					throw new Error("Assertion failed: inode in the way.");
				}

				await dependencies.fs.rm(path_a, { force: true });
				await dependencies.fs.rename(path_b, path_a);
			}
		};
		
		const read = async () => {
			return await write_lock.acquire(async () => {
				await _recover();
				
				try {
					var data = await dependencies.fs.readFile(path_a);
				} catch (e) {
					if (e.code === "ENOENT") {
						return undefined;
					}
					
					throw e;
				}
				const decoded = ecc_decode(dependencies, new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
				
				return decoded;
			});
		};
		
		const write = async (value) => {
			return await write_lock.acquire(async () => {
				if (value === undefined) {
					await _recover();
					
					await dependencies.fs.rm(path_a, { force: true });
					
					const fd_base = await dependencies.fs.open(path_base, "r");	
					
					try {
						await dependencies.fsync_dir(fd_base.fd);
					} catch (e) {
						await fd_base.close();
						
						throw new Error(`Failed to sync changes with disk. Ensure you are using Linux.\n\nCaused by:\n\n${e.message}`);
					}
					
					await fd_base.close();
					
					return;
				}

				if (!(value instanceof Uint8Array)) {
					throw new Error("Provided `value` must be Uint8Array.");
				}
				
				if (value.length > max_value_length) {
					throw new Error(`Provided \`value\` too long: ${value.length} > ${max_value_length}.`);
				}
				
				await _recover();
				
				const encoded = ecc_encode(dependencies, value);
				
				const fd = await dependencies.fs.open(path_t, "w");
				
				await fd.write(encoded, 0, encoded.length, 0);
				await fd.sync();
				await fd.close();
				
				await dependencies.fs.rename(path_t, path_b);
				
				const fd_base = await dependencies.fs.open(path_base, "r");	
				
				try {
					await dependencies.fsync_dir(fd_base.fd);
				} catch (e) {
					await fd_base.close();
					
					throw new Error(`Failed to sync changes with disk. Ensure you are using Linux.\n\nCaused by:\n\n${e.message}`);
				}
				
				await fd_base.close();
				
				await _recover();
			});
		};
		
		const close = () => {
			const [promise, res, rej] = create_promise();
			
			write_lock.acquire(() => new Promise(async () => {
				try {
					await fd_lock.close();
				} catch (e) {
					rej(e);
				}
				
				res();
			}));
			
			return promise;
		};
			
		return {
			read,
			write,
			close,
		};
	};
	
	return {
		open,
	};
};
