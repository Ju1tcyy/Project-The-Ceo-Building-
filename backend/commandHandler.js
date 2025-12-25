/**
 * Command Handler
 * @param {Object} WaziumBot - Bot instance
 * @param {Object} m - Message object
 * @param {string} command - Command name
 * @param {Array} args - Command arguments
 * @param {string} text - Full text after command
 * @param {string} from - Chat ID
 * @param {string} sender - Sender ID
 * @param {string} pushname - Sender name
 */
const { extendBot } = require('./lib/functions')
const handleCommand = async (WaziumBot, m, command, args, text, from, sender, pushname) => {
    try {
        extendBot(WaziumBot)
        switch (command) {
            case 'text':
                await WaziumBot.sendText(from, "Hello World")
                break;

            case 'test':

                await WaziumBot.sampleContactMessage(from, "Hafiz Agha", "HEXANEST.ID", 6285890392419)
                break;

            case 'help':
                await WaziumBot.sendMessage(from, {
                    text: `*Available Commands:*\n\n• .text - Send hello world\n• .help - Show this help menu`
                })
                break;

            case 'ping':
                const start = new Date().getTime()
                await WaziumBot.sendMessage(from, { text: 'Pinging...' })
                const end = new Date().getTime()
                await WaziumBot.sendMessage(from, {
                    text: `*Pong!* 🏓\nResponse time: ${end - start}ms`
                })
                break;

            case 'info':
                await WaziumBot.sendMessage(from, {
                    text: `*Bot Information:*\n\n• Name: ${pushname}\n• From: ${sender}\n• Chat: ${m.isGroup ? 'Group' : 'Private'}\n• Time: ${new Date().toLocaleString()}`
                })
                break;

            default:
                // Command not found - you can choose to show error or ignore
                await WaziumBot.sendMessage(from, { text: `Command "${command}" not found. Use .help to see available commands.` })
                break;
        }
    } catch (error) {
        console.error('Command execution error:', error)
        await WaziumBot.sendMessage(from, {
            text: 'An error occurred while executing the command.'
        })
    }
}

module.exports = { handleCommand }
