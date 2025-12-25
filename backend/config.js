const fs = require('fs')
const chalk = require('chalk')

// Configuration for the bot
global.botname = 'Wazium'
global.instaname = 'https://instagram.com/lrnd.__'
global.githubname = 'https://github.com/lrndwyy'
global.ownernumber = '6285890392419'
global.ownername = 'LRNDWY'
global.wm = "Wazium Bot"
global.themeemoji = '🖥️'
global.author = "LRNDWY"
global.creator = "6285890392419@s.whatsapp.net"
global.xprefix = '.'
global.thumb = fs.readFileSync('./assets/images/wazium.png')

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
