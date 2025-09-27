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
    const statusElement = document.getElementById('status');

    if (!selectedTenant) {
        statusElement.textContent = "Silakan pilih tenant.";
        return;
    }

    if (!fileInput.files[0]) {
        statusElement.textContent = "Silakan pilih file untuk dikirim.";
        return;
    }

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
        
        const file = fileInput.files[0];
        const fileType = file.type;
        console.log('File selected:', file.name, 'Type:', fileType);
        
        // Create formatted message
        const formattedMessage = `The Ceo Building

🏢 Lantai: Lantai ${selectedFloor}
🏪 Tenant: ${selectedTenantName}
💬 Pesan: Halo sobat tenant gedung The Ceo Building, Berikut adalah Invoice Overtime Tenant

📅 Waktu: ${dateTime}
📎 File: ${file.name}

---
Dikirim melalui Web Form`;
        
        // Convert file to base64
        const base64File = await fileToBase64(file);
        console.log('File converted to base64, length:', base64File.length);
        
        // Determine message type based on file type
        if (fileType.startsWith('image/')) {
            messagePayload = {
                image: { url: base64File },
                caption: formattedMessage
            };
        } else if (fileType.startsWith('video/')) {
            messagePayload = {
                video: { url: base64File },
                caption: formattedMessage
            };
        } else if (fileType.startsWith('audio/')) {
            messagePayload = {
                audio: { url: base64File },
                mimetype: fileType
            };
        } else {
            // For documents
            messagePayload = {
                document: { url: base64File },
                fileName: file.name,
                mimetype: fileType,
                caption: formattedMessage
            };
        }

        console.log('Message payload:', messagePayload);

        const requestBody = { 
            to: whatsappJid,
            message: messagePayload
        };
        
        console.log('Sending request:', requestBody);

        const response = await fetch('http://localhost:3000/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            statusElement.textContent = 'Pesan berhasil dikirim ke ' + selectedTenant;
            statusElement.className = 'success';
            // Clear form
            document.getElementById('tenantForm').reset();
            document.getElementById('tenantSelect').innerHTML = '<option value="">-- Pilih Tenant --</option>';
        } else {
            statusElement.textContent = 'Gagal mengirim pesan: ' + (data.error || data.details);
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
    }, 3000);
}

// Tab functionality
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
    event.target.classList.add('active');
}

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

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    await loadTenantData();
    updateTenantDisplay();
});
