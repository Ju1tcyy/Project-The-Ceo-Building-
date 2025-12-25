// Simple client-side auth
async function isAuthenticated() {
    try {
        const res = await fetch('/auth/status', { credentials: 'same-origin' });
        if (!res.ok) return false;
        const data = await res.json();
        return !!data.authenticated;
    } catch (_) {
        return false;
    }
}

function showLogin() {
    const login = document.getElementById('login-screen');
    const app = document.getElementById('app-container');
    if (login) login.style.display = 'block';
    if (app) app.classList.add('hidden');
}

function showApp() {
    const login = document.getElementById('login-screen');
    const app = document.getElementById('app-container');
    if (login) login.style.display = 'none';
    if (app) app.classList.remove('hidden');
}

// Tenant data management
let tenantData = {};

// Load tenant data from JSON file
async function loadTenantData() {
    try {
        const response = await fetch('/api/tenants');
        if (response.ok) {
            const data = await response.json();
            tenantData = data.tenants || {};
        } else {
            console.error('Failed to load tenant data');
        }
    } catch (error) {
        console.error('Error loading tenant data:', error);
    }
}

// Save tenant data to JSON file
async function saveTenantData() {
    try {
        const response = await fetch('/api/tenants', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tenants: tenantData })
        });
        if (!response.ok) {
            throw new Error('Failed to save tenant data');
        }
        return true;
    } catch (error) {
        console.error('Error saving tenant data:', error);
        return false;
    }
}

// Handle floor selection
document.getElementById("lantai").addEventListener("change", function () {
    const selectedLantai = this.value;
    updateTenantDropdown(selectedLantai);
});

// Handle form submission
document.getElementById('tenantForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const selectedTenant = document.getElementById('tenantSelect').value;
    const selectedFloor = document.getElementById('lantai').value;
    const selectedTenantName = document.getElementById('tenantSelect').selectedOptions[0]?.textContent;
    const fileInput = document.getElementById('fileInput');
    const dueDateValue = document.getElementById('dueDate').value;
    const statusElement = document.getElementById('status');

    if (!selectedTenant) {
        statusElement.textContent = "Silakan pilih tenant.";
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        statusElement.textContent = "Silakan pilih file untuk dikirim.";
        return;
    }

    if (!dueDateValue) {
        statusElement.textContent = "Silakan pilih tanggal jatuh tempo.";
        return;
    }

    const dueDateObj = new Date(dueDateValue);
    if (isNaN(dueDateObj.getTime())) {
        statusElement.textContent = "Tanggal jatuh tempo tidak valid.";
        return;
    }

    const formattedDueDate = dueDateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    statusElement.textContent = 'Mengirim pesan...';
    statusElement.className = 'info';

    try {
        // Convert phone number to WhatsApp JID format
        const whatsappJid = selectedTenant + '@s.whatsapp.net';
        console.log('Sending to JID:', whatsappJid);
        
        let messagePayload;
        
        // Generate formatted message
        const now = new Date();
        const dateTime = now.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const files = Array.from(fileInput.files);
        const buildPayload = async (file, withCaption, allFiles) => {
            const fileType = file.type || '';
            let formattedMessage = '';
            if (withCaption) {
                const fileNames = allFiles.map(f => `📎 ${f.name}`).join('\n');
                formattedMessage = `The Ceo Building\n\n🏢 Lantai: Lantai ${selectedFloor}\n🏪 Tenant: ${selectedTenantName}\n🗓️ Jatuh Tempo: ${formattedDueDate}\n💬 Pesan: Halo Bapak/Ibu,\n\nBerikut Adalah Invoice Sewa Ruang Kantor Gedung The Ceo Building\n\n📅 Waktu: ${dateTime}\n${fileNames}\n\n---\nPesan Ini Adalah Bot Otomatis Dari The Ceo Building`;
            }
            const base64File = await fileToBase64(file);
            if (fileType.startsWith('image/')) {
                return { image: { url: base64File }, caption: formattedMessage };
            } else if (fileType.startsWith('video/')) {
                return { video: { url: base64File }, caption: formattedMessage };
            } else if (fileType.startsWith('audio/')) {
                return { audio: { url: base64File }, mimetype: fileType };
            } else {
                return { document: { url: base64File }, fileName: file.name, mimetype: fileType, caption: formattedMessage };
            }
        };

        const messages = [];
        for (const [index, f] of files.entries()) {
            const payload = await buildPayload(f, index === 0, files);
            messages.push(payload);
        }

        // Prepare invoice data for tracking
        const invoiceData = {
            tenantName: selectedTenantName,
            floor: selectedFloor,
            dueDate: dueDateValue,
            files: files.map(f => ({ name: f.name, type: f.type }))
        };

        const response = await fetch('http://localhost:3030/send-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: whatsappJid, messages, invoiceData })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result && result.success) {
            // Optionally send reminder message requesting payment proof
            try {
                const sendReminder = document.getElementById('sendReminder')?.checked;
                if (sendReminder) {
                    // Send reminder as text
                    const template = document.getElementById('reminderTemplate')?.value || '';
                    const reminderText = (template || '').replace('{TENANT}', selectedTenantName || '')
                        .replace('{LANTAI}', `Lantai ${selectedFloor}`);
                    await fetch('/send-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ to: whatsappJid, message: { text: reminderText } })
                    });
                }
            } catch (e) {
                console.warn('Gagal mengirim pengingat:', e);
            }
            if (result.failCount === 0) {
                statusElement.textContent = `Berhasil mengirim ${result.successCount} file ke ${selectedTenant}`;
                statusElement.className = 'success';
            } else if (result.successCount === 0) {
                statusElement.textContent = 'Semua pengiriman gagal. Coba lagi.';
                statusElement.className = 'error';
            } else {
                statusElement.textContent = `Sebagian berhasil: ${result.successCount} sukses, ${result.failCount} gagal.`;
                statusElement.className = 'info';
            }
            document.getElementById('tenantForm').reset();
            document.getElementById('tenantSelect').innerHTML = '<option value="">-- Pilih Tenant --</option>';
        } else {
            statusElement.textContent = 'Gagal mengirim pesan batch.';
            statusElement.className = 'error';
        }
    } catch (error) {
        console.error('Error:', error);
        statusElement.textContent = 'Terjadi kesalahan saat menghubungi server: ' + error.message;
        statusElement.className = 'error';
    }
});

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// CRUD Operations for Tenants
async function addTenant(floor, tenantName, phoneNumber) {
    if (!tenantData[floor]) {
        tenantData[floor] = {};
    }
    tenantData[floor][tenantName] = phoneNumber;
    const saved = await saveTenantData();
    if (saved) {
        updateTenantDisplay();
        showStatus('Tenant berhasil ditambahkan', 'success');
    } else {
        showStatus('Gagal menyimpan tenant', 'error');
    }
}

