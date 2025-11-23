# Codebase Cleanup Checklist
**Generated:** November 23, 2025  
**Status:** Ready for execution

---

## ✅ PHASE 1: IMMEDIATE CLEANUP (1-2 Days)

### Task 1.1: Move Test Files to /tests/ Directory
**Risk:** Low | **Impact:** High (cleaner repo)

```powershell
# Create test directories
New-Item -ItemType Directory -Path ".\tests\debug" -Force
New-Item -ItemType Directory -Path ".\tests\integration" -Force
New-Item -ItemType Directory -Path ".\tests\fixtures" -Force

# Move check_* files
Move-Item -Path "check_*.js" -Destination ".\tests\debug\" -ErrorAction SilentlyContinue

# Move test_* files  
Move-Item -Path "test_*.js" -Destination ".\tests\integration\" -ErrorAction SilentlyContinue

# Move simulate_* files
Move-Item -Path "simulate_*.js" -Destination ".\tests\debug\" -ErrorAction SilentlyContinue

# Commit changes
git add tests/
git add .
git commit -m "chore: organize test files into /tests/ directory"
```

**Verification:**
- [ ] Root directory clean (no test_*.js files)
- [ ] All tests in proper subdirectories
- [ ] Git commit successful

---

### Task 1.2: Archive __deleted_backup/ Folder
**Risk:** Low | **Impact:** High (remove 200+ unnecessary files)

```powershell
# Create archive directory
New-Item -ItemType Directory -Path ".\migrations\archive" -Force
New-Item -ItemType Directory -Path ".\docs\archive" -Force

# Extract SQL migrations
Copy-Item -Path ".\__deleted_backup\*.sql" -Destination ".\migrations\archive\" -ErrorAction SilentlyContinue

# Extract documentation
Copy-Item -Path ".\__deleted_backup\*.md" -Destination ".\docs\archive\" -ErrorAction SilentlyContinue

# Commit before deletion (safety)
git add __deleted_backup/
git commit -m "backup: preserve __deleted_backup folder before archiving"

# Rename (don't delete yet - keep for 1 week as safety)
$timestamp = Get-Date -Format "yyyyMMdd"
Rename-Item -Path "__deleted_backup" -NewName "__archived_backup_$timestamp"

# After 1 week, if no issues:
# Remove-Item -Path "__archived_backup_$timestamp" -Recurse -Force
```

**Verification:**
- [ ] SQL files preserved in /migrations/archive/
- [ ] Documentation preserved in /docs/archive/
- [ ] __deleted_backup renamed (not deleted yet)
- [ ] Git commit successful (can restore if needed)

---

### Task 1.3: Document Maytapi Usage
**Risk:** None | **Impact:** Medium (planning data)

```powershell
# Create reports directory
New-Item -ItemType Directory -Path ".\reports" -Force

# Find all Maytapi references
Select-String -Path ".\services\*.js" -Pattern "MAYTAPI|maytapi" -List | 
  Select-Object Path, LineNumber, Line | 
  Export-Csv -Path ".\reports\maytapi_usage.csv" -NoTypeInformation

# Find all whatsappService imports
Select-String -Path ".\**\*.js" -Pattern "require.*whatsappService" -List |
  Select-Object Path, LineNumber, Line |
  Export-Csv -Path ".\reports\whatsapp_service_imports.csv" -NoTypeInformation

# Count dependencies
$maytapiCount = (Select-String -Path ".\services\*.js" -Pattern "MAYTAPI" | Measure-Object).Count
$importCount = (Select-String -Path ".\**\*.js" -Pattern "require.*whatsappService" | Measure-Object).Count

Write-Host "`n=== MAYTAPI DEPENDENCY REPORT ===" -ForegroundColor Cyan
Write-Host "Total Maytapi references: $maytapiCount" -ForegroundColor Yellow
Write-Host "Total whatsappService imports: $importCount" -ForegroundColor Yellow
Write-Host "Reports saved to: .\reports\" -ForegroundColor Green
```

**Verification:**
- [ ] maytapi_usage.csv created
- [ ] whatsapp_service_imports.csv created
- [ ] Reviewed dependency count

---

## 🔧 PHASE 2: PROVIDER ABSTRACTION (3-5 Days)

### Task 2.1: Create MessageProvider Abstraction
**Risk:** Medium | **Impact:** High (cost savings, flexibility)

**File:** `services/messaging/messageProvider.js`

```javascript
/**
 * Message Provider Abstraction
 * Tries providers in order: Desktop Agent → Waha → Maytapi (fallback)
 */
