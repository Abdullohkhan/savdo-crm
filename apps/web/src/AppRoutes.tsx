import {
  CATALOG_EDIT_ROLES,
  CUSTOMER_ROLES,
  DOCUMENT_VIEW_ROLES,
  PAYMENT_RECEIVE_ROLES,
  PURCHASE_DRAFT_ROLES,
  Role,
  SALES_ROLES,
} from '@savdo/shared';
import { Route, Routes } from 'react-router';
import { RequireAuth, RequireRole } from '@/components/guards';
import { Layout } from '@/components/Layout';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { CustomerPage } from '@/pages/CustomerPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { ForbiddenPage, NotFoundPage } from '@/pages/ErrorPages';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { MenuPage } from '@/pages/MenuPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { OrderEditorPage } from '@/pages/OrderEditorPage';
import { OrderPage } from '@/pages/OrderPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { ProductFormPage } from '@/pages/ProductFormPage';
import { ProductPage } from '@/pages/ProductPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { PurchaseEditorPage } from '@/pages/PurchaseEditorPage';
import { PurchasesPage } from '@/pages/PurchasesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { TemplateEditorPage } from '@/pages/TemplateEditorPage';
import { UsersPage } from '@/pages/UsersPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="documents"
          element={
            <RequireRole roles={DOCUMENT_VIEW_ROLES}>
              <DocumentsPage />
            </RequireRole>
          }
        />
        <Route
          path="documents/templates/:id"
          element={
            <RequireRole roles={[Role.OWNER]}>
              <TemplateEditorPage />
            </RequireRole>
          }
        />
        <Route path="orders" element={<OrdersPage />} />
        <Route
          path="orders/new"
          element={
            <RequireRole roles={SALES_ROLES}>
              <OrderEditorPage />
            </RequireRole>
          }
        />
        <Route path="orders/:id" element={<OrderPage />} />
        <Route
          path="orders/:id/edit"
          element={
            <RequireRole roles={SALES_ROLES}>
              <OrderEditorPage />
            </RequireRole>
          }
        />
        <Route
          path="customers"
          element={
            <RequireRole roles={CUSTOMER_ROLES}>
              <CustomersPage />
            </RequireRole>
          }
        />
        <Route
          path="customers/:id"
          element={
            <RequireRole roles={CUSTOMER_ROLES}>
              <CustomerPage />
            </RequireRole>
          }
        />
        <Route
          path="payments"
          element={
            <RequireRole roles={PAYMENT_RECEIVE_ROLES}>
              <PaymentsPage />
            </RequireRole>
          }
        />
        <Route path="products" element={<ProductsPage />} />
        <Route
          path="products/new"
          element={
            <RequireRole roles={CATALOG_EDIT_ROLES}>
              <ProductFormPage />
            </RequireRole>
          }
        />
        <Route path="products/:id" element={<ProductPage />} />
        <Route
          path="products/:id/edit"
          element={
            <RequireRole roles={CATALOG_EDIT_ROLES}>
              <ProductFormPage />
            </RequireRole>
          }
        />
        <Route
          path="categories"
          element={
            <RequireRole roles={CATALOG_EDIT_ROLES}>
              <CategoriesPage />
            </RequireRole>
          }
        />
        <Route
          path="suppliers"
          element={
            <RequireRole roles={PURCHASE_DRAFT_ROLES}>
              <SuppliersPage />
            </RequireRole>
          }
        />
        <Route
          path="purchases"
          element={
            <RequireRole roles={PURCHASE_DRAFT_ROLES}>
              <PurchasesPage />
            </RequireRole>
          }
        />
        <Route
          path="purchases/new"
          element={
            <RequireRole roles={PURCHASE_DRAFT_ROLES}>
              <PurchaseEditorPage />
            </RequireRole>
          }
        />
        <Route
          path="purchases/:id"
          element={
            <RequireRole roles={PURCHASE_DRAFT_ROLES}>
              <PurchaseEditorPage />
            </RequireRole>
          }
        />
        <Route
          path="users"
          element={
            <RequireRole roles={[Role.OWNER]}>
              <UsersPage />
            </RequireRole>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
