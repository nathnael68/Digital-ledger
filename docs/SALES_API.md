# Sales Management & Payment API Reference

All API routes are served under `/api` and require an active session (via HttpOnly session cookie or `Authorization: Bearer <token>`).

---

## 1. Product Catalog Endpoints

### `GET /api/products`
Retrieves products from the catalog. Auto-seeds default Ethiopian printing supply items if table is empty.

**Query Parameters:**
- `search` (string, optional): Search product name or description.
- `active_only` (boolean, default: true): Filter active products.
- `limit` (integer, default: 50): Number of results.

### `GET /api/products/search`
Fast typeahead lookup endpoint for product line selection.

**Query Parameters:**
- `q` (string): Search query string.
- `limit` (integer, default: 20).

### `POST /api/products`
Adds a new product to the catalog.

**Request Body (`ProductCreate`):**
```json
{
  "name": "Heavy Duty Glossy Vinyl Roll 50m",
  "description": "Outdoor digital printing vinyl",
  "default_price": "5200.00",
  "unit": "roll",
  "is_active": true
}
```

---

## 2. Customer Management Endpoints

### `GET /api/customers`
Retrieves customer profiles.

### `GET /api/customers/search`
Typeahead search endpoint for customer lookup by name or phone.

### `POST /api/customers`
Creates a new customer profile.

**Request Body (`CustomerCreate`):**
```json
{
  "name": "Abyssinia Graphic Design & Print",
  "phone": "+251 91 122 3344",
  "address": "Bole Sub-City, Addis Ababa"
}
```

---

## 3. Sales Transaction Endpoints

### `POST /api/sales`
Creates a finalized sales transaction atomically with multi-line items and optional initial payment.

**Request Body (`SaleCreate`):**
```json
{
  "fs_number": "FS-2026-00451",
  "paper_receipt_number": "PR-09881",
  "customer_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "discount": "150.00",
  "notes": "Urgent order for Piazza print shop",
  "items": [
    {
      "product_id": "prod-uuid-here",
      "product_name": "A4 Photocopy Paper 80gsm",
      "unit": "box",
      "quantity": "5.000",
      "unit_price": "2450.00"
    },
    {
      "product_id": null,
      "product_name": "Custom Glossy Laminating Roll",
      "unit": "roll",
      "quantity": "2.000",
      "unit_price": "1200.00"
    }
  ],
  "initial_payment": {
    "payment_method": "cash",
    "amount": "14500.00",
    "reference": "Counter Register #1"
  },
  "idempotency_key": "unique-client-key"
}
```

**Response (`201 Created` - `SaleDetailResponse`):**
```json
{
  "id": "e93bc0c1-3950-425b-8628-98e6d234661a",
  "sale_number": "DL-2026-0001",
  "fs_number": "FS-2026-00451",
  "customer_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customer_name": "Abyssinia Graphic Design & Print",
  "sale_date": "2026-11-16T09:30:00Z",
  "subtotal": "14650.00",
  "discount": "150.00",
  "grand_total": "14500.00",
  "total_paid": "14500.00",
  "outstanding_balance": "0.00",
  "paper_receipt_number": "PR-09881",
  "payment_status": "paid",
  "notes": "Urgent order for Piazza print shop",
  "created_by": "user-uuid",
  "created_by_name": "Almaz Cashier",
  "created_at": "2026-11-16T09:30:00Z",
  "updated_at": "2026-11-16T09:30:00Z",
  "voided_at": null,
  "items": [...],
  "payments": [...]
}
```

### `GET /api/sales`
Retrieves paginated digital sales ledger records with multi-criteria filtering.

**Query Parameters:**
- `search`: Search query string matching sale #, FS #, customer name, paper receipt #, or line item description.
- `payment_status`: Filter by status (`paid`, `partial`, `credit`, `voided`).
- `payment_method`: Filter by payment method (`cash`, `bank_transfer`).
- `customer_id`: Filter by specific customer UUID.
- `created_by`: Filter by employee UUID.
- `date_from`: ISO 8601 start date.
- `date_to`: ISO 8601 end date.
- `page`: Page number (default: 1).
- `page_size`: Records per page (default: 15, max: 100).

### `GET /api/sales/{id}`
Retrieves full details for a single transaction, including item snapshots, payment history, and audit attributes.

### `PUT /api/sales/{id}`
Corrects transaction metadata (Customs FS Number, paper receipt reference, notes).

**Request Body (`SaleCorrectionInput`):**
```json
{
  "fs_number": "FS-2026-00451-REV",
  "paper_receipt_number": "PR-09881-A",
  "notes": "Inspector verified receipt replacement",
  "reason": "Corrected typo on physical receipt number"
}
```

### `POST /api/sales/{id}/void`
Voids a sales transaction with mandatory justification.

**Request Body (`SaleVoidInput`):**
```json
{
  "reason": "Duplicate transaction entered in error by counter clerk"
}
```

---

## 4. Payment Recording Endpoints

### `POST /api/sales/{id}/payments`
Records an installment or full settlement payment against an outstanding sale.

**Request Body (`PaymentCreate`):**
```json
{
  "amount": "2500.00",
  "payment_method": "bank_transfer",
  "reference": "CBE-MOBILE-TRX-998822",
  "idempotency_key": "unique-payment-key"
}
```

### `GET /api/sales/{id}/payments`
Lists complete chronological payment history for a given sale.
