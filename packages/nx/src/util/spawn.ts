import { spawn as _spawn } from "child_process"

export async function spawn(...cmd: string[]) {
    const command = cmd[0]
    const args = cmd.slice(1)
    return new Promise<number>(resolve => {
        const proc = _spawn(command, args)
        proc.stdout.on("data", data => process.stdout.write(data))
        proc.stderr.on("data", data => process.stderr.write(data))
        proc.on("exit", resolve)
    })
}
