const fs = require('fs').promises
const path = require('path')
const { spawn } = require('child_process')

// Execute a shell command with admin privileges and return its output
function execShellCommand(cmd, args = [], admin = false) {
  return new Promise((resolve, reject) => {
    let command = cmd
    if (admin) {
      command = `powershell -Command "Start-Process cmd -ArgumentList '/c ${cmd} ${args.join(' ')}' -Verb RunAs"`
      args = []
    }
    const process = spawn(command, args, { shell: true })

    let output = ''
    let errorOutput = ''

    process.stdout.on('data', (data) => {
      output += data.toString()
    })

    process.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}\n${errorOutput}`))
      } else {
        resolve(output.trim())
      }
    })

    process.on('error', (err) => {
      reject(new Error(`Failed to start command: ${err.message}`))
    })
  })
}

;(async function main() {
  const currentVersion = await execShellCommand('node', ['-v'])
  const nvmrcVersion = await fs.readFile(path.join(__dirname, '../.nvmrc'), 'utf8')
  const expectedVersion = nvmrcVersion.trim()

  if (currentVersion === expectedVersion) {
    console.log(`✅ 적용된 node 버전 ${currentVersion}`)
    return
  }

  try {
    console.log(`✅ Node.js 버전이 변경되었습니다: ${currentVersion} -> ${expectedVersion}`)
    await execShellCommand('nvm', ['use', expectedVersion])
  } catch (error) {
    console.log('nvm에 해당 버전이 없습니다. 설치를 시도합니다.')
    await execShellCommand('nvm', ['install', expectedVersion])
    console.log(`✅ Node.js 버전이 변경되었습니다: ${currentVersion} -> ${expectedVersion}`)
    await execShellCommand('nvm', ['use', expectedVersion])
  }
})()
