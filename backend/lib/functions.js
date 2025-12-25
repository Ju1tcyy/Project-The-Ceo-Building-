const extendBot = (WaziumBot) => {

    // Available
    WaziumBot.sendText = async (jid, text) => {
        await WaziumBot.sendMessage(jid, { text: text })
    }

    // Available
    WaziumBot.sendQuoteText = async (jid, text, m) => {
        await WaziumBot.sendMessage(jid, { text: text }, { quoted: m })
    }

    // Available
    WaziumBot.sendMention = async (jid, text, m) => {
        await WaziumBot.sendMessage(jid,
            { text: text },
            { mentions: [m.sender] }
        )
    }

    // Available
    WaziumBot.sendLocation = async (jid, Lat, Long) => {
        await WaziumBot.sendMessage(jid, {
            location: {
                degreesLatitude: Lat,
                degreesLongitude: Long
            }
        })
    }

    // Available
    WaziumBot.sendContactMessage = async (jid, name, organization, phone) => {
        const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
            + 'VERSION:3.0\n'
            + `FN:${name}\n` // full name
            + `ORG:${organization}\n` // the organization of the contact
            + `TELtype=CELLtype=VOICEwaid=${phone}:+${phone}\n` // WhatsApp ID + phone number
            + 'END:VCARD'

        await WaziumBot.sendMessage(jid, {
            contacts: {
                displayName: name,
                contacts: [{ vcard }]
            }
        }
        )
    }

    // Available
    WaziumBot.reactMessage = async (jid, message, emote) => {
        await WaziumBot.sendMessage(jid, {
            react: {
                text: emote, // use an empty string to remove the reaction
                key: message.key
            }
        })
    }

    // Available
    WaziumBot.pinMessage = async (jid, message, pinTime) => {
        await WaziumBot.sendMessage(jid, {
            pin: {
                type: 1, // 2 to remove
                // 24h = 86.400
                // 7d = 604.800
                // 30d = 2.592.000
                time: pinTime,
                key: message.key
            }
        })
    }

    // Available
    WaziumBot.unPinMessage = async (jid, message) => {
        await WaziumBot.sendMessage(jid, {
            pin: {
                type: 2,
                key: message.key
            }
        })
    }

    // Available
    WaziumBot.sendPollMessage = async (jid, namePoll, option) => {
        await WaziumBot.sendMessage(jid, {
            poll: {
                name: namePoll,
                values: option, // ['Option 1', 'Option 2', 'Option 3']
                selectableCount: 1,
                toAnnouncementGroup: false // or true
            }
        })
    }

    // Available
    WaziumBot.sendPollResultMessage = async (jid, namePoll, option) => {
        await WaziumBot.sendMessage(jid, {
            pollResult: {
                name: namePoll,
                // values: [
                //     [ 'Option 1', 1000 ],
                //     [ 'Option 2', 2000 ]
                // ]
                values: option
            }
        })
    }

    // Available
    WaziumBot.sendEventMessage = async (jid, name, desc, starttime, endtime, { locatioin: Lat, Long, locName }) => {
        await WaziumBot.sendMessage(jid, {
            event: {
                isCanceled: false, // or true
                name: name,
                description: desc,
                location: {
                    degreesLatitude: Lat,
                    degreesLongitude: Long,
                    name: locName
                },
                startTime: starttime,
                endTime: endtime,
                extraGuestsAllowed: true // or false
            }
        })
    }

    // Available
    WaziumBot.sendProductMessage = async (jid, id, title, desc, curr, price, salePrice, url, imgCount, imageUrl) => {
        await WaziumBot.sendMessage(jid, {
            product: {
                productImage: {   // for using buffer >> productImage: your_buffer
                    url: imageUrl,
                },
                productId: id,
                title: title,
                description: desc,
                currencyCode: curr,
                priceAmount1000: price,
                // retailerId: 'your_reid', // optional use if needed
                url: url, // optional use if needed
                productImageCount: imgCount,
                // firstImageId: 'your_image', // optional use if needed
                salePriceAmount1000: salePrice,
                // signedUrl: 'your_url' // optional use if needed
            },
            businessOwnerJid: jid
        })
    }

    // Available
    WaziumBot.sendSharePhoneNumberMessage = async (jid) => {
        await WaziumBot.sendMessage(jid, {
            sharePhoneNumber: {}
        })
    }

    // Available
    WaziumBot.sendRequestPhoneNumberMessage = async (jid) => {
        await WaziumBot.sendMessage(jid, {
            requestPhoneNumber: {}
        })
    }

    // Available
    WaziumBot.sendButtonMessage = async (jid, text, capt, footer, buttons) => {
        await WaziumBot.sendMessage(jid, {
            text: text,  // image: buffer or // image: { url: url } If youawait Want to use images
            caption: capt, // Use this if you are using an image or video
            footer: footer,
            buttons: buttons
            // [{
            //     buttonId: 'Id1',
            //     buttonText: {
            //         displayText: 'Google',
            //         url: 'https://www.google.com'
            //     }
            // },
            // {
            //     buttonId: 'Id2',
            //     buttonText: {
            //         displayText: 'CopyCode',
            //         copy_code: 'mantap'
            //     }
            // },
            // {
            //     buttonId: 'Id3',
            //     buttonText: {
            //         displayText: 'Button 3'
            //     }
            // }]
        })
    }

    // Available
    WaziumBot.sendButtonListMessage = async (jid, text, footer, title, btnText, sections) => {
        await WaziumBot.sendMessage(jid, {
            text: text,
            footer: footer,
            title: title,
            buttonText: btnText,
            sections: sections
            // [{
            //     title: 'Section 1',
            //     rows: [{
            //         title: 'Option 1',
            //         rowId: 'option1'
            //     },
            //     {
            //         title: 'Option 2',
            //         rowId: 'option2',
            //         description: 'This is a description'
            //     }]
            // },
            // {
            //     title: 'Section 2',
            //     rows: [{
            //         title: 'Option 3',
            //         rowId: 'option3'
            //     },
            //     {
            //         title: 'Option 4',
            //         rowId: 'option4',
            //         description: 'This is a description V2'
            //     }]
            // }]
        })
    }

    // Available
    WaziumBot.sendCardMessage = async (jid, text, title, subtitle, footer, cards) => {
        await WaziumBot.sendMessage(jid, {
            text: text,
            title: title,
            subtile: subtitle,
            footer: footer,
            cards: cards
                // [{
                //     image: { url: './assets/images/wazium.png' }, // or buffer
                //     title: 'Title Cards',
                //     body: 'Body Cards',
                //     footer: 'Footer Cards',
                //     buttons: [
                //         {
                //             name: 'quick_reply',
                //             buttonParamsJson: JSON.stringify({
                //                 display_text: 'Display Button',
                //                 id: 'ID'
                //             })
                //         },
                //         {
                //             name: 'cta_url',
                //             buttonParamsJson: JSON.stringify({
                //                 display_text: 'Display Button',
                //                 url: 'https://www.google.com'
                //             })
                //         }
                //     ]
                // },
                // {
                //     // video: { url: 'https://examplefiles.org/files/video/mp4-example-video-download-640x480.mp4' }, // or buffer
                //     image: { url: './assets/images/wazium.png' }, // or buffer
                //     title: 'Title Cards',
                //     body: 'Body Cards',
                //     footer: 'Footer Cards',
                //     buttons: [
                //         {
                //             name: 'quick_reply',
                //             buttonParamsJson: JSON.stringify({
                //                 display_text: 'Display Button',
                //                 id: 'ID'
                //             })
                //         },
                //         {
                //             name: 'cta_url',
                //             buttonParamsJson: JSON.stringify({
                //                 display_text: 'Display Button',
                //                 url: 'https://www.google.com'
                //             })
                //         }
                //     ]
                // }]
        })
    }
}

module.exports = { extendBot }
