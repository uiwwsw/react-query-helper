const fs = require('fs').promises
const path = require('path')
const chokidar = require('chokidar')
const processFolder = require('./process-folder.cjs')

const directoryPath = path.join(__dirname, '../libs')
const outputFilePath = path.join(__dirname, '../src/options')

async function handleFileChange(filePath) {
  const folder = path.basename(path.dirname(filePath))
  console.log(`📄 파일이 변경되었습니다: ${filePath}`)
  await processFolder(folder)
  console.log(`✅ ${folder} 폴더의 변경 사항을 처리했습니다.`)
}

async function handleFileUnlink(filePath) {
  const folder = path.basename(path.dirname(filePath))

  const fileName = path.basename(filePath, '.ts')
  const outputFile = path.join(outputFilePath, folder, `${fileName}Options.ts`)

  try {
    await fs.unlink(outputFile)
    console.log(`🗑️ ${outputFile} 파일을 성공적으로 삭제했습니다.`)
  } catch (err) {
    console.error(`❌ ${outputFile} 파일을 삭제하는 중 오류가 발생했습니다: ${err}`)
  }
}

function watchDirectory(directory) {
  const watcher = chokidar.watch(directory, {
    persistent: true,
    ignoreInitial: true,
  })

  watcher
    .on('add', handleFileChange)
    .on('change', handleFileChange)
    .on('unlink', handleFileUnlink)
    .on('error', (error) => console.error(`❌ 와치 중 오류가 발생했습니다: ${error}`))

  console.log(`👀 ${directory} 폴더를 와치 중입니다.`)
}

watchDirectory(directoryPath)