async function updateTenant(floor, oldTenantName, newTenantName, phoneNumber) {
    if (tenantData[floor] && tenantData[floor][oldTenantName]) {
        delete tenantData[floor][oldTenantName];
        tenantData[floor][newTenantName] = phoneNumber;
        const saved = await saveTenantData();
        if (saved) {
            updateTenantDisplay();
            showStatus('Tenant berhasil diperbarui', 'success');
        } else {
            showStatus('Gagal menyimpan perubahan', 'error');
        }
    }
}

async function deleteTenant(floor, tenantName) {
    if (tenantData[floor] && tenantData[floor][tenantName]) {
        delete tenantData[floor][tenantName];
        // Remove floor if no tenants left
        if (Object.keys(tenantData[floor]).length === 0) {
            delete tenantData[floor];
        }
        const saved = await saveTenantData();
        if (saved) {
            updateTenantDisplay();
            showStatus('Tenant berhasil dihapus', 'success');
        } else {
            showStatus('Gagal menghapus tenant', 'error');
        }
    }
}

function updateTenantDisplay() {
    // Update floor dropdown
    const floorSelect = document.getElementById('lantai');
    const currentFloor = floorSelect.value;
    
    // Clear and repopulate floor options
    floorSelect.innerHTML = '<option value="">-- Pilih Lantai --</option>';
    Object.keys(tenantData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(floor => {
        const option = document.createElement('option');
        option.value = floor;
        option.textContent = `Lantai ${floor}`;
        floorSelect.appendChild(option);
    });
    
    // Restore previous selection if it still exists
    if (currentFloor && tenantData[currentFloor]) {
        floorSelect.value = currentFloor;
        updateTenantDropdown(currentFloor);
    }
    
    // Update tenant list display
    updateTenantListDisplay();
}

function updateTenantDropdown(floor) {
    const tenantSelect = document.getElementById('tenantSelect');
    tenantSelect.innerHTML = '<option value="">-- Pilih Tenant --</option>';

    if (tenantData[floor]) {
        for (const tenantName in tenantData[floor]) {
            const phoneNumber = tenantData[floor][tenantName];
            const option = document.createElement('option');
            option.value = phoneNumber;
            option.textContent = tenantName;
            tenantSelect.appendChild(option);
        }
    }
}

function updateTenantListDisplay() {
    const tenantList = document.getElementById('tenantList');
    if (!tenantList) return;
    
    tenantList.innerHTML = '';
    
    Object.keys(tenantData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(floor => {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor-section';
        floorDiv.innerHTML = `
            <h3>Lantai ${floor}</h3>
            <div class="tenant-grid">
                ${Object.entries(tenantData[floor]).map(([name, phone]) => `
                    <div class="tenant-card">
                        <div class="tenant-info">
                            <strong>${name}</strong>
                            <span>${phone}</span>
                        </div>
                        <div class="tenant-actions">
                            <button onclick="editTenant('${floor}', '${name}', '${phone}')" class="btn-edit">Edit</button>
                            <button onclick="deleteTenant('${floor}', '${name}')" class="btn-delete">Hapus</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        tenantList.appendChild(floorDiv);
    });
}

function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = type;
    setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = '';
    }, 3030);
}

