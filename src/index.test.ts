import test from "ava";
import { safeWhich, isWindows } from "./index";
import * as os from "os";
import * as path from "path";

const originalEnv = process.env;
const originalWorkingDirectory = process.cwd();
const testResources = path.resolve(path.join("src", "index.test"));

test.beforeEach(_ => {
	process.env = {...originalEnv};
});

test.afterEach(_ => {
	process.env = originalEnv;
	process.chdir(originalWorkingDirectory);
});

test("relative path with forward-slash is returned as-is", async (t) => {
	process.env.PATH = path.join(testResources, "path");
	t.deepEqual(await safeWhich("./anything"), "./anything");
});

test("absolute path with forward-slash is returned as-is", async (t) => {
	process.env.PATH = path.join(testResources, "path");
	t.deepEqual(await safeWhich("/usr/bin/anything"), "/usr/bin/anything");
});

test("binaries in cwd are not returned", async (t) => {
	process.env.PATH = path.join(testResources, "empty");
	process.chdir(path.join(testResources, "path"));
	await t.throwsAsync(safeWhich("program"));
	await t.throwsAsync(safeWhich("has-an-extension"));
	await t.throwsAsync(safeWhich("has-an-extension.exe"));
});

if (isWindows) {
	test("program is found if on path with correct extension preference", async (t) => {
		process.env.PATH = path.join(testResources, "path");
		process.env.PATHEXT = ".com;.exe";
		t.deepEqual(await safeWhich("has-an-extension"), path.join(testResources, "path", "has-an-extension.com"));
		process.env.PATHEXT = ".exe;.com";
		t.deepEqual(await safeWhich("has-an-extension"), path.join(testResources, "path", "has-an-extension.exe"));
	});

	test("program is not found if no extension", async (t) => {
		process.env.PATH = path.join(testResources, "path");
		await t.throwsAsync(safeWhich("program"));
	});

	test("relative path with backward-slash is returned as-is", async (t) => {
		process.env.PATH = path.join(testResources, "path");
		t.deepEqual(await safeWhich(".\\anything"), ".\\anything");
	});
	
	test("absolute path with backward-slash is returned as-is", async (t) => {
		process.env.PATH = path.join(testResources, "path");
		t.deepEqual(await safeWhich("C:\\Python27\\python.exe"), "C:\\Python27\\python.exe");
	});
	
	test("path order is respected", async (t) => {
		process.env.PATHEXT = ".com;.exe;.bat";
		process.env.PATH = path.join(testResources, "path") + ";" + path.join(testResources, "second-path");
		t.deepEqual(await safeWhich("has-an-extension"), path.join(testResources, "path", "has-an-extension.com"));
		process.env.PATH = path.join(testResources, "second-path") + ";" + path.join(testResources, "path");
		t.deepEqual(await safeWhich("has-an-extension"), path.join(testResources, "second-path", "has-an-extension.bat"));
	});
}
else {
	test("program is found if on path and executable", async (t) => {
		process.env.PATH = path.join(testResources, "path");
		t.deepEqual(await safeWhich("program"), path.join(testResources, "path", "program"));
	});

	test("does not throw if a non-directory file is on the search path", async (t) => {
		process.env.PATH = path.join(testResources, "path/program") + path.delimiter + path.join(testResources, "path");
		t.deepEqual(await safeWhich("program"), path.join(testResources, "path", "program"));
	});

	test("program is not found if not executable", async (t) => {
		process.env.PATH = path.join(testResources, "path");
		await t.throwsAsync(safeWhich("non-executable-file"));
	});

	test("path order is respected", async (t) => {
		process.env.PATH = path.join(testResources, "path") + ":" + path.join(testResources, "second-path");
		t.deepEqual(await safeWhich("program"), path.join(testResources, "path", "program"));
		process.env.PATH = path.join(testResources, "second-path") + ":" + path.join(testResources, "path");
		t.deepEqual(await safeWhich("program"), path.join(testResources, "second-path", "program"));
	});
}
