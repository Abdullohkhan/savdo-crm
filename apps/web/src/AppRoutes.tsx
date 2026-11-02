import { CATALOG_EDIT_ROLES, PURCHASE_DRAFT_ROLES, Role } from '@savdo/shared';
import { Route, Routes } from 'react-router';
import { RequireAuth, RequireRole } from '@/components/guards';
import { Layout } from '@/components/Layout';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { ForbiddenPage, NotFoundPage } from '@/pages/ErrorPages';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { ProductFormPage } from '@/pages/ProductFormPage';
import { ProductPage } from '@/pages/ProductPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { PurchaseEditorPage } from '@/pages/PurchaseEditorPage';
import { PurchasesPage } from '@/pages/PurchasesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SuppliersPage } from '@/pages/SuppliersPage';
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
