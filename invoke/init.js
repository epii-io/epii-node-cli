'use strict'

const child_process = require('child_process')
const fs = require('fs')
const path = require('path')
const glob = require('glob')

const assist = require('../kernel/assist.js')
const logger = require('../kernel/logger.js')
const system = require('../kernel/system.js')

module.exports = function* (query) {
  // output empty line
  logger.line()

  // verify project
  if (!query.project || !/^[a-zA-Z0-9\-_]+$/.test(query.project)) {
    logger.halt('please enter your project name')
    logger.warn('project name should be [a-zA-Z0-9\-_]')
    return logger.line()
  }

  // get system info
  var sysInfo = system.getSystemInfo()
  logger.info('project name =>', query.project)
  logger.info('author name =>', sysInfo.authorName || '(not defined)')
  logger.info('author email =>', sysInfo.authorEmail || '(not defined)')

  // create cwd + name
  var sourceDir = path.join(__dirname, '../template')
  var targetDir = path.join(sysInfo.workDir, query.project)
  logger.warn('target directory =>', targetDir)
  if (assist.existsPath(targetDir)) {
    logger.halt('target directory already exists')
    var existedFiles = fs.readdirSync(targetDir)
    if (existedFiles.length > 0) {
      return logger.line()
    }
    logger.warn('target directory is empty')
  } else {
    assist.mkdirSync(targetDir)
  }

  // list template files
  logger.info('prepare template')
  var entries = glob
    .sync(sourceDir + '/**')
    .filter(entry => entry !== sourceDir)
    .map(entry => {
      return {
        source: entry,
        target: path.join(targetDir, path.relative(sourceDir, entry))
      }
    })
  logger.done(entries.length, 'entries for target')
  // console.log(entries)

  // build target dir tree
  entries
    .filter(entry => fs.statSync(entry.source).isDirectory())
    .forEach(entry => assist.mkdirSync(entry.target))
  logger.done('target dir tree built')

  // copy files & rename dot
  yield Promise.all(entries
    .filter(entry => fs.statSync(entry.source).isFile())
    .map(entry => {
      if (/_d_/.test(entry.source)) {
        return assist.copyFile(entry.source, entry.target.replace('_d_', '.'))
      } else {
        return assist.copyFile(
          entry.source, entry.target.replace('_t_', ''),
          content => content
            .replace(/\$\{project\}/g, query.project)
            .replace(/\$\{author\}/g, sysInfo.authorName)
        )
      }
    })
  )
  logger.done('template copy finished')

  // init git repository
  logger.info('init git repository');
  child_process.spawn(
    'git init && git add .',
    { cwd: targetDir, stdin: 'inherit' }
  )

  // install dependencies
  logger.info('install dependencies');
  child_process.spawn(
    `npm i --registry=http://registry.npm.taobao.org`,
    { cwd: targetDir, stdin: 'inherit' }
  )

  // output launch hints
  logger.line()
  logger.done('project ready, launch app by [npm run devp]')
}