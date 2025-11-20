# 🧪 Test the Complete Desktop Agent Flow

## Quick Test Steps

### **1. Register a New Customer**

Open: **http://13.62.57.240:8080/agent-login**

```
Click "Register" tab

Phone: 971501234567
Email: test@customer.com
Business Name: Test Store
Password: Test123

Click "Register"
```

**Expected:** 
- ✅ "Registration successful" message
- ✅ Tenant ID displayed (e.g., TENANT-1732104567-abc123)

---

### **2. Test Desktop Agent Login**

In desktop agent folder, delete `.env` file if it exists, then run:
```
START-AGENT.bat
```

**Expected:**
- ✅ Agent opens browser to login page
- Enter: **Phone: 971501234567** | **Password: Test123**
- ✅ Browser shows "Login successful! Return to Desktop Agent"
- ✅ Close browser
- ✅ Agent shows "✅ Authentication successful"
- ✅ QR code appears

---

### **3. Connect WhatsApp**

**On Phone:**
1. Open WhatsApp
2. Settings → Linked Devices
3. Link a Device
4. Scan QR code

**Expected in Agent:**
- ✅ "✅ WhatsApp Web connected successfully!"
- ✅ "📞 Phone number: 971501234567"
- ✅ "✅ Registered with cloud server"

---

### **4. Test Dashboard Login**

Open: **http://13.62.57.240:8080/login.html**

```
Phone: 971501234567
Password: Test123

Click "Sign In"
```

**Expected:**
- ✅ Dashboard opens
- ✅ Shows "Connected" status
- ✅ WhatsApp number displayed
- ✅ Can access broadcast page

---

## ✅ Success Criteria

All these should work:
- ✅ Registration stores password correctly
- ✅ Desktop agent login uses registered credentials
- ✅ QR code connects WhatsApp
- ✅ Dashboard login uses same credentials
- ✅ Dashboard shows connection status

---

## 🔍 Debugging

### Check Database Record
```bash
ssh -i ~/Downloads/whatsapp-ai-key.pem ubuntu@13.62.57.240
cd /home/ubuntu/whatsapp-ai
psql $DATABASE_URL -c "SELECT phone, business_name, password, whatsapp_phone, status FROM tenants WHERE phone = '971501234567';"
```

**Should show:**
```
phone         | business_name | password | whatsapp_phone | status
971501234567  | Test Store    | Test123  | 971501234567   | connected
```

---

## 🎯 Current Status

**What's Working:**
- ✅ Registration endpoint stores password
- ✅ Login endpoint verifies password
- ✅ Desktop agent connects to cloud
- ✅ EC2 server updated and running

**Ready to Test:**
- ✅ Complete registration flow
- ✅ Desktop agent login
- ✅ WhatsApp connection
- ✅ Dashboard access

---

## 📝 Notes

**Important:**
- Same credentials work for desktop agent AND dashboard
- Password is required during registration
- Tenant ID is automatically generated
- Desktop agent creates `.env` file after login
- Dashboard checks `whatsapp_phone` field for connection status
