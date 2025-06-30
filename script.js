// ------------- UTILITY FUNCTIONS -------------
function saveData(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function loadData(key, def) { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }
function getCurrentUser() { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); }
function checkLogin() { if (!getCurrentUser()) window.location = 'index.html'; }

// --- AUDIT TRAIL Functions ---
function addAudit(action, details="") {
  const user = getCurrentUser();
  const logs = loadData('auditTrail', []);
  logs.unshift({
    timestamp: new Date().toISOString(),
    user: user ? user.username : 'N/A',
    action,
    details
  });
  saveData('auditTrail', logs);
}
function renderAuditTrail() {
  const logs = loadData('auditTrail', []);
  let html = "<tr><th>Date & Time</th><th>User</th><th>Action</th><th>Details</th></tr>";
  logs.forEach(log => {
    html += `<tr>
      <td>${new Date(log.timestamp).toLocaleString()}</td>
      <td>${log.user}</td>
      <td>${log.action}</td>
      <td>${log.details}</td>
    </tr>`;
  });
  document.getElementById('auditTable').innerHTML = html;
}
window.clearAuditTrail = function() {
  if(confirm("Are you sure you want to clear the audit trail?")) {
    localStorage.removeItem('auditTrail');
    renderAuditTrail();
    addAudit('Audit Trail Cleared', 'All logs cleared');
  }
};

// ------------- THEME SWITCHER -------------
function setTheme(theme) {
  document.body.classList.remove('dark', 'light', 'default');
  if (theme !== 'default') document.body.classList.add(theme);
  localStorage.setItem('theme', theme);
}

// ------------- LOGIN PAGE LOGIC -------------
if (document.getElementById('loginForm')) {
  // Default admin user if none exists
  if (!localStorage.getItem('users')) {
    saveData('users', [{ username: 'admin', password: 'admin', role: 'admin' }]);
  }
  document.getElementById('loginForm').onsubmit = function(e){
    e.preventDefault();
    let users = loadData('users', [{username:'admin',password:'admin',role:'admin'}]);
    let u = users.find(x=>x.username===username.value && x.password===password.value);
    if(u){
      setCurrentUser(u);
      addAudit('User Login', `Username: ${u.username}`);
      window.location = "dashboard.html";
    } else {
      document.getElementById('errorMsg').textContent = "Invalid username or password!";
    }
  };
  // Forgot password
  document.getElementById('showReset').onclick = function(e){
    e.preventDefault();
    document.getElementById('loginForm').style.display='none';
    document.getElementById('resetSection').style.display='';
  };
  document.getElementById('backToLogin').onclick = function(e){
    e.preventDefault();
    document.getElementById('resetSection').style.display='none';
    document.getElementById('loginForm').style.display='';
    document.getElementById('resetMsg').textContent = '';
  };
  document.getElementById('resetSection').onsubmit = function(e){
    e.preventDefault();
    let username = document.getElementById('resetUsername').value.trim();
    let pass = document.getElementById('resetNewPass').value;
    let users = loadData('users', [{username:'admin',password:'admin',role:'admin'}]);
    let idx = users.findIndex(u => u.username === username);
    if (idx > -1) {
      users[idx].password = pass;
      saveData('users', users);
      document.getElementById('resetMsg').textContent = 'Password has been reset!';
      addAudit('Password Reset', `Username: ${username}`);
    } else {
      document.getElementById('resetMsg').textContent = 'Username not found!';
    }
  };
}