// Tab functionality is now defined above in invoice management section

// Add tenant form handler
document.getElementById('addTenantForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const floor = document.getElementById('newFloor').value;
    const tenantName = document.getElementById('newTenantName').value;
    const phoneNumber = document.getElementById('newPhoneNumber').value;
    
    await addTenant(floor, tenantName, phoneNumber);
    
    // Clear form
    this.reset();
});

// Edit tenant modal functions
function editTenant(floor, tenantName, phoneNumber) {
    document.getElementById('editFloor').value = floor;
    document.getElementById('editOldName').value = tenantName;
    document.getElementById('editTenantName').value = tenantName;
    document.getElementById('editPhoneNumber').value = phoneNumber;
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Edit tenant form handler
document.getElementById('editTenantForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const floor = document.getElementById('editFloor').value;
    const oldName = document.getElementById('editOldName').value;
    const newName = document.getElementById('editTenantName').value;
    const phoneNumber = document.getElementById('editPhoneNumber').value;
    
    await updateTenant(floor, oldName, newName, phoneNumber);
    closeEditModal();
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target == modal) {
        closeEditModal();
    }
}

// Invoice Management Functions
let allInvoices = [];
let currentFilter = 'all';

// Load invoices from API
async function loadInvoices() {
    try {
        const response = await fetch('/api/invoices');
        if (!response.ok) {
            throw new Error('Failed to load invoices');
        }
        const data = await response.json();
        allInvoices = data.invoices || [];
        populateFilterDropdowns();
        applyFilters();
    } catch (error) {
        console.error('Error loading invoices:', error);
        document.getElementById('invoiceListContainer').innerHTML = 
            '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Gagal memuat data invoice</p></div>';
    }
}

function handleFloorFilterChange() {
    updateTenantFilter();
    applyFilters();
}

function updateTenantFilter() {
    const floorSelect = document.getElementById('filterFloor');
    const tenantSelect = document.getElementById('filterTenant');
    const selectedFloor = floorSelect.value;

    // Get tenants for the selected floor
    let tenants;
    if (selectedFloor) {
        tenants = [...new Set(allInvoices.filter(inv => inv.floor === selectedFloor).map(inv => inv.tenantName).filter(Boolean))].sort();
    } else {
        // All floors
        tenants = [...new Set(allInvoices.map(inv => inv.tenantName).filter(Boolean))].sort();
    }
    
    const currentTenantValue = tenantSelect.value;
    tenantSelect.innerHTML = '<option value="">-- Semua Tenant --</option>';
    tenants.forEach(tenant => {
        const option = document.createElement('option');
        option.value = tenant;
        option.textContent = tenant;
        tenantSelect.appendChild(option);
    });

    // Check if the previously selected tenant is in the new list
    if (tenants.includes(currentTenantValue)) {
        tenantSelect.value = currentTenantValue;
    } else {
        tenantSelect.value = ""; // Reset if tenant is not on the new floor
    }
}

