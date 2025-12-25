const fs = require('fs');
const path = require('path');

const invoicesFilePath = path.join(__dirname, '../data/invoices.json');
const tenantsFilePath = path.join(__dirname, '../data/tenants.json');

// Load invoices data
function loadInvoices() {
    try {
        if (!fs.existsSync(invoicesFilePath)) {
            return { invoices: [] };
        }
        const data = fs.readFileSync(invoicesFilePath, 'utf8');
        if (!data.trim()) { // If the file is empty or contains only whitespace
            return { invoices: [] };
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading invoices:', error);
        return { invoices: [] };
    }
}

// Save invoices data
function saveInvoices(data) {
    try {
        fs.writeFileSync(invoicesFilePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving invoices:', error);
        return false;
    }
}

// Load tenants data
function loadTenants() {
    try {
        const data = fs.readFileSync(tenantsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading tenants:', error);
        return { tenants: {} };
    }
}

// Get tenant name from phone number
function getTenantName(phoneNumber) {
    const tenantsData = loadTenants();
    const tenants = tenantsData.tenants || {};
    
    // Search through all floors and tenants
    for (const floor in tenants) {
        const floorTenants = tenants[floor];
        for (const tenantName in floorTenants) {
            if (floorTenants[tenantName] === phoneNumber) {
                return { name: tenantName, floor: floor };
            }
        }
    }
    return null;
}

// Check and send reminders
async function checkAndSendReminders(botInstance) {
    if (!botInstance) {
        console.log('Bot instance not ready, skipping reminder check');
        return;
    }

    const invoicesData = loadInvoices();
    const invoices = invoicesData.invoices || [];
    const now = new Date();

    for (const invoice of invoices) {
        // Skip if already paid
        if (invoice.paid === true) {
            continue;
        }

        const baseDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date(invoice.sentAt);
        if (isNaN(baseDate.getTime())) {
            continue;
        }

        const daysSinceBase = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));

        // Skip if due date is in the future
        if (daysSinceBase < 0) {
            continue;
        }

        const hasDueDate = Boolean(invoice.dueDate);
        const reminderSchedule = [
            { number: 1, days: hasDueDate ? 14 : 7, flag: 'reminder1Sent', timestamp: 'reminder1SentAt' },
            { number: 2, days: hasDueDate ? 30 : 14, flag: 'reminder2Sent', timestamp: 'reminder2SentAt' },
            { number: 3, days: hasDueDate ? 45 : 21, flag: 'reminder3Sent', timestamp: 'reminder3SentAt' }
        ];

        for (const schedule of reminderSchedule) {
            if (!invoice[schedule.flag] && daysSinceBase >= schedule.days) {
                await sendReminder(botInstance, invoice, schedule.number);
                invoice[schedule.flag] = true;
                invoice[schedule.timestamp] = now.toISOString();
                break;
            }
        }
    }

    // Save updated invoices
    saveInvoices(invoicesData);
}

// Send reminder message
async function sendReminder(botInstance, invoice, reminderNumber) {
    try {
        const whatsappJid = invoice.phoneNumber + '@s.whatsapp.net';
        const tenantInfo = getTenantName(invoice.phoneNumber);
        const tenantName = tenantInfo ? tenantInfo.name : invoice.tenantName || 'Tenant';
        const floor = tenantInfo ? tenantInfo.floor : invoice.floor || '-';

        let reminderMessage = '';
        
        if (reminderNumber === 1) {
            reminderMessage = `🔔 *REMINDER 1 - The Ceo Building*\n\n` +
                `Halo sobat tenant ${tenantName},\n\n` +
                `Kami mengingatkan bahwa invoice overtime untuk:\n` +
                `🏢 Lantai: Lantai ${floor}\n` +
                `🏪 Tenant: ${tenantName}\n\n` +
                `Belum kami terima pembayarannya. Mohon untuk segera melakukan pembayaran dan mengirimkan bukti transfer dengan format:\n` +
                `---\nPesan Ini Adalah Bot Otomatis Dari The Ceo Building`;
        } else if (reminderNumber === 2) {
            reminderMessage = `🔔 *REMINDER 2 - The Ceo Building*\n\n` +
                `Halo sobat tenant ${tenantName},\n\n` +
                `Ini adalah pengingat kedua untuk invoice overtime:\n` +
                `🏢 Lantai: Lantai ${floor}\n` +
                `🏪 Tenant: ${tenantName}\n\n` +
                `Pembayaran belum kami terima. Mohon untuk segera melakukan pembayaran dan mengirimkan bukti transfer.\n\n` +
                `---\nPesan Ini Adalah Bot Otomatis Dari The Ceo Building`;
        } else if (reminderNumber === 3) {
            reminderMessage = `🔔 *REMINDER 3 - The Ceo Building*\n\n` +
                `Halo sobat tenant ${tenantName},\n\n` +
                `Ini adalah pengingat terakhir untuk invoice overtime:\n` +
                `🏢 Lantai: Lantai ${floor}\n` +
                `🏪 Tenant: ${tenantName}\n\n` +
                `Pembayaran belum kami terima. Mohon untuk segera melakukan pembayaran dan mengirimkan bukti transfer.\n\n` +
                `---\nPesan Ini Adalah Bot Otomatis Dari The Ceo Building`;
        }

        await botInstance.sendMessage(whatsappJid, { text: reminderMessage });
        console.log(`✅ Reminder ${reminderNumber} sent to ${invoice.phoneNumber} (${tenantName})`);
    } catch (error) {
        console.error(`❌ Error sending reminder ${reminderNumber} to ${invoice.phoneNumber}:`, error);
    }
}

let currentBotInstance = null;

// Start reminder scheduler
function startReminderScheduler(botInstance) {
    currentBotInstance = botInstance;
    
    // Check every hour
    setInterval(() => {
        if (currentBotInstance) {
            checkAndSendReminders(currentBotInstance);
        }
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    // Also check immediately on startup
    // setTimeout(() => {
    //     if (currentBotInstance) {
    //         checkAndSendReminders(currentBotInstance);
    //     }
    // }, 5000); // Wait 5 seconds after startup

    console.log('✅ Reminder scheduler started (checking every hour)');
}

// Update bot instance when bot restarts
function updateBotInstance(botInstance) {
    currentBotInstance = botInstance;
}

module.exports = {
    loadInvoices,
    saveInvoices,
    checkAndSendReminders,
    sendReminder,
    startReminderScheduler,
    updateBotInstance,
    getTenantName
};