// ------------- DASHBOARD PAGE LOGIC -------------
if (location.pathname.endsWith('dashboard.html')) {
  checkLogin();

  // THEME INIT + INSTANT SWITCH
  setTheme(localStorage.getItem('theme') || 'default');
  if (document.getElementById('themeSelect')) {
    document.getElementById('themeSelect').value = localStorage.getItem('theme') || 'default';
    document.getElementById('themeSelect').addEventListener('change', function() {
      setTheme(this.value);
    });
  }

  // ------------- SIDEBAR NAVIGATION -------------
  function showTab(tab) {
    document.querySelectorAll('.tab').forEach(s => s.style.display = 'none');
    let thisTab = document.getElementById(tab + 'Tab');
    if (thisTab) thisTab.style.display = '';
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    const tabOrder = ['dashboard','register','current','history','report','users','settings','audit'];
    const idx = tabOrder.indexOf(tab);
    if (idx >= 0) document.querySelectorAll('.sidebar-menu li')[idx].classList.add('active');
    if(tab === 'audit') renderAuditTrail();
  }
  window.showTab = showTab;
  showTab('dashboard');

  // ------------- VISITOR CRUD -------------
  document.getElementById('registerForm').onsubmit = function(e) {
    e.preventDefault();
    let visitors = loadData('visitors', []);
    const visitor = {
      id: Date.now(),
      name: document.getElementById('fullName').value,
      contact: document.getElementById('contact').value,
      idNum: document.getElementById('idNum').value,
      unit: document.getElementById('unit').value,
      purpose: document.getElementById('purpose').value,
      checkin: new Date().toISOString(),
      checkout: null
    };
    visitors.push(visitor);
    saveData('visitors', visitors);
    addAudit('Visitor Check-in', `Name: ${visitor.name}, Unit: ${visitor.unit}`);
    this.reset();
    alert('Visitor checked in!');
    renderAll();
  };
  document.getElementById('checkoutForm').onsubmit = function(e){
    e.preventDefault();
    let val = document.getElementById('checkoutInput').value.toLowerCase();
    let visitors = loadData('visitors', []);
    let idx = visitors.findIndex(v=>!v.checkout && (v.name.toLowerCase()===val||v.idNum.toLowerCase()===val));
    if(idx>-1){
      visitors[idx].checkout = new Date().toISOString();
      saveData('visitors',visitors);
      addAudit('Visitor Check-out', `Name/ID: ${visitors[idx].name} (${visitors[idx].idNum})`);
      alert('Checked out!');
      renderAll();
    } else {
      alert('No active visitor found!');
    }
    this.reset();
  };

  // ------------- TABLES RENDERING -------------
  function renderAll() {
    renderDashboardStats();
    renderCurrentVisitorsDashboard();
    renderCurrentVisitors();
    renderHistoryTable();
    renderUsersTable();
    renderReportTable([]);
    renderAuditTrail(); // Always refresh audit trail in case it's open
  }

  function renderDashboardStats() {
    let visitors = loadData('visitors', []);
    let today = new Date().toISOString().slice(0,10);
    let now = new Date();
    let thisWeek = new Date(now); thisWeek.setDate(now.getDate()-6);
    let thisMonth = now.toISOString().slice(0,7);
    document.getElementById('countActiveVisitors').textContent = visitors.filter(v=>!v.checkout).length;
    document.getElementById('countTodayVisitors').textContent = visitors.filter(v=>v.checkin?.slice(0,10)===today).length;
    document.getElementById('countWeekVisitors').textContent = visitors.filter(v=>new Date(v.checkin)>=thisWeek).length;
    document.getElementById('countMonthVisitors').textContent = visitors.filter(v=>v.checkin?.slice(0,7)===thisMonth).length;
  }
  function renderCurrentVisitorsDashboard() {
    let visitors = loadData('visitors', []);
    let html = "<tr><th>Name</th><th>Contact</th><th>ID</th><th>Unit</th><th>Purpose</th><th>Check-in</th></tr>";
    visitors.filter(v => !v.checkout).forEach(v => {
      html += `<tr>
        <td>${v.name}</td>
        <td>${v.contact}</td>
        <td>${v.idNum}</td>
        <td>${v.unit}</td>
        <td>${v.purpose}</td>
        <td>${new Date(v.checkin).toLocaleString()}</td>
      </tr>`;
    });
    document.getElementById('currentVisitorsTable').innerHTML = html;
  }
  function renderCurrentVisitors() {
    let visitors = loadData('visitors', []);
    let html = "<tr><th>Name</th><th>Contact</th><th>ID</th><th>Unit</th><th>Purpose</th><th>Check-in</th><th>Action</th></tr>";
    visitors.filter(v => !v.checkout).forEach(v => {
      html += `<tr>
        <td>${v.name}</td>
        <td>${v.contact}</td>
        <td>${v.idNum}</td>
        <td>${v.unit}</td>
        <td>${v.purpose}</td>
        <td>${new Date(v.checkin).toLocaleString()}</td>
        <td>
          <button onclick="openEditVisitor(${v.id})">Edit</button>
          <button onclick="deleteVisitor(${v.id})">Delete</button>
          <button onclick="generateVisitorQR(${v.id})">Generate QR</button>
          <button onclick="checkoutVisitor(${v.id})">Check-out</button>
        </td>
      </tr>`;
    });
    document.getElementById('currentVisitorsTable2').innerHTML = html;
  }
  function renderHistoryTable() {
    let visitors = loadData('visitors', []);
    let name = (document.getElementById('searchName')?.value || '').toLowerCase();
    let date = document.getElementById('searchDate')?.value || '';
    let html = "<tr><th>Name</th><th>Unit</th><th>Check-in</th><th>Check-out</th><th>Action</th></tr>";
    visitors.forEach(v => {
      if((!name||v.name.toLowerCase().includes(name))&&(!date||(v.checkin&&v.checkin.slice(0,10)===date))){
        html += `<tr>
          <td>${v.name}</td>
          <td>${v.unit}</td>
          <td>${new Date(v.checkin).toLocaleString()}</td>
          <td>${v.checkout ? new Date(v.checkout).toLocaleString() : "-"}</td>
          <td>
            <button onclick="openEditVisitor(${v.id})">Edit</button>
            <button onclick="deleteVisitor(${v.id})">Delete</button>
            <button onclick="generateVisitorQR(${v.id})">Generate QR</button>
          </td>
        </tr>`;
      }
    });
    document.getElementById('historyTable').innerHTML = html;
  }

  // ------------- VISITOR EDIT / DELETE -------------
  let editVisitorId = null;
  window.openEditVisitor = function(id) {
    let visitors = loadData('visitors', []);
    let v = visitors.find(v => v.id == id);
    if (!v) return;
    document.getElementById('editName').value = v.name;
    document.getElementById('editContact').value = v.contact;
    document.getElementById('editID').value = v.idNum;
    document.getElementById('editUnit').value = v.unit;
    document.getElementById('editPurpose').value = v.purpose;
    editVisitorId = id;
    document.getElementById('editModal').style.display = 'flex';
  }
  window.saveEditVisitor = function(e) {
    e.preventDefault();
    let visitors = loadData('visitors', []);
    let idx = visitors.findIndex(v => v.id == editVisitorId);
    if(idx > -1){
      visitors[idx].name = document.getElementById('editName').value;
      visitors[idx].contact = document.getElementById('editContact').value;
      visitors[idx].idNum = document.getElementById('editID').value;
      visitors[idx].unit = document.getElementById('editUnit').value;
      visitors[idx].purpose = document.getElementById('editPurpose').value;
      saveData('visitors', visitors);
      addAudit('Visitor Edited', `Name: ${visitors[idx].name}, ID: ${visitors[idx].idNum}`);
      closeEditVisitor();
      renderAll();
      alert("Visitor updated!");
    }
  }
  window.closeEditVisitor = function() {
    document.getElementById('editModal').style.display = 'none';
    editVisitorId = null;
  }
  window.deleteVisitor = function(id) {
    let visitors = loadData('visitors', []);
    let v = visitors.find(v => v.id == id);
    if(confirm("Are you sure you want to delete this visitor?")) {
      visitors = visitors.filter(v => v.id != id);
      saveData('visitors', visitors);
      addAudit('Visitor Deleted', `Name: ${v.name}, ID: ${v.idNum}`);
      renderAll();
    }
  }
  window.checkoutVisitor = function(id) {
    let visitors = loadData('visitors', []);
    let i = visitors.findIndex(v => v.id == id && !v.checkout);
    if(i>-1) {
      visitors[i].checkout = new Date().toISOString();
      saveData('visitors', visitors);
      addAudit('Visitor Check-out', `Name: ${visitors[i].name}, ID: ${visitors[i].idNum}`);
      alert('Checked out!');
      renderAll();
    }
  }

  // ------------- SEARCH (History Tab) -------------
  if(document.getElementById('searchForm')){
    document.getElementById('searchForm').onsubmit = function(e){
      e.preventDefault();
      renderHistoryTable();
    }
  }

  // ------------- REPORTS -------------
  let lastReportVisitors = [];
  window.generateReport = function(period) {
    let visitors = loadData('visitors', []);
    const now = new Date();
    let filtered = [];
    if (period === "daily") {
      filtered = visitors.filter(v => v.checkin?.slice(0, 10) === now.toISOString().slice(0, 10));
    } else if (period === "weekly") {
      const start = new Date(now); start.setDate(now.getDate() - 6);
      filtered = visitors.filter(v => new Date(v.checkin) >= start);
    } else if (period === "monthly") {
      filtered = visitors.filter(v => v.checkin?.slice(0,7) === now.toISOString().slice(0,7));
    } else {
      filtered = visitors;
    }
    lastReportVisitors = filtered;
    if(document.getElementById('reportResult'))
      document.getElementById('reportResult').innerText = `Total visitors (${period}): ${filtered.length}`;
    renderReportTable(filtered);
    addAudit('Generated Report', `Period: ${period}`);
  }
  window.renderReportTable = function(data) {
    let html = "<tr><th>Name</th><th>Contact</th><th>ID</th><th>Unit</th><th>Purpose</th><th>Check-in</th><th>Check-out</th></tr>";
    (data||[]).forEach(v=>{
      html += `<tr>
        <td>${v.name}</td>
        <td>${v.contact}</td>
        <td>${v.idNum}</td>
        <td>${v.unit}</td>
        <td>${v.purpose}</td>
        <td>${new Date(v.checkin).toLocaleString()}</td>
        <td>${v.checkout ? new Date(v.checkout).toLocaleString() : "-"}</td>
      </tr>`;
    });
    document.getElementById('reportTable').innerHTML = html;
  }
  window.printReport = function() {
    let printContents = `<h2>Visitor Report</h2>`;
    printContents += document.getElementById('reportResult').outerHTML;
    printContents += document.getElementById('reportTable').outerHTML;
    const win = window.open('', '', 'height=700,width=900');
    win.document.write('<html><head><title>Print Visitor Report</title>');
    win.document.write('<style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;}th{background:#eee;}</style>');
    win.document.write('</head><body>');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
    addAudit('Report Printed');
  }
  window.downloadReportCSV = function() {
    const data = lastReportVisitors;
    if (!data.length) { alert("No report data to download. Generate a report first."); return; }
    const header = ["Name","Contact","ID","Unit","Purpose","Check-in","Check-out"];
    const rows = data.map(v => [
      v.name, v.contact, v.idNum, v.unit, v.purpose, new Date(v.checkin).toLocaleString(), v.checkout ? new Date(v.checkout).toLocaleString() : "-"
    ]);
    let csv = [header, ...rows].map(row => row.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'visitor-report.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    addAudit('Report Downloaded', 'CSV file');
  }

  // ------------- USER MANAGEMENT -------------
  function renderUsersTable() {
    let users = loadData('users', [{username:'admin',password:'admin',role:'admin'}]);
    let html = "<tr><th>Username</th><th>Role</th><th>Action</th></tr>";
    users.forEach((u,i) => {
      html += `<tr>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${u.username==='admin'?'':`<button onclick="deleteUser(${i})">Delete</button>`}</td>
      </tr>`;
    });
    document.getElementById('usersTable').innerHTML = html;
  }
  window.deleteUser = function(idx) {
    let users = loadData('users', [{username:'admin',password:'admin',role:'admin'}]);
    addAudit('User Deleted', `Username: ${users[idx].username}`);
    users.splice(idx,1);
    saveData('users',users);
    renderUsersTable();
  }
  document.getElementById('addUserForm').onsubmit = function(e) {
    e.preventDefault();
    let users = loadData('users', [{username:'admin',password:'admin',role:'admin'}]);
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    if(!username || !password) return alert("Username and password required!");
    if(users.find(u=>u.username===username)) return alert("Username already exists!");
    users.push({ username, password, role });
    saveData('users', users);
    addAudit('User Added', `Username: ${username}, Role: ${role}`);
    this.reset();
    renderUsersTable();
    alert("User added!");
  };

  // ------------- SETTINGS / PASSWORD CHANGE -------------
  window.saveSettings = function() {
    const theme = document.getElementById('themeSelect').value;
    setTheme(theme);
    const pass = document.getElementById('changePass').value;
    if(pass){
      let u = getCurrentUser();
      let users = loadData('users', [{username:'admin',password:'admin',role:'admin'}]);
      let idx = users.findIndex(x=>x.username===u.username);
      if(idx>-1){
        users[idx].password = pass;
        saveData('users',users);
        document.getElementById('changePass').value = '';
        document.getElementById('settingsMsg').textContent = "Password updated!";
        addAudit('Password Changed', `Username: ${u.username}`);
      }
    }
    document.getElementById('settingsMsg').textContent += " Settings saved.";
    addAudit('Settings Changed', `Theme: ${theme}` + (pass ? ', Password changed' : ''));
  }

  // ------------- LOGOUT -------------
  window.logout = function() {
    addAudit('User Logout', `Username: ${getCurrentUser()?.username || 'N/A'}`);
    localStorage.removeItem('currentUser');
    window.location.href = "index.html";
  }

  // ------------- QR CODE INTEGRATION -------------
  window.generateVisitorQR = function(visitorId) {
    let visitors = loadData('visitors', []);
    let visitor = visitors.find(v => v.id == visitorId);
    if (!visitor) return alert("Visitor not found!");
    document.getElementById('qrModal').style.display = 'flex';
    document.getElementById('qrCodeContainer').innerHTML = "";
    let qrData = JSON.stringify({ visitorId: visitor.id });
    new QRCode(document.getElementById('qrCodeContainer'), {
      text: qrData,
      width: 180,
      height: 180
    });
    addAudit('QR Generated', `Visitor: ${visitor.name}`);
  }
  window.closeQRModal = function() {
    document.getElementById('qrModal').style.display = 'none';
  }

  let qrScanner = null;
  window.openQRScanner = function() {
    document.getElementById('qrScannerModal').style.display = 'flex';
    if (!qrScanner) {
      qrScanner = new Html5Qrcode("qr-reader");
    }
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 200 },
      qrCodeMessage => {
        qrScanner.stop().then(() => {
          document.getElementById('qrScannerModal').style.display = 'none';
        });
        handleScannedQR(qrCodeMessage);
      },
      errorMessage => {}
    ).catch(err => {
      alert("Unable to access camera. Please check camera permissions.");
    });
  }
  window.closeQRScanner = function() {
    if (qrScanner) {
      qrScanner.stop().then(() => {
        document.getElementById('qrScannerModal').style.display = 'none';
      });
    } else {
      document.getElementById('qrScannerModal').style.display = 'none';
    }
  }
  window.handleScannedQR = function(qrCodeMessage) {
    try {
      const qrData = JSON.parse(qrCodeMessage);
      if (qrData.visitorId) {
        const visitors = loadData('visitors', []);
        const prev = visitors.find(v => v.id == qrData.visitorId);
        if (!prev) return alert("Visitor not found in system.");
        document.getElementById('fullName').value = prev.name;
        document.getElementById('contact').value = prev.contact;
        document.getElementById('idNum').value = prev.idNum;
        document.getElementById('unit').value = prev.unit;
        document.getElementById('purpose').value = '';
        alert("Returning visitor details loaded! Please update purpose/unit if needed before checking in.");
        addAudit('QR Scanned', `Visitor: ${prev.name}`);
      } else {
        alert("Invalid QR code.");
      }
    } catch (e) {
      alert("Invalid QR code format.");
    }
  }

  // ------------- INITIAL RENDER -------------
  renderAll();
}
