export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'customer' | 'seller' | 'admin';
  createdAt: string;
  businessName?: string;
  businessDescription?: string;
  isOnline?: boolean;
  isCertified?: boolean;
  location?: string;
  phoneAirtel?: string;
  phoneMTN?: string;
  socialHandles?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
  };
  coverPhoto?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  isAuthentic: boolean;
  authenticationDetails?: string;
  ratingAvg: number;
  reviewCount: number;
  sellerId: string;
  sellerName?: string;
  seller?: User;
  createdAt: string;
  visitCount: number;
  likeCount: number;
  isOnline?: boolean;
  discount?: number;
  bulkDiscountMinQty?: number;
  bulkDiscountPercent?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  createdAt: string;
  type: 'system' | 'user' | 'seller' | 'text' | 'image' | 'file';
  read: boolean;
  attachment?: string;
  replyTo?: string;
  isEncrypted?: boolean;
  receipts?: MessageReceipt[];
}

export interface MessageReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
  deliveredAt: string;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentId?: string;
  trackingNumber?: string;
  sellerIds: string[];
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}
