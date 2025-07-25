const fs = require('fs').promises
const path = require('path')

// outputFilePath 내의 모든 파일과 폴더를 삭제하는 함수
async function clearDirectory(directory) {
  if (await fs.stat(directory).catch(() => false)) {
    const files = await fs.readdir(directory)
    await Promise.all(
      files.map(async (file) => {
        const curPath = path.join(directory, file)
        if ((await fs.lstat(curPath)).isDirectory()) {
          await clearDirectory(curPath)
          await fs.rmdir(curPath)
        } else {
          await fs.unlink(curPath)
        }
      })
    )
  }
}

module.exports = clearDirectory
