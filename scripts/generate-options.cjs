const fs = require('fs').promises
const path = require('path')
const clearDirectory = require('./clear-directory.cjs')
const processFolder = require('./process-folder.cjs')
const directoryPath = path.join(__dirname, '../libs')
const outputFilePath = path.join(__dirname, '../src/options')

async function main() {
  try {
    const folders = await fs.readdir(directoryPath)
    console.log('📂 ./libs 폴더를 찾았습니다!')

    // outputFilePath 내의 모든 파일과 폴더를 삭제
    await clearDirectory(outputFilePath)
    console.log('🧹 ./src/options 기존 파일을 삭제했습니다.')

    await Promise.all(folders.map(processFolder))

    console.log('✅ ./src/options 업데이트를 완료되었습니다!')
  } catch (err) {
    console.error(`❌ 오류가 발생했습니다: ${err}`)
  }
}

main()