const { sendWebMessage, getClientStatus } = require('../whatsappWebService');
const { sendMessage: sendMaytapi } = require('../whatsappService');
const { supabase } = require('../config');

class MessageProvider {
  constructor(tenantId) {
    this.tenantId = tenantId;
  }

  async sendMessage(to, text) {
    // Try Desktop Agent first (free)
    try {
      const status = getClientStatus(this.tenantId);
      if (status.status === 'ready' && status.hasClient) {
        await sendWebMessage(this.tenantId, to, text);
        await this._logProvider('desktop-agent', true);
        return { provider: 'desktop-agent', success: true };
      }
    } catch (err) {
      console.warn('[MessageProvider] Desktop Agent failed:', err.message);
    }

    // Try Waha second (premium, 24/7)
    try {
      // TODO: Implement Waha sender
      // await sendWahaMessage(this.tenantId, to, text);
    } catch (err) {
      console.warn('[MessageProvider] Waha failed:', err.message);
    }

    // Fallback to Maytapi (expensive)
    try {
      await sendMaytapi(to, text);
      await this._logProvider('maytapi', true);
      return { provider: 'maytapi', success: true };
    } catch (err) {
      await this._logProvider('maytapi', false, err.message);
      throw new Error('All message providers failed');
    }
  }

  async _logProvider(provider, success, error = null) {
    try {
      await supabase.from('message_provider_logs').insert({
        tenant_id: this.tenantId,
        provider,
        success,
        error,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[MessageProvider] Failed to log:', err.message);
    }
  }
}

module.exports = { MessageProvider };
```

**Verification:**
- [ ] File created at correct path
- [ ] No syntax errors
- [ ] Imports resolve correctly

---

### Task 2.2: Update Webhook.js (Critical Path)
**Risk:** High | **Impact:** High

**Backup first:**
```powershell
Copy-Item -Path ".\routes\webhook.js" -Destination ".\routes\webhook.js.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
```

**Change:**
```javascript
// OLD:
const { sendMessage } = require('../services/whatsappService');

// NEW:
const { MessageProvider } = require('../services/messaging/messageProvider');

// Usage (in webhook handler):
// OLD:
await sendMessage(phone, replyText);

// NEW:
const provider = new MessageProvider(tenant.id);
await provider.sendMessage(phone, replyText);
```

**Test Plan:**
1. Send test message via webhook
2. Verify Desktop Agent receives it (if connected)
3. Verify fallback to Maytapi works (if Desktop Agent disconnected)
4. Check logs for provider used

**Verification:**
- [ ] Webhook imports updated
- [ ] Test message sent successfully
- [ ] Provider logged correctly
- [ ] Rollback plan ready (restore .backup file if needed)

---

### Task 2.3: Update Customer Handler
**Risk:** Medium | **Impact:** High

**Files to update:**
- `routes/handlers/modules/mainHandler.js`
- `routes/handlers/modules/smartResponseHandler.js`

**Same pattern as Task 2.2**

**Verification:**
- [ ] All sendMessage calls updated
- [ ] Customer messages work end-to-end
- [ ] No errors in logs

---

### Task 2.4: Update Broadcast Service
**Risk:** Medium | **Impact:** High (broadcasts are critical feature)

**File:** `services/broadcastService.js`

**Current:** Already has `sendMessageSmart()` that tries WhatsApp Web first!

**Action:** Update to use new MessageProvider class for consistency

**Verification:**
- [ ] Broadcasts work via Desktop Agent
- [ ] Broadcasts fallback to Maytapi if needed
- [ ] Rate limiting still works

---

## 🗂️ PHASE 3: SERVICE CONSOLIDATION (1 Week)

### Task 3.1: Merge Discount Services
**Risk:** Medium | **Impact:** Medium (code cleanliness)

**Keep:**
- `services/discountNegotiationService.js` (AI-powered, 500+ lines)
- `services/volumeDiscountService.js` (bulk pricing)

**Merge into discountService.js:**
- `services/discountCalculationService.js`
- `services/aiDiscountUnderstanding.js`

**Steps:**
1. Create new consolidated `services/discountService.js`
2. Copy functions from files to merge
3. Update all imports to point to new file
4. Test discount flow end-to-end
5. Move old files to archive/

**Verification:**
- [ ] All discount scenarios work
- [ ] No broken imports
- [ ] Code is more maintainable

---

### Task 3.2: Merge Cart Services
**Risk:** Low | **Impact:** Medium

**Keep:**
- `services/cartService.js` (main cart logic)

**Merge functions from:**
- `services/quantityChangeService.js` → Add updateQuantity() to cartService
- `services/cartResetService.js` → Add resetCart() to cartService

**Verification:**
- [ ] Cart operations work (add, update, remove)
- [ ] Quantity updates work
- [ ] Cart reset works

---

### Task 3.3: Merge Customer Services
**Risk:** Medium | **Impact:** High

**Keep:**
- `services/core/CustomerService.js` (primary, well-structured)
- `services/customerProfileService.js` (legacy support)

**Merge:**
- `services/customerOnboardingService.js` → Add to core/CustomerService
- `services/customerPersonalizationService.js` → Add to core/CustomerService
- `services/customerSnapshotService.js` → Add to core/CustomerService

**Verification:**
- [ ] Customer creation works
- [ ] Customer profile updates work
- [ ] GST info stored correctly

---

## 🔍 PHASE 4: ZOHO INVESTIGATION (2 Days)

### Task 4.1: Check Zoho Usage
**Risk:** None | **Impact:** Medium (clarity)

```javascript
// Add to routes/webhook.js (temporary logging)
console.log('[ZOHO_CHECK] zohoMatching loaded:', !!zohoMatching);
console.log('[ZOHO_CHECK] enhancedOrderWithZoho loaded:', !!enhancedOrderWithZoho);

// Search production logs
Select-String -Path ".\temp_logs.txt" -Pattern "zoho|ZOHO" | 
  Select-Object LineNumber, Line | 
  Format-Table
```

**Decision Matrix:**
- **If Zoho calls found in logs:** Keep and add `ZOHO_ENABLED=true` flag
- **If no Zoho calls found:** Isolate to `/services/integrations/zoho/`

**Verification:**
- [ ] Determined if Zoho is actively used
- [ ] Documented decision in ZOHO_STATUS.md

---

### Task 4.2: Isolate or Configure Zoho
**Risk:** Low | **Impact:** Medium

**Option A: Keep Active (if used)**
```javascript
// Add to .env
ZOHO_ENABLED=true
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_secret
```

**Option B: Isolate (if unused)**
```powershell
# Move all Zoho services
New-Item -ItemType Directory -Path ".\services\integrations\zoho" -Force
Move-Item -Path ".\services\zoho*.js" -Destination ".\services\integrations\zoho\"

# Update imports (if any)
# Document as future feature
```

**Verification:**
- [ ] Zoho status documented
- [ ] No broken imports
- [ ] Webhook still works

---

## 📚 PHASE 5: DOCUMENTATION (Ongoing)

### Task 5.1: Create Service Catalog
**File:** `docs/SERVICE_CATALOG.md`

**Template:**
```markdown
# Service Catalog

## Messaging
- **messageProvider.js** - Abstracted WhatsApp sender (Desktop Agent → Waha → Maytapi)
- **whatsappWebService.js** - Desktop Agent integration (whatsapp-web.js)
- **whatsappService.js** - Maytapi API (legacy, fallback only)

## AI
- **aiService.js** - OpenAI GPT-3.5/4 integration
- **core/ConversationMemory.js** - Context tracking across messages
- **core/EnhancedIntentClassifier.js** - NLP intent recognition

## Orders
- **orderService.js** - Order CRUD operations
- **cartService.js** - Shopping cart management
- **orderProcessingService.js** - Checkout flow

... (continue for all services)
```

---

### Task 5.2: Document API Endpoints
**File:** `docs/API_REFERENCE.md`

**Sections:**
- Webhook endpoints
- Dashboard APIs
- Desktop Agent APIs
- Admin APIs

---

### Task 5.3: Create Migration Guide
**File:** `docs/MAYTAPI_MIGRATION_GUIDE.md`

**For developers migrating existing tenants from Maytapi to Desktop Agent**

---

## 📊 SUCCESS METRICS

### Before Cleanup:
- Root directory: 50+ test files
- __deleted_backup/: 200+ files
- Maytapi dependency: 20+ files
- Duplicate services: 15+ files
- Monthly cost: $500+ (messaging)

### After Cleanup:
- Root directory: Clean (tests in /tests/)
- __deleted_backup/: Archived
- Maytapi dependency: Abstracted, fallback only
- Duplicate services: Consolidated
- Monthly cost: $0-50 (90-100% savings)

### Code Quality Metrics:
- [ ] Complexity reduced (fewer duplicate services)
- [ ] Maintainability improved (clearer structure)
- [ ] Flexibility increased (pluggable message providers)
- [ ] Costs reduced (Desktop Agent is free)

---

## 🚨 ROLLBACK PLAN

### If Something Breaks:

**Phase 1 (Cleanup):**
```powershell
# Restore test files
git checkout HEAD -- check_*.js test_*.js simulate_*.js

# Restore __deleted_backup
git checkout HEAD -- __deleted_backup/
```

**Phase 2 (Provider Abstraction):**
```powershell
# Restore webhook.js
Copy-Item -Path ".\routes\webhook.js.backup_*" -Destination ".\routes\webhook.js"

# Restart server
npm start
```

**Phase 3 (Consolidation):**
```powershell
# Restore individual service files from git
git checkout HEAD -- services/discountCalculationService.js
git checkout HEAD -- services/quantityChangeService.js
```

---

## ✅ COMPLETION CHECKLIST

### Phase 1: Cleanup
- [ ] Test files moved to /tests/
- [ ] __deleted_backup archived
- [ ] Maytapi usage documented

### Phase 2: Provider Abstraction  
- [ ] MessageProvider created
- [ ] webhook.js updated
- [ ] customerHandler updated
- [ ] broadcastService updated
- [ ] All tests passing

### Phase 3: Consolidation
- [ ] Discount services merged
- [ ] Cart services merged
- [ ] Customer services merged
- [ ] All tests passing

### Phase 4: Zoho
- [ ] Zoho usage determined
- [ ] Zoho isolated or configured
- [ ] Documentation updated

### Phase 5: Documentation
- [ ] SERVICE_CATALOG.md created
- [ ] API_REFERENCE.md created
- [ ] MIGRATION_GUIDE.md created

---

**Ready to Execute?**  
Start with Phase 1 (low risk, high impact)  
Test thoroughly after each phase  
Keep git commits granular for easy rollback  

**Estimated Total Time:** 2-3 weeks (part-time)  
**Risk Level:** Low → Medium → High (phases increase in risk)  
**Value:** High (cleaner code + cost savings)