// Populate filter dropdowns with unique floors and tenants
function populateFilterDropdowns() {
    const floorSelect = document.getElementById('filterFloor');
    
    // Get unique floors
    const floors = [...new Set(allInvoices.map(inv => inv.floor).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b));
    const currentFloorValue = floorSelect.value;
    
    floorSelect.innerHTML = '<option value="">-- Semua Lantai --</option>';
    floors.forEach(floor => {
        const option = document.createElement('option');
        option.value = floor;
        option.textContent = `Lantai ${floor}`;
        floorSelect.appendChild(option);
    });
    if (currentFloorValue) {
        floorSelect.value = currentFloorValue;
    }
    
    updateTenantFilter(); // Initial population of tenants
}

let countdownInterval;

function startCountdownUpdates() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    updateAllCountdowns(); // Run once immediately
    countdownInterval = setInterval(updateAllCountdowns, 1000);
}

function updateAllCountdowns() {
    const countdownElements = document.querySelectorAll('.reminder-countdown');
    const now = new Date();

    countdownElements.forEach(element => {
        const reminderDateISO = element.getAttribute('data-reminder-date');
        const reminderLabel = element.getAttribute('data-reminder-label');
        const sentRemindersText = element.getAttribute('data-sent-reminders');

        if (!reminderDateISO) {
            element.textContent = sentRemindersText || '';
            return;
        }

        const reminderDate = new Date(reminderDateISO);
        const timeDiff = reminderDate.getTime() - now.getTime();

        let nextReminderInfo = '';
        if (timeDiff > 0) {
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

            nextReminderInfo = `⏳ ${reminderLabel} akan dikirim dalam ${days} hari ${hours} jam ${minutes} menit ${seconds} detik`;
        } else {
            nextReminderInfo = `⏳ ${reminderLabel} akan dikirim segera`;
        }

        element.textContent = [sentRemindersText, nextReminderInfo].filter(Boolean).join(', ');
    });
}

