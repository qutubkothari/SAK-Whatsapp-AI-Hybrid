# SAK WhatsApp AI Hybrid - Service Dependency Map
**Visual representation of service dependencies and call chains**

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  WhatsApp Users → Maytapi/Desktop Agent/Waha → Webhook          │
│  Dashboard Users → Browser → Express Static Files                │
│  Desktop Agent → Electron App → Local WhatsApp Web              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ROUTING LAYER (index.js)                    │
├─────────────────────────────────────────────────────────────────┤
│  POST /webhook                    → routes/webhook.js            │
│  POST /api/desktop-agent/*        → Desktop Agent handlers      │
│  GET  /api/admin/*                → Dashboard APIs               │
│  POST /api/broadcast              → Broadcast scheduler          │
│  GET  /dashboard                  → Static HTML                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE PIPELINE (webhook.js)              │
├─────────────────────────────────────────────────────────────────┤
│  1. messageNormalizer    → Standardize message format           │
│  2. tenantResolver       → Identify tenant from phone            │
│  3. adminDetector        → Admin vs customer routing             │
│  4. zohoSyncMiddleware   → Optional Zoho sync                    │
│  5. Validation           → Ensure required fields present        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              [ADMIN]              [CUSTOMER]
                    │                   │
                    ↓                   ↓
```

---

## 📊 CUSTOMER MESSAGE FLOW (Main Path)

```
Customer WhatsApp Message
          ↓
routes/webhook.js
          ↓
routes/handlers/customerHandler.js
          ↓
routes/handlers/modules/mainHandler.js
          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN HANDLER ORCHESTRATION                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Save message to DB (messages table)                          │
│  2. Save to ConversationMemory (context tracking)                │
│  3. Get conversation memory (last N messages)                    │
│  4. Classify intent via EnhancedIntentClassifier                 │
│  5. Route to appropriate handler:                                │
│     - intentHandler.js (process intent + context)                │
│     - smartResponseHandler.js (generate AI response)             │
│     - discountHandler.js (handle price negotiations)             │
│     - addProductHandler.js (cart operations)                     │
│  6. Send response via whatsappService                            │
│  7. Save bot response to DB                                      │
└─────────────────────────────────────────────────────────────────┘
          ↓
services/whatsappService.js ⚠️ (MAYTAPI)
          ↓
WhatsApp User receives reply
```

---

## 🧠 AI SERVICE DEPENDENCY CHAIN

```
User Query: "What's the price of 100 cartons?"
          ↓
mainHandler.js
          ↓
services/core/EnhancedIntentClassifier.js
          ├─ Classifies: intent = "product_price"
          └─ Extracts: entities = { quantity: 100, unit: "cartons" }
          ↓
modules/intentHandler.js
          ├─ Loads conversation context
          └─ Processes intent
          ↓
services/aiService.js
          ├─ createEmbedding(userQuery) → OpenAI Embeddings API
          │   └─ Returns: [0.123, -0.456, ...] (1536 dimensions)
          ↓
          ├─ getContextFromDB(tenantId, embedding) → Supabase RPC
          │   └─ match_products(vector, threshold=0.78, limit=3)
          │   └─ Returns: Top 3 relevant products
          ↓
          ├─ getAIResponse(tenantId, query) → OpenAI Chat API
          │   ├─ System Prompt: Bot personality + business context
          │   ├─ User Prompt: Query + product context
          │   └─ Model: gpt-3.5-turbo (configurable)
          ↓
          └─ AI Generated Response
          ↓
modules/smartResponseHandler.js
          ├─ Formats response (prices, quantities)
          ├─ Adds GST info if applicable
          └─ Adds cart actions if needed
          ↓
services/whatsappService.js
          └─ sendMessage(phone, formattedResponse)
```

---

## 🛒 CART & ORDER FLOW

```
User: "Add 10 boxes to cart"
          ↓
modules/addProductHandler.js
          ↓
services/cartService.js
          ├─ getOrCreateCart(tenantId, phone)
          ├─ resolveProduct(tenantId, "boxes") → productService.js
          ├─ calculatePrice(product, quantity) → pricingService.js
          │   └─ Applies: customer tier, volume discounts, GST
          ├─ addCartItem(cartId, productId, quantity, price)
          └─ Returns: Updated cart
          ↓
modules/smartResponseHandler.js
          └─ Formats cart summary with totals
          ↓
[User continues shopping or types "checkout"]
          ↓
modules/intentHandler.js (intent: "checkout")
          ↓
services/orderProcessingService.js
          ├─ validateCart(cart) → Ensure items available
          ├─ applyDiscounts(cart) → discountService.js
          ├─ calculateShipping(cart) → shippingService.js
          ├─ calculateGST(cart) → gstService.js
          ├─ createOrder(cart) → Insert into orders table
          ├─ createOrderItems(orderId, cart.items)
          └─ Optional: syncToZoho(order) → zohoOrderSyncService.js
          ↓
services/orderConfirmationService.js
          └─ Sends confirmation message + PDF (if enabled)
```

---

## 📡 BROADCAST SERVICE FLOW

```
Admin: POST /api/broadcast { phoneNumbers: [...], message: "..." }
          ↓
services/broadcastService.js
          ├─ processBroadcastQueue()
          ├─ Batch processing (5 messages per batch)
          ├─ Human-like delays (10-18 seconds between messages)
          └─ For each phone number:
                ↓
          sendMessageSmart(tenantId, phone, message)
                ├─ Try 1: Desktop Agent (whatsappWebService.js)
                │   ├─ getClientStatus(tenantId)
                │   └─ If ready: sendWebMessage(tenantId, phone, message)
                ↓
                ├─ Try 2: Waha (TODO - not implemented yet)
                ↓
                ├─ Fallback: Maytapi (whatsappService.js) ⚠️
                │   └─ sendMessage(phone, message)
                ↓
          └─ Log provider used (for metrics)
```

---

## 🖥️ DESKTOP AGENT ARCHITECTURE

```
User's PC (Windows/Mac/Linux)
          ↓
desktop-agent/index.js (Electron/Node.js)
          ├─ Uses: whatsapp-web.js library
          ├─ Connects: Local WhatsApp Web (via Puppeteer)
          ├─ Authenticates: QR code → LocalAuth strategy
          └─ Stores session: .wwebjs_auth/ folder
          ↓
[Desktop Agent Running] → Polling for messages
          ↓
WhatsApp Web message received
          ↓
Desktop Agent: POST to Cloud Server
          ↓
POST http://cloud-server:8080/api/desktop-agent/process-message
          {
            tenantId, from, message, timestamp, messageId
          }
          ↓
index.js: /api/desktop-agent/process-message endpoint
          ├─ Fetch tenant from Supabase
          ├─ Format request for customerHandler
          ├─ Call: customerHandler.handleCustomer(req, res)
          │   └─ (Same flow as webhook above)
          ├─ Capture AI reply
          └─ Return: { ok: true, reply: "AI response" }
          ↓
Desktop Agent receives reply
          ↓
Desktop Agent: client.sendMessage(chatId, reply)
          ↓
User receives WhatsApp message
```

---

## ⚠️ MAYTAPI DEPENDENCY CHAIN (Problem Area)

```
services/whatsappService.js (CORE PROBLEM)
          ↑
          ├─ routes/webhook.js (Line 17)
          ├─ routes/handlers/customerHandler.js
          ├─ routes/handlers/modules/mainHandler.js (Line 8)
          ├─ services/broadcastService.js (Line 57)
          ├─ services/followUpService.js
          ├─ services/orderConfirmationService.js
          ├─ services/abandonedCartService.js
          ├─ handlers/shipmentTrackingHandler.js
          └─ ... (20+ total imports)
          
⚠️ All these files directly depend on Maytapi!
⚠️ Can't switch providers without updating all imports!
⚠️ Expensive: $0.05 per message
```

**Solution:** Create abstraction layer

```
services/messaging/messageProvider.js (NEW)
          ├─ Try: Desktop Agent (free)
          ├─ Try: Waha (premium, $50/month flat)
          └─ Fallback: Maytapi (expensive)
          
All services import MessageProvider instead of whatsappService
→ Flexible provider switching
→ Cost optimization
→ No vendor lock-in
```

---

## 🔄 SERVICE REDUNDANCY MAP (Duplicates)

### Discount Services (6 files doing similar work)
```
services/
  ├─ discountService.js                    [Generic discount logic]
  ├─ discountNegotiationService.js ✅      [AI-powered negotiations - KEEP]
  ├─ discountCalculationService.js ⚠️      [Cart-level calcs - MERGE]
  ├─ aiDiscountUnderstanding.js ⚠️         [NLP parsing - MERGE]
  ├─ volumeDiscountService.js ✅           [Bulk pricing - KEEP]
  └─ discountNegotiationLogging.js ⚠️      [Just logging - MERGE]

Recommendation: Keep 2, merge rest into discountService.js
```

### Cart Services (3 files, should be 1)
```
services/
  ├─ cartService.js ✅                     [Main cart CRUD - KEEP]
  ├─ cartResetService.js ⚠️                [Just resetCart() - MERGE]
  └─ quantityChangeService.js ⚠️           [Just updateQuantity() - MERGE]

Recommendation: Single cartService.js with all operations
```

### Customer Services (7 files, should be 2)
```
services/
  ├─ core/CustomerService.js ✅            [Well-structured core - KEEP]
  ├─ customerProfileService.js ✅          [Legacy support - KEEP]
  ├─ customerOnboardingService.js ⚠️       [New customer flow - MERGE]
  ├─ customerPersonalizationService.js ⚠️  [Preferences - MERGE]
  ├─ customerSnapshotService.js ⚠️         [Historical data - MERGE]
  ├─ customerProfileUtils.js ⚠️            [Helper functions - MERGE]
  └─ customerNotesService.js ⚠️            [Notes system - MERGE]

Recommendation: Consolidate into core/CustomerService.js
```

### AI Services (6 files, unclear boundaries)
```
services/
  ├─ aiService.js ✅                       [Main OpenAI integration - KEEP]
  ├─ safeAIService.js ⚠️                   [Error wrapper - MERGE]
  ├─ aiHandlerHelper.js ⚠️                 [Helper functions - MERGE]
  ├─ aiIntegrationService.js ⚠️            [Integration layer - MERGE]
  ├─ aiConversationContextService.js ⚠️    [Context management - MERGE]
  └─ aiConversationContextService_clean.js ❌ [Backup copy - DELETE]

Recommendation: Single aiService.js with all AI logic
```

---

## 🏭 CORE SERVICES (Well-Structured, Keep As-Is)

```
services/core/
  ├─ ConversationMemory.js ✅              [Context tracking across messages]
  ├─ ConversationStateManager.js ✅        [State machine (cart, checkout, etc)]
  ├─ CustomerService.js ✅                 [Customer CRUD operations]
  ├─ EnhancedIntentClassifier.js ✅        [NLP intent recognition]
  ├─ ErrorRecoveryService.js ✅            [Graceful error handling]
  ├─ GSTService.js ✅                      [GST validation & storage]
  ├─ ProactiveClarificationService.js ✅   [Ask clarifying questions]
  └─ ResponseVariationService.js ✅        [Human-like response variations]

👍 These are well-organized, single-purpose, clean
👍 Keep this structure as reference for other services
```

---

## 📂 ISOLATED SERVICES (Zoho - Unclear if Used)

```
services/
  ├─ zohoAuthService.js                    [OAuth authentication]
  ├─ zohoTenantAuthService.js              [Multi-tenant auth]
  ├─ zohoIntegrationService.js             [Main integration layer]
  ├─ zohoCustomerMatchingService.js        [Customer sync]
  ├─ zohoOrderSyncService.js               [Order sync to Zoho Books]
  ├─ zohoSalesOrderService.js              [Sales order creation]
  ├─ zohoInvoiceService.js                 [Invoice generation]
  ├─ zohoInvoiceSyncService.js             [Invoice sync]
  └─ enhancedOrderProcessingWithZoho.js    [Hybrid order processing]

Status: ⚠️ UNCLEAR IF ACTIVELY USED
        - Code exists and is loaded
        - Middleware is in webhook pipeline
        - But actual API calls unclear

Action Required: Check logs for Zoho API activity
                If not used: Move to services/integrations/zoho/
                If used: Add ZOHO_ENABLED env flag
```

---

## 🗺️ FILE ORGANIZATION PROPOSAL

### Current (Messy):
```
/
├─ index.js
├─ check_cart_db.js ❌
├─ test_discount_fix.js ❌
├─ simulate_discount.js ❌
├─ ... (50+ test files in root)
├─ services/ (150+ files, flat structure)
└─ __deleted_backup/ (200+ files) ❌
```

### Proposed (Clean):
```
/
├─ index.js
├─ routes/
│   ├─ webhook.js
│   ├─ api.js
│   └─ handlers/
│       ├─ customerHandler.js
│       ├─ adminHandler.js
│       └─ modules/
│           ├─ mainHandler.js
│           ├─ intentHandler.js
│           ├─ smartResponseHandler.js
│           └─ ...
├─ services/
│   ├─ core/ ✅ (well-structured)
│   ├─ messaging/
│   │   ├─ messageProvider.js (NEW - abstraction)
│   │   ├─ whatsappWebService.js (Desktop Agent)
│   │   ├─ wahaService.js (Premium bot)
│   │   └─ whatsappService.js (Maytapi fallback)
│   ├─ ai/
│   │   ├─ aiService.js
│   │   ├─ intentClassifier.js
│   │   └─ embeddings.js
│   ├─ integrations/
│   │   └─ zoho/ (isolated if unused)
│   └─ ... (organized by domain)
├─ tests/
│   ├─ unit/
│   ├─ integration/
│   └─ debug/
│       ├─ check_cart_db.js ✅
│       ├─ test_discount_fix.js ✅
│       └─ ...
├─ migrations/
│   └─ archive/ (old SQL files from __deleted_backup)
├─ docs/
│   ├─ SERVICE_CATALOG.md
│   ├─ API_REFERENCE.md
│   └─ archive/ (old .md files from __deleted_backup)
└─ desktop-agent/ ✅
```

---

## 📊 DEPENDENCY STATISTICS

### Total Services: 150+
```
Core Services:     8 (services/core/)
Messaging:         3 (whatsapp*, desktop agent)
AI:                6 (ai*, conversation*)
Orders:            5 (order*, cart*)
Discounts:         6 (discount*)
Customer:          7 (customer*)
Zoho:              9 (zoho*)
Shipping:          4 (shipping*)
Analytics:         3 (analytics*, stats*)
Utilities:        30+ (various helpers)
Legacy/Duplicate: 70+ (need cleanup)
```

### Import Complexity:
```
Most imported services:
  1. whatsappService.js      → 20+ imports ⚠️
  2. config.js (supabase)    → 100+ imports ✅
  3. aiService.js            → 15+ imports ✅
  4. cartService.js          → 12+ imports ✅
  5. pricingService.js       → 10+ imports ✅
```

---

## 🎯 KEY TAKEAWAYS

### What's Good:
✅ Core architecture is solid (multi-tenant, AI bot, orders)
✅ Recent refactoring shows good patterns (customerHandler → modules)
✅ services/core/ is well-organized and maintainable
✅ Desktop Agent is clean, standalone implementation

### What's Problematic:
⚠️ whatsappService.js is hardcoded everywhere (vendor lock-in)
⚠️ Too many duplicate services (discount, cart, customer, AI)
⚠️ Test files polluting root directory
⚠️ Massive __deleted_backup/ folder never cleaned up
⚠️ Zoho integration unclear if used

### Priority Actions:
1. 🔥 Abstract Maytapi dependency (cost savings)
2. 🧹 Clean up root directory (move tests)
3. 🗑️ Archive __deleted_backup/ folder
4. 🔄 Consolidate duplicate services
5. 🔍 Clarify Zoho integration status

---

**End of Dependency Map**  
*Use this to understand call chains when refactoring*  
*Color Key: ✅ Keep | ⚠️ Needs work | ❌ Remove*
