import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(__dirname, "../..");
export const reposRoot = path.join(projectRoot, "repos");
export const dataRoot = path.join(projectRoot, "data");
export const tmpRoot = path.join(projectRoot, "tmp");
export const uploadRoot = path.join(tmpRoot, "uploads");

export const port = Number(process.env.PORT || 3001);
export const maxZipBytes = 500 * 1024 * 1024;