// Display invoices in UI
function displayInvoices(invoices) {
    const container = document.getElementById('invoiceListContainer');
    const countElement = document.getElementById('invoiceCount');
    
    // Update count
    const totalCount = allInvoices.length;
    const filteredCount = invoices.length;
    if (countElement) {
        if (filteredCount === totalCount) {
            countElement.textContent = `📊 Total Invoice: ${totalCount}`;
        } else {
            countElement.textContent = `📊 Menampilkan ${filteredCount} dari ${totalCount} invoice`;
        }
    }
    
    if (!invoices || invoices.length === 0) {
        container.innerHTML = 
            '<div class="empty-state"><div class="empty-state-icon">📄</div><p>Belum ada invoice yang sesuai dengan filter</p></div>';
        if (countElement) {
            countElement.textContent = `📊 Menampilkan 0 dari ${totalCount} invoice`;
        }
        return;
    }

    // Sort by date (newest first)
    const sortedInvoices = [...invoices].sort((a, b) => {
        return new Date(b.sentAt) - new Date(a.sentAt);
    });

    container.innerHTML = sortedInvoices.map(invoice => {
        const sentDate = new Date(invoice.sentAt);
        const formattedDate = sentDate.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const formattedDueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : '';

        let reminderDateISO = '';
        let nextReminderLabel = '';
        let sentRemindersText = '';
        let hasUnpaidReminder = false;

        if (!invoice.paid) {
            hasUnpaidReminder = true;
            const dueDateObj = invoice.dueDate ? new Date(invoice.dueDate) : null;
            const hasDueDate = dueDateObj && !isNaN(dueDateObj.getTime());
            const reminderBaseDate = hasDueDate ? dueDateObj : sentDate;
            const afterText = hasDueDate ? 'setelah jatuh tempo' : 'setelah dikirim';
            const reminderPeriods = [
                { days: hasDueDate ? 14 : 7, sent: invoice.reminder1Sent, label: "Reminder 1" },
                { days: hasDueDate ? 30 : 14, sent: invoice.reminder2Sent, label: "Reminder 2" },
                { days: hasDueDate ? 45 : 21, sent: invoice.reminder3Sent, label: "Reminder 3" }
            ];
            sentRemindersText = reminderPeriods.filter(r => r.sent).map(r => `✅ ${r.label} (${r.days} hari ${afterText})`).join(', ');

            const nextReminder = reminderPeriods.find(r => !r.sent);
            if (nextReminder) {
                const reminderDate = new Date(reminderBaseDate.getTime());
                reminderDate.setDate(reminderBaseDate.getDate() + nextReminder.days);
                reminderDateISO = reminderDate.toISOString();
                nextReminderLabel = nextReminder.label;
            }
        }

        const paidDate = invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : '';

        return `
            <div class="invoice-card ${invoice.paid ? 'paid' : 'unpaid'}">
                <div class="invoice-header">
                    <div class="invoice-info">
                        <strong>${invoice.tenantName || 'Tenant'}</strong>
                        <span>📱 ${invoice.phoneNumber}</span>
                        <span>🏢 Lantai ${invoice.floor || '-'}</span>
                        <span>📅 Dikirim: ${formattedDate}</span>
                        ${invoice.paid && paidDate ? `<span>✅ Dibayar: ${paidDate}</span>` : ''}
                    </div>
                    <span class="invoice-status ${invoice.paid ? 'paid' : 'unpaid'}">
                        ${invoice.paid ? '✅ Sudah Bayar' : '❌ Belum Bayar'}
                    </span>
                </div>
                <div class="invoice-details">
                    <div><strong>ID Invoice:</strong> ${invoice.id}</div>
                    ${formattedDueDate ? `<div><strong>Jatuh Tempo:</strong> ${formattedDueDate}</div>` : ''}
                    ${invoice.files && invoice.files.length > 0 ? 
                        `<div><strong>File:</strong> ${invoice.files.map(f => f.name).join(', ')}</div>` : ''}
                    ${invoice.driveFiles && invoice.driveFiles.length > 0 ? 
                        `<div style="margin-top: 8px;"><strong>📁 Google Drive:</strong><br/>${invoice.driveFiles.map(f => 
                            `<a href="${f.driveLink}" target="_blank" style="color: #2196F3; text-decoration: none; margin-right: 10px;">📎 ${f.fileName}</a>`
                        ).join('')}</div>` : ''}
                    ${hasUnpaidReminder ? `<div><strong>Status Reminder:</strong> <span class="reminder-countdown" data-reminder-date="${reminderDateISO}" data-reminder-label="${nextReminderLabel}" data-sent-reminders="${sentRemindersText}"></span></div>` : ''}
                    ${invoice.paid ? '<div style="color: #4CAF50; margin-top: 5px;"><strong>✅ Invoice sudah dibayar</strong></div>' : ''}
                </div>
                ${!invoice.paid ? `
                    <div class="invoice-actions">
                        <button class="btn-mark-paid" onclick="markInvoiceAsPaid('${invoice.id}')">
                            ✅ Tandai Sudah Bayar
                        </button>
                    </div>
                ` : `
                    <div class="invoice-actions">
                        <button class="btn-cancel-paid" onclick="cancelInvoice('${invoice.id}')">
                            ❌ Batalkan (Belum Bayar)
                        </button>
                    </div>
                `}
            </div>
        `;
    }).join('');

    startCountdownUpdates();
}

// Filter invoices by status
function filterInvoices(filter) {
    currentFilter = filter;
    
    // Update active filter button
    document.querySelectorAll('.filter-buttons .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((filter === 'all' && btn.textContent.includes('Semua')) ||
            (filter === 'paid' && btn.textContent.includes('Sudah Bayar')) ||
            (filter === 'unpaid' && btn.textContent.includes('Belum Bayar'))) {
            btn.classList.add('active');
        }
    });
    
    applyFilters();
}

// Apply all filters (status, floor, tenant)
function applyFilters() {
    let filteredInvoices = [...allInvoices];
    
    // Filter by status
    if (currentFilter === 'paid') {
        filteredInvoices = filteredInvoices.filter(inv => inv.paid === true);
    } else if (currentFilter === 'unpaid') {
        filteredInvoices = filteredInvoices.filter(inv => inv.paid !== true);
    }
    
    // Filter by floor
    const selectedFloor = document.getElementById('filterFloor').value;
    if (selectedFloor) {
        filteredInvoices = filteredInvoices.filter(inv => inv.floor === selectedFloor);
    }
    
    // Filter by tenant
    const selectedTenant = document.getElementById('filterTenant').value;
    if (selectedTenant) {
        filteredInvoices = filteredInvoices.filter(inv => inv.tenantName === selectedTenant);
    }
    
    displayInvoices(filteredInvoices);
}

