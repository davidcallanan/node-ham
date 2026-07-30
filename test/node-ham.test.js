import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { create_ham } from "@davidcal/node-ham";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

let tmp_dir;
let ham;

beforeEach(async () => {
	tmp_dir = await fs.mkdtemp(path.join(os.tmpdir(), "node-ham-test-"));
	ham = await create_ham({}, { path: tmp_dir });
});

afterEach(async () => {
	await fs.rm(tmp_dir, { recursive: true, force: true });
});

describe("node-ham.create_ham", () => {
	it("writes and reads back a value", async () => {
		const key = new TextEncoder().encode("hello");
		const value = new TextEncoder().encode("world");

		const entry = await ham.open(key);
		await entry.write(value);
		const result = await entry.read();
		await entry.close();

		expect(result).toEqual(value);
	});

	it("returns undefined when reading a key that has never been written", async () => {
		const key = new TextEncoder().encode("nonexistent");
		const entry = await ham.open(key);
		const result = await entry.read();
		await entry.close();

		expect(result).toEqual(undefined);
	});

	it("overwrites a value with a new write", async () => {
		const key = new TextEncoder().encode("overwrite-key");
		const value1 = new TextEncoder().encode("first");
		const value2 = new TextEncoder().encode("second");

		const entry = await ham.open(key);
		await entry.write(value1);
		await entry.write(value2);
		const result = await entry.read();
		await entry.close();

		expect(result).toEqual(value2);
	});

	it("persists a value across separate open calls", async () => {
		const key = new TextEncoder().encode("persist-key");
		const value = new TextEncoder().encode("persisted-value");

		const entry1 = await ham.open(key);
		await entry1.write(value);
		await entry1.close();

		const entry2 = await ham.open(key);
		const result = await entry2.read();
		await entry2.close();

		expect(result).toEqual(value);
	});

	it("preserves binary data exactly", async () => {
		const key = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe]);
		const value = new Uint8Array([0x00, 0x80, 0xff, 0x7f, 0x01]);

		const entry = await ham.open(key);
		await entry.write(value);
		const result = await entry.read();
		await entry.close();

		expect(result).toEqual(value);
	});

	it("writing undefined removes the value", async () => {
		const key = new TextEncoder().encode("delete-key");
		const value = new TextEncoder().encode("to-be-deleted");

		const entry = await ham.open(key);
		await entry.write(value);
		await entry.write(undefined);
		const result = await entry.read();
		await entry.close();

		expect(result).toEqual(undefined);
	});

	it("writing undefined on a key that was never written leaves it undefined", async () => {
		const key = new TextEncoder().encode("never-written");

		const entry = await ham.open(key);
		await entry.write(undefined);
		const result = await entry.read();
		await entry.close();

		expect(result).toEqual(undefined);
	});
});
