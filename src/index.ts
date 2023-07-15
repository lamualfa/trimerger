import prompts from 'prompts'
import {
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs'
import kleur from 'kleur'
import ora from 'ora'
import path from 'path'
import { execa } from 'execa'
import slash from 'slash'
import { temporaryFile } from 'tempy'
import ffmpegPath from 'ffmpeg-static'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

type Flags = Awaited<ReturnType<typeof getFlags>>

safeMain()

async function safeMain() {
  const flags = await getFlags()

  try {
    await main(flags)
  } catch (error) {
    logError(error, flags)
    process.exit(1)
  }
}

function logError(error: unknown, flags: Flags) {
  if (!flags.verbose) {
    return
  }

  console.error(error)
}

async function main(flags: Flags) {
  const spinner = ora('Preparing dependencies.')
  if (!ffmpegPath || typeof ffmpegPath !== 'string') {
    spinner.fail('FFMPEG is not found.')
    return
  }
  spinner.stop()

  const videoPath = await getVideoPath()
  if (!videoPath) {
    return
  }

  const timestamps = await getTimestampts()
  const outputDir = await getOutputDir(videoPath)
  if (!outputDir) {
    return
  }

  let isMergeVideoEnable: boolean = false
  if (timestamps.length > 1) {
    const responds = await prompts({
      name: 'isMergeVideoEnable',
      type: 'confirm',
      message: 'Do you want to merge all of the trimmed videos?',
    })
    isMergeVideoEnable = responds.isMergeVideoEnable
  }

  const outputInfos = timestamps.map((timestamp, idx) => {
    const id = idx + 1
    const outputPath = path.join(
      outputDir,
      `${id}. ${timestamp.join(' ').replaceAll(':', '-')}.mp4` // Windows doesn't support the use of ":" for naming file
    )
    const ffmpegArg = [
      '-i',
      path.resolve(videoPath),
      '-ss',
      timestamp[0],
      '-to',
      timestamp[1],
      '-c:v',
      'copy',
      '-c:a',
      'copy',
      outputPath,
    ]

    return {
      id,
      timestamp,
      outputPath,
      ffmpegArg,
      isTrimmed: false,
    }
  })

  for (const outputInfo of outputInfos) {
    spinner.start(`Trimming video ${outputInfo.id}.`)

    try {
      await execa(ffmpegPath, outputInfo.ffmpegArg)
      spinner.succeed(
        `Timestamp ${outputInfo.id} has been trimmed to "${kleur.italic(
          path.relative(process.cwd(), outputInfo.outputPath)
        )}".`
      )

      outputInfo.isTrimmed = true
    } catch (error) {
      spinner.fail(`Error when trimming video ${outputInfo.id}.`)
      logError(error, flags)
    }
  }

  if (!isMergeVideoEnable) {
    return
  }

  const trimmedVideos = outputInfos.filter((info) => info.isTrimmed)
  spinner.start(`Merging ${trimmedVideos.length} videos.`)
  if (trimmedVideos.length === 0) {
    spinner.fail('Nothing videos to merge.')
    return
  }

  const videosTxtPath = temporaryFile()
  const videosTxtContent = trimmedVideos
    .map(
      (info) =>
        `file '${escapeFfmpegSpecialCharacters(slash(info.outputPath))}'`
    )
    .join('\n')
  writeFileSync(videosTxtPath, videosTxtContent)

  const mergedPath = path.join(outputDir, path.basename(videoPath))
  try {
    await execa(ffmpegPath, [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      videosTxtPath,
      '-c',
      'copy',
      mergedPath,
    ])
  } catch (error) {
    spinner.fail(`Failed to merge ${trimmedVideos.length} videos.`)
    throw error
  } finally {
    unlinkSync(videosTxtPath)
  }

  spinner.succeed(
    `Success merging ${trimmedVideos.length} videos to ${kleur.italic(
      path.relative(process.cwd(), mergedPath)
    )}.`
  )
}

async function getFlags() {
  return await yargs(hideBin(process.argv))
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      default: false,
      description: 'Show verbose logs for debugging.',
    })
    .parse()
}

