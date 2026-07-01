#!/bin/bash

# ============================================
# Script tạo folder structure React Café
# Usage: bash create-react-structure.sh
# Chạy trong thư mục root của Vite project
# ============================================

BASE="src"

# ─── File gốc ────────────────────────────────
touch $BASE/main.tsx
touch $BASE/App.tsx
touch $BASE/vite-env.d.ts

# ─── assets/ ─────────────────────────────────
mkdir -p $BASE/assets/images
mkdir -p $BASE/assets/fonts
mkdir -p $BASE/assets/icons

# ─── config/ ─────────────────────────────────
mkdir -p $BASE/config
touch $BASE/config/axios.ts

# ─── constants/ ──────────────────────────────
mkdir -p $BASE/constants
touch $BASE/constants/routes.ts
touch $BASE/constants/queryKeys.ts
touch $BASE/constants/enums.ts

# ─── types/ ──────────────────────────────────
mkdir -p $BASE/types
touch $BASE/types/user.type.ts
touch $BASE/types/product.type.ts
touch $BASE/types/order.type.ts
touch $BASE/types/invoice.type.ts
touch $BASE/types/table.type.ts
touch $BASE/types/category.type.ts
touch $BASE/types/shift.type.ts
touch $BASE/types/ingredient.type.ts
touch $BASE/types/common.type.ts

# ─── store/ ──────────────────────────────────
mkdir -p $BASE/store
touch $BASE/store/auth.store.ts
touch $BASE/store/cart.store.ts
touch $BASE/store/ui.store.ts

# ─── hooks/ ──────────────────────────────────
mkdir -p $BASE/hooks
touch $BASE/hooks/useAuth.ts
touch $BASE/hooks/useDebounce.ts
touch $BASE/hooks/usePagination.ts

# ─── services/ ───────────────────────────────
mkdir -p $BASE/services
touch $BASE/services/auth.service.ts
touch $BASE/services/user.service.ts
touch $BASE/services/product.service.ts
touch $BASE/services/category.service.ts
touch $BASE/services/order.service.ts
touch $BASE/services/invoice.service.ts
touch $BASE/services/table.service.ts
touch $BASE/services/shift.service.ts
touch $BASE/services/ingredient.service.ts
touch $BASE/services/report.service.ts

# ─── Helper: tạo component folder với index.tsx ──
make_component() {
  mkdir -p "$1"
  touch "$1/index.tsx"
}

# ─── components/common/ ──────────────────────
make_component $BASE/components/common/AppLayout
make_component $BASE/components/common/Sidebar
make_component $BASE/components/common/Header
make_component $BASE/components/common/ConfirmModal
make_component $BASE/components/common/PageHeader

# ─── components/forms/ ───────────────────────
make_component $BASE/components/forms/ProductForm
make_component $BASE/components/forms/UserForm
make_component $BASE/components/forms/CategoryForm
make_component $BASE/components/forms/OrderForm

# ─── pages/ ──────────────────────────────────
make_component $BASE/pages/Login
make_component $BASE/pages/Dashboard
make_component $BASE/pages/TableMap
make_component $BASE/pages/Order/OrderList
make_component $BASE/pages/Order/OrderDetail
make_component $BASE/pages/Menu/ProductList
make_component $BASE/pages/Menu/CategoryList
make_component $BASE/pages/Invoice
make_component $BASE/pages/Staff
make_component $BASE/pages/Shift
make_component $BASE/pages/Inventory
make_component $BASE/pages/Reports

# ─── router/ ─────────────────────────────────
mkdir -p $BASE/router
touch $BASE/router/index.tsx
touch $BASE/router/PrivateRoute.tsx
touch $BASE/router/RoleRoute.tsx

echo ""
echo "✅ Done! React folder structure created successfully."
echo ""
echo "📁 Tree preview:"
find $BASE -type f | sort | sed 's|[^/]*/|  |g'
