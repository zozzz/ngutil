import { spawn } from "./spawn"

export async function commit(message: string, paths: string[]) {
    for (const p of paths) {
        await spawn("git", "add", p)
    }

    const exitCode = await spawn("git", "diff-index", "--quiet", "HEAD")
    if (exitCode !== 0) {
        await spawn("git", "commit", "-m", message)
    }
}
