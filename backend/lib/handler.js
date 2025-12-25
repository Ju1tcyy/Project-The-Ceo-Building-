const {
    generateWAMessage,
    proto,
    areJidsSameUser,
    getContentType
} = require('@itsukichan/baileys')
const fs = require('fs')
const util = require('util')
const chalk = require('chalk')
const ora = require('ora')
const Table = require('cli-table3')
const { color } = require('./color')
const { sampleSendText } = require('./functions')
const { nocache } = require('./loader.js')
const { handleCommand } = require('../commandHandler.js')
require('../commandHandler.js')
nocache('../commandHandler.js', module => console.log(color('[ CHANGE ]', 'green'), color(`'${module}'`, 'green'), 'Updated'))

module.exports = WaziumBot = async (WaziumBot, m, msg, chatUpdate, store) => {
    try {
        // Extend WaziumBot with custom functions (only do this once)

        const { type } = m
        var body = (
            m.mtype === 'conversation' ? m.message.conversation :
                m.mtype === 'extendedTextMessage' ? m.message.extendedTextMessage.text :
                    m.mtype === 'buttonsResponseMessage' ? m.message.buttonsResponseMessage.selectedButtonId :
                        m.mtype === 'listResponseMessage' ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
                            m.mtype === 'InteractiveResponseMessage' ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id :
                                m.mtype === 'templateButtonReplyMessage' ? m.message.templateButtonReplyMessage.selectedId :
                                    m.mtype === 'messageContextInfo' ?
                                        m.message.buttonsResponseMessage?.selectedButtonId ||
                                        m.message.listResponseMessage?.singleSelectReply.selectedRowId ||
                                        m.message.InteractiveResponseMessage.NativeFlowResponseMessage ||
                                        m.text :
                                        ''
        );
        var budy = (typeof m.text == 'string' ? m.text : '')

        // Simplified prefix and command handling
        const prefix = '.'; // Default prefix
        const isCmd = body.startsWith(prefix)
        const command = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : ""
        const args = body.trim().split(/ +/).slice(1)
        const text = q = args.join(" ")
        const from = m.key.remoteJid
        const pushname = m.pushName || "No Name"
        const botNumber = await WaziumBot.decodeJid(WaziumBot.user.id)
        const sender = m.sender

        // Console log for commands
        if (isCmd) {
            const table = new Table({
                style: {
                    'padding-left': 1,
                    'padding-right': 1,
                    head: ['cyan'],
                    border: ['grey']
                },
                chars: {
                    'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
                    'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
                    'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼', 'right': '║',
                    'content': ' ', 'row-mid': '─'
                }
            });

            table.push(
                [{ colSpan: 2, content: chalk.bold.hex('#FFD700')(' Command Execution Logs Details '), hAlign: 'center' }],
                [chalk.cyan('Command:'), chalk.green(budy || m.mtype)],
                [chalk.cyan('Timestamp:'), chalk.green(new Date().toLocaleString())],
                [chalk.cyan('From:'), chalk.magenta(`${pushname} (${m.sender.split('@')[0]})`)],
                [chalk.cyan('Chat Type:'), chalk.blueBright(m.isGroup ? `Group Chat (${m.chat.split('@')[0]})` : 'Private Chat')]
            );
            console.log(table.toString());
        }

        // Execute command if it's a valid command
        if (isCmd && command) {
            await handleCommand(WaziumBot, m, command, args, text, from, sender, pushname)
        }

    } catch (err) {
        console.error(util.format(err))
        let e = String(err)
    }
}
