const chalk = require('chalk')
const fancyOut = (style) => (prefix) => (context) => (msg) => console.log(style(`${prefix}: ${context} -- ${msg}`))

const warn = fancyOut(chalk.bgYellow)('WARN')
const err = fancyOut(chalk.bgRed)('ERR')

module.exports = {
  warn,
  err
}
