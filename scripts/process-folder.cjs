const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process') // Add this line
const directoryPath = path.join(__dirname, '../libs')
const outputFilePath = path.join(__dirname, '../src/options')

// 특정 폴더에서 domain.ts를 제외한 모든 .ts 파일을 읽어 함수로 출력하는 스크립트
async function processFolder(folder) {
  const domainFolder = path.join(directoryPath, folder)
  const isDirectoryDomainFolder = await fs.lstat(domainFolder).catch(() => false)

  if (!isDirectoryDomainFolder || !isDirectoryDomainFolder.isDirectory()) return

  const files = await fs.readdir(domainFolder).catch((err) => {
    console.error(`❌ ./libs에 특정 파일이 오류가 있는 것 같아요: ${err}`)
  })

  await Promise.all(
    files.map(async (file) => {
      if (file !== 'domain.ts' && file !== 'adaptor.ts' && path.extname(file) === '.ts') {
        const content = await fs.readFile(path.join(domainFolder, file), 'utf8')
        const fileName = file.replace('.ts', '')
        const regex = /^(?<!\/\/\s*|\/\*\s*)export\s+(?:const\s+(\w+)\s*=\s*(?:async\s*)?|function\s+(\w+))\s*\(/gm
        const matches = content.matchAll(regex)
        const functionsNames = []

        let newContent = ''

        for (const match of matches) {
          const functionName = match[1] || match[2]
          if (!functionName) continue

          const folderName = path.basename(domainFolder)
          const key = `["${folderName}","${functionName}"]`
          const exportKey = `export const ${functionName}Key = ${key};`
          const exportQuery = `export const ${functionName}QueryOption = queryOption(${functionName}Key,${functionName});`
          const exportMutation = `export const ${functionName}MutationOption = mutationOption(${functionName}Key,${functionName});`
          const exportInfinite = `export const ${functionName}InfiniteQueryOption = infiniteQueryOption(${functionName}Key,${functionName});`

          functionsNames.push(functionName)
          newContent += exportKey + exportQuery + exportMutation + exportInfinite
        }
        if (functionsNames.length === 0) return
        newContent =
          `import { ${functionsNames.join(', ')} } from "#libs/${folder}/${fileName}";import { queryOption, mutationOption, infiniteQueryOption } from "#src/utils/query";` +
          newContent
        const outputFolder = path.join(outputFilePath, folder)
        if (!(await fs.stat(outputFolder).catch(() => false))) {
          await fs.mkdir(outputFolder, { recursive: true })
        }

        const outputFile = path.join(outputFolder, `${fileName}Options.ts`)
        await fs.writeFile(outputFile, newContent, 'utf8')

        // Format the file with Prettier
        exec(`npx prettier --write ${outputFile}`, (err) => {
          if (err) {
            console.error(`❌ prettier에서 오류가 났어요: ${err}`)
            return
          }
        })
      }
    })
  )
}

module.exports = processFolder
