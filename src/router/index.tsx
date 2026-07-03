import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import PrivateRoute from './PrivateRoute'
import RoleRoute from './RoleRoute'

const Login = lazy(() => import('../pages/Login'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const ProductList = lazy(() => import('../pages/Menu/ProductList'))
const CategoryList = lazy(() => import('../pages/Menu/CategoryList'))
const Staff = lazy(() => import('../pages/Staff'))
const Reports = lazy(() => import('../pages/Reports'))
const Promotions = lazy(() => import('../pages/Promotions'))
const CashierHome = lazy(() => import('../pages/Cashier'))
const CashierPayment = lazy(() => import('../pages/Cashier/Payment'))
const CashierFinance = lazy(() => import('../pages/Cashier/Finance'))
const AddReceipt = lazy(() => import('../pages/Cashier/AddReceipt'))
const AddExpense = lazy(() => import('../pages/Cashier/AddExpense'))
const WaiterHome = lazy(() => import('../pages/Waiter'))
const WaiterReturn = lazy(() => import('../pages/Waiter/ReturnItem'))
const BaristaHome = lazy(() => import('../pages/Barista'))
const BaristaInventory = lazy(() => import('../pages/Barista/Inventory'))
const BaristaImport = lazy(() => import('../pages/Barista/ImportStock'))
const BaristaExport = lazy(() => import('../pages/Barista/ExportStock'))
const BaristaStats = lazy(() => import('../pages/Barista/StockStats'))
const BaristaReturns = lazy(() => import('../pages/Barista/Returns'))
const BaristaRecipe = lazy(() => import('../pages/Barista/Recipe'))
const AttendancePage = lazy(() => import('../pages/Attendance'))
const PayrollPage = lazy(() => import('../pages/Payroll'))
const PayrollDetailPage = lazy(() => import('../pages/Payroll/PayrollDetail'))
const Inventory = lazy(() => import('../pages/Inventory'))
const Shift = lazy(() => import('../pages/Shift'))
const OrderList = lazy(() => import('../pages/Order/OrderList'))
const OrderDetail = lazy(() => import('../pages/Order/OrderDetail'))
const TableMap = lazy(() => import('../pages/TableMap'))
const Reservations = lazy(() => import('../pages/Reservations'))
const StaffRequests = lazy(() => import('../pages/StaffRequests'))
const ChangePassword = lazy(() => import('../pages/ChangePassword'))
const ActivityLog = lazy(() => import('../pages/ActivityLog'))
const Trash = lazy(() => import('../pages/Trash'))
const Suppliers = lazy(() => import('../pages/Suppliers'))

const fallback = (
  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
    <Spin size="large" />
  </div>
)

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={fallback}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route element={<PrivateRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
          <Route
            path="/dashboard"
            element={
              <RoleRoute roles={['admin']}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/menu/products"
            element={
              <RoleRoute roles={['admin', 'barista']}>
                <ProductList />
              </RoleRoute>
            }
          />
          <Route
            path="/menu/categories"
            element={
              <RoleRoute roles={['admin']}>
                <CategoryList />
              </RoleRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <RoleRoute roles={['admin']}>
                <Staff />
              </RoleRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleRoute roles={['admin']}>
                <Reports />
              </RoleRoute>
            }
          />
          <Route
            path="/promotions"
            element={
              <RoleRoute roles={['admin']}>
                <Promotions />
              </RoleRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <RoleRoute roles={['admin']}>
                <Inventory />
              </RoleRoute>
            }
          />
          <Route
            path="/shift"
            element={
              <RoleRoute roles={['admin']}>
                <Shift />
              </RoleRoute>
            }
          />
          <Route
            path="/cashier"
            element={
              <RoleRoute roles={['cashier']}>
                <CashierHome />
              </RoleRoute>
            }
          />
          <Route
            path="/cashier/payment"
            element={
              <RoleRoute roles={['cashier']}>
                <CashierPayment />
              </RoleRoute>
            }
          />
          <Route
            path="/invoice"
            element={
              <RoleRoute roles={['cashier']}>
                <CashierPayment />
              </RoleRoute>
            }
          />
          <Route
            path="/cashier/finance"
            element={
              <RoleRoute roles={['cashier']}>
                <CashierFinance />
              </RoleRoute>
            }
          />
          <Route
            path="/cashier/finance/add-receipt"
            element={
              <RoleRoute roles={['cashier']}>
                <AddReceipt />
              </RoleRoute>
            }
          />
          <Route
            path="/cashier/finance/add-expense"
            element={
              <RoleRoute roles={['cashier']}>
                <AddExpense />
              </RoleRoute>
            }
          />
          <Route
            path="/waiter"
            element={
              <RoleRoute roles={['waiter']}>
                <WaiterHome />
              </RoleRoute>
            }
          />
          <Route
            path="/waiter/return/:orderId"
            element={
              <RoleRoute roles={['waiter']}>
                <WaiterReturn />
              </RoleRoute>
            }
          />
          <Route
            path="/barista"
            element={
              <RoleRoute roles={['barista']}>
                <BaristaHome />
              </RoleRoute>
            }
          />
          <Route
            path="/barista/inventory"
            element={
              <RoleRoute roles={['barista']}>
                <BaristaInventory />
              </RoleRoute>
            }
          />
          <Route
            path="/barista/import"
            element={
              <RoleRoute roles={['barista']}>
                <BaristaImport />
              </RoleRoute>
            }
          />
          <Route
            path="/barista/export"
            element={
              <RoleRoute roles={['barista']}>
                <BaristaExport />
              </RoleRoute>
            }
          />
          <Route
            path="/barista/stats"
            element={
              <RoleRoute roles={['barista']}>
                <BaristaStats />
              </RoleRoute>
            }
          />
          <Route
            path="/barista/returns"
            element={
              <RoleRoute roles={['barista']}>
                <BaristaReturns />
              </RoleRoute>
            }
          />
          <Route
            path="/barista/recipes"
            element={
              <RoleRoute roles={['barista']}>
                <BaristaRecipe />
              </RoleRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <RoleRoute roles={['admin']}>
                <AttendancePage />
              </RoleRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <RoleRoute roles={['admin']}>
                <PayrollPage />
              </RoleRoute>
            }
          />
          <Route
            path="/payroll/:userId"
            element={
              <RoleRoute roles={['admin']}>
                <PayrollDetailPage />
              </RoleRoute>
            }
          />
          <Route
            path="/staff-requests"
            element={
              <RoleRoute roles={['admin']}>
                <StaffRequests />
              </RoleRoute>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <RoleRoute roles={['admin']}>
                <ActivityLog />
              </RoleRoute>
            }
          />
          <Route
            path="/trash"
            element={
              <RoleRoute roles={['admin']}>
                <Trash />
              </RoleRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <RoleRoute roles={['admin']}>
                <Suppliers />
              </RoleRoute>
            }
          />
          <Route
            path="/order"
            element={
              <RoleRoute roles={['waiter', 'cashier']}>
                <OrderList />
              </RoleRoute>
            }
          />
          <Route
            path="/cashier/order"
            element={
              <RoleRoute roles={['cashier']}>
                <OrderList />
              </RoleRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <RoleRoute roles={['waiter', 'cashier', 'barista']}>
                <OrderList />
              </RoleRoute>
            }
          />
          <Route
            path="/order/:id"
            element={
              <RoleRoute roles={['waiter', 'cashier']}>
                <OrderDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/tables"
            element={
              <RoleRoute roles={['waiter', 'cashier']}>
                <TableMap />
              </RoleRoute>
            }
          />
          <Route
            path="/table-map"
            element={
              <RoleRoute roles={['waiter', 'cashier']}>
                <TableMap />
              </RoleRoute>
            }
          />
          <Route
            path="/reservations"
            element={
              <RoleRoute roles={['admin', 'waiter']}>
                <Reservations />
              </RoleRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  </BrowserRouter>
)

export default AppRouter
