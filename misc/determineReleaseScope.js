
const grabMessage = (opts) => opts.commits[0].message
const grabCommitType = message => message.split('(')[0]
const breaking = message => !!(message.toLowerCase().indexOf('breaking') > -1)

const commitTypeMap = {
  feat: 'minor',
  fix: 'patch',
  docs: 'patch',
  style: null,
  refactor: 'patch',
  perf: 'patch',
  test: null,
  chore: null
}

module.exports = function (options, parserOpts, cb) {
  const message = grabMessage(parserOpts)
  const changeType = grabCommitType(message)
  const releaseType = breaking(message) ? 'major' : commitTypeMap[changeType]
  if (releaseType === undefined) {
    return cb(new Error(`unknown commit type in commit message "${message}"`))
  }
  cb(null, releaseType)
}
