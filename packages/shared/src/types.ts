import type {
  CustomerType,
  DocLocale,
  DocumentStatus,
  DocumentType,
  Locale,
  MovementType,
  NotificationEntity,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PurchaseStatus,
  Role,
  Unit,
} from './enums.js';

export interface UserDto {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
  locale: Locale;
  /** Telegram bot ulanganmi */
  telegramLinked: boolean;
  createdAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  inn: string;
  address: string;
  markupPercent: number;
  advancePercent: number;
  phone: string;
  director: string;
  bankName: string;
  bankAccount: string;
  bankMfo: string;
  docLocale: DocLocale;
  shartnomaPrefix: string;
  hisobFakturaPrefix: string;
  yukXatiPrefix: string;
  aktPrefix: string;
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
  orderId: string | null;
  orderNumber: number | null;
  note: string;
  userName: string;
  createdAt: string;
  /** Faqat OWNER/BUXGALTER */
  unitCost?: number;
}

// ---------- 3-bosqich: savdo ----------

export interface CustomerDto {
  id: string;
  type: CustomerType;
  name: string;
  phone: string;
  inn: string;
  address: string;
  creditLimit: number;
  /** Ochiq nasiyalar qoldig'i yig'indisi */
  debt: number;
  hasOverdue: boolean;
  isActive: boolean;
}

export interface OrderLineDto {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: Unit;
  quantity: number;
  listPrice: number;
  price: number;
  total: number;
  picked: boolean;
  /** Narx tannarxdan past — OWNER tasdig'i kerak (tannarxning o'zi ko'rsatilmaydi) */
  belowCost: boolean;
  /** Faqat OWNER/BUXGALTER */
  unitCost?: number | null;
}

export interface OrderStatusLogDto {
  from: OrderStatus | null;
  to: OrderStatus;
  userName: string;
  reason: string | null;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  orderNumber: number;
  customerName: string;
  method: PaymentMethod;
  amount: number;
  isAdvance: boolean;
  status: PaymentStatus;
  note: string;
  receivedByName: string;
  confirmedByName: string | null;
  rejectReason: string | null;
  createdAt: string;
}

export interface DebtDto {
  id: string;
  orderId: string;
  orderNumber: number;
  customerId: string;
  customerName: string;
  amount: number;
  remaining: number;
  dueDate: string;
  closedAt: string | null;
  isOverdue: boolean;
}

export interface OrderDto {
  id: string;
  number: number;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  note: string;
  total: number;
  advancePercent: number;
  advanceRequired: number;
  paidConfirmed: number;
  paidPending: number;
  /** Tannarxdan past qator bor va OWNER hali ruxsat bermagan */
  needsPriceApproval: boolean;
  priceApproved: boolean;
  cancelReason: string | null;
  createdAt: string;
  lines: OrderLineDto[];
  history: OrderStatusLogDto[];
  payments: PaymentDto[];
  debt: DebtDto | null;
  /** Faqat OWNER/BUXGALTER, jo'natilgandan keyin */
  costTotal?: number | null;
  profit?: number | null;
}

export interface OrderListItemDto {
  id: string;
  number: number;
  status: OrderStatus;
  customerName: string;
  sellerName: string;
  total: number;
  paidConfirmed: number;
  needsPriceApproval: boolean;
  createdAt: string;
}

export interface ShortageDto {
  productId: string;
  productName: string;
  unit: Unit;
  required: number;
  available: number;
  missing: number;
}

export interface DashboardDto {
  /** Rolga qarab: OWNER — narx ruxsati */
  priceApprovals?: OrderListItemDto[];
  /** BUXGALTER/OWNER */
  paymentsToConfirm?: PaymentDto[];
  /** Avans kutayotgan buyurtmalar */
  awaitingAdvance?: OrderListItemDto[];
  /** OMBORCHI/OWNER */
  toPick?: OrderListItemDto[];
  /** SOTUVCHI/BUXGALTER/OWNER: jo'natilgan, yakunlanmagan */
  toComplete?: OrderListItemDto[];
  /** SOTUVCHI: o'z qoralamalari */
  drafts?: OrderListItemDto[];
  /** Muddati o'tgan yoki 3 kun ichida tugaydigan nasiyalar */
  debtsDue?: DebtDto[];
}

// ---------- 4-bosqich: hujjat va xabar ----------

export interface DocumentDto {
  id: string;
  type: DocumentType;
  /** Masalan SH-2026-0001 */
  number: string;
  status: DocumentStatus;
  locale: DocLocale;
  orderId: string;
  orderNumber: number;
  customerName: string;
  templateVersion: number;
  createdByName: string;
  createdAt: string;
  signedAt: string | null;
  signedByName: string | null;
}

export interface DocumentTemplateDto {
  id: string;
  type: DocumentType;
  locale: DocLocale;
  name: string;
  html: string;
  isDefault: boolean;
  version: number;
  updatedAt: string;
}

export interface TemplatePreviewDto {
  html: string;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  /** i18n parametrlari: `notifications.<type>` matniga */
  params: Record<string, string | number>;
  entity: NotificationEntity | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountDto {
  count: number;
}

export interface TelegramLinkDto {
  code: string;
  expiresAt: string;
  /** Bot sozlanmagan bo'lsa — null */
  botUsername: string | null;
  deepLink: string | null;
}
