import type { Locale, MovementType, PurchaseStatus, Role, Unit } from './enums.js';

export interface UserDto {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
  locale: Locale;
  createdAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  inn: string;
  address: string;
  markupPercent: number;
  advancePercent: number;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface CategoryDto {
  id: string;
  name: string;
  parentId: string | null;
  markupPercent: number | null;
  isActive: boolean;
}

export interface ProductDto {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  unit: Unit;
  categoryId: string | null;
  salePrice: number;
  priceManual: boolean;
  minStock: number;
  stock: number;
  isLow: boolean;
  imageUrl: string | null;
  isActive: boolean;
  /** Faqat OWNER/BUXGALTER */
  avgCost?: number;
}

export interface SupplierDto {
  id: string;
  name: string;
  phone: string;
  inn: string;
  isActive: boolean;
}

export interface PurchaseLineDto {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  quantity: number;
  /** Quyidagilar faqat OWNER/BUXGALTER */
  price?: number | null;
  allocatedExpense?: number | null;
  landedTotal?: number | null;
  unitCost?: number | null;
}

export interface PurchaseExpenseDto {
  id: string;
  title: string;
  amount: number;
}

export interface PurchaseDto {
  id: string;
  number: number;
  status: PurchaseStatus;
  supplierId: string | null;
  supplierName: string | null;
  note: string;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdByName: string;
  lines: PurchaseLineDto[];
  /** Faqat OWNER/BUXGALTER */
  expenses?: PurchaseExpenseDto[];
  total?: number | null;
}

export interface PurchaseListItemDto {
  id: string;
  number: number;
  status: PurchaseStatus;
  supplierName: string | null;
  createdAt: string;
  lineCount: number;
  total?: number | null;
}

export interface StockMovementDto {
  id: string;
  type: MovementType;
  quantity: number;
  purchaseId: string | null;
  purchaseNumber: number | null;
  note: string;
  userName: string;
  createdAt: string;
  /** Faqat OWNER/BUXGALTER */
  unitCost?: number;
}