function escapeFfmpegSpecialCharacters(text: string) {
  return text.replaceAll(/'/g, "\\'")
}

async function getVideoPath() {
  const spinner = ora()
  const currentDir = process.cwd()
  spinner.start(`Scanning videos in "${kleur.italic(currentDir)}" directory.`)

  const videoNames = readdirSync(currentDir).filter(isVideo)

  if (videoNames.length === 0) {
    spinner.fail(
      `There\'s no video on "${kleur.italic(currentDir)}" directory.`
    )
    return
  }
  spinner.succeed(
    `Found ${videoNames.length} videos in "${kleur.italic(
      currentDir
    )}" directory.`
  )

  const { videoPath } = await prompts([
    {
      name: 'videoPath',
      message: 'Select a video to process:',
      type: 'select',
      choices: videoNames.map((fileName) => ({
        title: fileName,
        value: fileName,
      })),
    },
  ])

  return videoPath
}

async function getOutputDir(videoPath: string) {
  const defaultOutputDir = path.basename(videoPath).replace(/\.mp4$/, '')
  const { outputDir } = await prompts([
    {
      name: 'outputDir',
      message: `Enter the output directory (default: ${kleur.italic(
        defaultOutputDir
      )}):`,
      type: 'text',
      format: (value) => path.resolve(value),
      initial: defaultOutputDir,
      validate: (value) => {
        if (!value) {
          return true
        }

        const isExists = existsSync(value)
        if (!isExists) {
          mkdirSync(value)
          return true
        }

        const dirStat = statSync(value)
        if (!dirStat.isDirectory) {
          return `The "${kleur.bold(value)}" is not a directory.`
        }

        const dirFiles = readdirSync(value)
        if (dirFiles.length) {
          return `The "${kleur.bold(
            value
          )}" is not empty. Please move the files inside before the process.`
        }

        return true
      },
    },
  ])

  return outputDir
}

function isVideo(fileName: string) {
  return fileName.endsWith('.mp4')
}

function convertDurationToNumber(duration: string): number {
  return parseInt(duration.replaceAll(':', ''), 10)
}

function sanitizeTimestamp(unsafeTimestampt: string): [string, string] {
  const [unsafeStart, unsafeEnd] = unsafeTimestampt.split('-')
  return [unsafeStart.trim(), unsafeEnd.trim()]
}

function isValidTimestamp(timestamp: string) {
  const isValidFormat = /^\d{2}:\d{2}:\d{2}\s*-\s*\d{2}:\d{2}:\d{2}$/.test(
    timestamp.trim()
  )
  if (!isValidFormat) {
    throw 'Please use "hh:mm:ss - hh:mm:ss" format.'
  }

  const [startDuration, endDuration] = sanitizeTimestamp(timestamp)
  const isValidTimestamp =
    convertDurationToNumber(startDuration) <
    convertDurationToNumber(endDuration)
  if (!isValidTimestamp) {
    throw "Start duration can't be greater than the End duration."
  }

  return true
}

async function getTimestampts() {
  const timestamps: [string, string][] = []
  let isQuestionContinue
  do {
    const { unsafeTimestampt, isContinue } = await prompts([
      {
        name: 'unsafeTimestampt',
        message:
          'Put the timestamp you want to trim using "hh:mm:ss - hh:mm:ss" format:',
        type: 'text',
        validate: (value) => {
          if (!value) {
            return true
          }

          try {
            isValidTimestamp(value)
          } catch (error) {
            if (typeof error === 'string') {
              return error
            }

            throw error
          }

          const timestamp = sanitizeTimestamp(value)
          if (
            timestamps.findIndex(
              (addedTimestamp) =>
                addedTimestamp[0] === timestamp[0] &&
                addedTimestamp[1] === timestamp[1]
            ) !== -1
          ) {
            return 'The timestamp has been added.'
          }

          return true
        },
      },
      {
        name: 'isContinue',
        message: 'Do you want to add another timestamp to trim?',
        type: 'confirm',
      },
    ])

    isQuestionContinue = isContinue

    if (!unsafeTimestampt || typeof unsafeTimestampt !== 'string') {
      continue
    }

    timestamps.push(sanitizeTimestamp(unsafeTimestampt))
  } while (isQuestionContinue)

  return timestamps
}
