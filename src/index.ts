import * as fs from "fs";
import * as path from "path";

export const isWindows = process.platform === "win32";
const pathSeparator = isWindows ? ";" : ":";
const defaultPathExt = isWindows ? [".com", ".exe", ".bat", ".cmd"] : [""];

export async function safeWhich(program: string): Promise<string> {
	if (program.includes("/") || (program.includes("\\") && isWindows)) {
		// If the path contains slashes it's either absolute or relative and should not be searched for.
		return program;
	}

	let pathValue = process.env.PATH;
	if (pathValue === undefined) {
		throw new Error(`Could not resolve program ${program} because no PATH environment variable was set.`);
	}
	let searchPaths = pathValue.split(pathSeparator);
	let pathExts = defaultPathExt;
	if (isWindows && process.env.PATHEXT !== undefined) {
		pathExts = process.env.PATHEXT.split(pathSeparator);
	}

	for (let searchPath of searchPaths) {
		for (let pathExt of pathExts) {
			let completePath = path.join(searchPath, program + pathExt);
			try {
				await fs.promises.access(completePath, fs.constants.X_OK);
				return completePath;
			}
			catch (err) {
				if (typeof err === "object" && err !== null && 'code' in err) {
					if (err.code === "ENOTDIR") {
						console.warn(`While resolving program ${program}, skipping ${searchPath} ` + 
							"because it is not a directory.");
						break;
					}
					if (err.code === "ENOENT") {
						continue;
					}
				}
				throw err;
			}
		}
	}

	throw new Error(`Could not find program ${program} on PATH.`);
}