// Mark invoice as paid
async function markInvoiceAsPaid(invoiceId) {
    if (!confirm('Apakah Anda yakin ingin menandai invoice ini sebagai sudah dibayar?')) {
        return;
    }

    try {
        const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to mark invoice as paid');
        }

        // Reload invoices
        await loadInvoices();
        
        // Reapply current filter
        applyFilters();

        showStatus('Invoice berhasil ditandai sebagai sudah dibayar', 'success');
    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        showStatus('Gagal menandai invoice sebagai sudah dibayar', 'error');
    }
}

// Cancel invoice (unmark as paid)
async function cancelInvoice(invoiceId) {
    if (!confirm('Apakah Anda yakin ingin membatalkan status "Sudah Bayar" untuk invoice ini? Invoice akan kembali ditandai sebagai "Belum Bayar".')) {
        return;
    }

    try {
        const response = await fetch(`/api/invoices/${invoiceId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paid: false })
        });

        if (!response.ok) {
            throw new Error('Failed to cancel invoice payment status');
        }

        // Reload invoices
        await loadInvoices();
        
        // Reapply current filter
        applyFilters();

        showStatus('Status invoice berhasil dibatalkan. Invoice kembali ditandai sebagai belum dibayar', 'success');
    } catch (error) {
        console.error('Error canceling invoice:', error);
        showStatus('Gagal membatalkan status invoice', 'error');
    }
}

// Toggle invoice status (paid/unpaid)
async function toggleInvoiceStatus(invoiceId, setAsPaid) {
    try {
        // Find current invoice status
        const invoice = allInvoices.find(inv => inv.id === invoiceId);
        if (!invoice) {
            showStatus('Invoice tidak ditemukan', 'error');
            return;
        }

        // If clicking the same status, do nothing
        if (invoice.paid === setAsPaid) {
            return;
        }

        const response = await fetch(`/api/invoices/${invoiceId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paid: setAsPaid })
        });

        if (!response.ok) {
            throw new Error('Failed to toggle invoice status');
        }

        const result = await response.json();

        // Reload invoices
        await loadInvoices();
        
        // Reapply current filter
        applyFilters();

        showStatus(result.message, 'success');
    } catch (error) {
        console.error('Error toggling invoice status:', error);
        showStatus('Gagal memperbarui status invoice', 'error');
    }
}

// Auto-load invoices when invoice tab is opened
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: find button by tab name
        tabButtons.forEach(button => {
            if (button.getAttribute('onclick') && button.getAttribute('onclick').includes(tabName)) {
                button.classList.add('active');
            }
        });
    }

    // Load invoices if invoice tab is opened
    if (tabName === 'invoice-list') {
        loadInvoices();
    }
}

// Initialize the application with auth gate
document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const googleBtn = document.getElementById('googleLoginBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('login-error');

            // NOTE: Ganti kredensial ini sesuai kebutuhan Anda
            const VALID_USERNAME = 'admin';
            const VALID_PASSWORD = 'admin123';

            if (username === VALID_USERNAME && password === VALID_PASSWORD) {
                localStorage.setItem('isAuthenticated', 'true');
                showApp();
                await loadTenantData();
                updateTenantDisplay();
            } else {
                if (errorEl) errorEl.textContent = 'Username atau password salah.';
            }
        });
    }

    if (googleBtn) {
       googleBtn.addEventListener('click', function () {
    const clientId = '110635673191-vtopt1540qjdbc1i2e23re7ip39of52i.apps.googleusercontent.com';
    const redirectUri = 'http://localhost:3030/auth/google/callback';

    const url =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' + clientId +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=code' +
      '&scope=' + encodeURIComponent('openid email profile');

    window.location.href = url;
});

    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
            } catch (_) {}
            document.body.classList.add('login-bg');
            showLogin();
        });
    }

    if (await isAuthenticated()) {
        document.body.classList.remove('login-bg');
        showApp();
        await loadTenantData();
        updateTenantDisplay();
    } else {
        document.body.classList.add('login-bg');
        showLogin();
    }
});
