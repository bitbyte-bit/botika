import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  User as UserIcon, 
  MessageSquare, 
  Package, 
  Settings, 
  Star, 
  ShieldCheck, 
  ArrowRight, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Heart,
  Home,
  Menu,
  Camera,
  CreditCard,
  Lock,
  Smartphone
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Toaster, toast } from 'sonner';

import { User, Product, Order, CartItem, Review, Message, Follow, AppNotification, OperationType } from './types';
import { api } from './services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// --- Contexts ---

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  handleGoogleSuccess: (credentialResponse: any) => void;
  setUser: (user: User | null) => void;
} | null>(null);

const CartContext = createContext<{
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
} | null>(null);

const CurrencyContext = createContext<{
  currency: 'USD' | 'UGX';
  setCurrency: (c: 'USD' | 'UGX') => void;
  formatPrice: (price: number) => string;
} | null>(null);

// --- Providers ---

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('bikuumba_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = () => {
    setIsLoginModalOpen(true);
  };

  const logout = () => {
    googleLogout();
    localStorage.removeItem('bikuumba_user');
    setUser(null);
    toast.success("Logged out successfully");
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const uid = decoded.sub;
      const email = decoded.email;
      const displayName = decoded.name;
      const photoURL = decoded.picture;

      // Fetch user from SQL
      let sqlUser = await api.get(`/users/${uid}`);
      if (!sqlUser) {
        sqlUser = {
          uid,
          email,
          displayName,
          photoURL,
          role: email === 'bitbyte790@gmail.com' || email === 'bikuumba26@gmail.com' ? 'admin' : 'customer',
          createdAt: new Date().toISOString(),
        };
        await api.post('/users', sqlUser);
      }
      
      localStorage.setItem('bikuumba_user', JSON.stringify(sqlUser));
      setUser(sqlUser);
      setIsLoginModalOpen(false);
      toast.success(`Welcome back, ${displayName}!`);
    } catch (error) {
      console.error("Login failed", error);
      toast.error("Login failed. Please try again.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isLoginModalOpen, setIsLoginModalOpen, handleGoogleSuccess, setUser }}>
      {children}
      <LoginModal />
    </AuthContext.Provider>
  );
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.images[0] }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.productId === productId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setItems([]);

  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<'USD' | 'UGX'>('USD');
  const rate = 3700; // 1 USD = 3700 UGX

  const formatPrice = (price: number) => {
    if (currency === 'UGX') {
      return `UGX ${(price * rate).toLocaleString()}`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

// --- Hooks ---

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
};

// --- Components ---

const LoginModal = () => {
  const context = useContext(AuthContext);
  if (!context) return null;
  const { isLoginModalOpen, setIsLoginModalOpen, handleGoogleSuccess, setUser } = context;
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const newUser = await api.post('/auth/signup', { email, password, displayName });
        localStorage.setItem('bikuumba_user', JSON.stringify(newUser));
        setUser(newUser);
      } else {
        const user = await api.post('/auth/login', { email, password });
        localStorage.setItem('bikuumba_user', JSON.stringify(user));
        setUser(user);
      }
      setIsLoginModalOpen(false);
      toast.success(isSignUp ? "Account created!" : "Welcome back!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="serif text-3xl text-center">
            {isSignUp ? 'Create Account' : 'Welcome to Bikuumba'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSignUp ? 'Join our curated boutique community' : 'Sign in to your account'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleEmailAuth} className="space-y-4 py-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="John Doe" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)} 
                required 
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              type="email" 
              placeholder="name@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <Button type="submit" className="w-full h-12 text-lg rounded-full" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              toast.error("Login Failed");
            }}
            useOneTap
            shape="circle"
            width="100%"
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            className="text-accent font-medium hover:underline"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

        <div className="text-center text-xs text-muted-foreground mt-2">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BottomNav = ({ currentView, onNavigate }: { currentView: string, onNavigate: (view: string) => void }) => {
  const { user, login } = useAuth();
  const { itemCount } = useCart();

  const handleBusinessClick = () => {
    if (!user) {
      login();
      return;
    }
    onNavigate('inventory');
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'inventory', label: 'Business', icon: LayoutDashboard, action: handleBusinessClick },
    { id: 'cart', label: 'Bag', icon: ShoppingBag, badge: itemCount },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-lg border-t pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : onNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-accent' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge className="absolute -right-2 -top-2 h-4 w-4 justify-center rounded-full p-0 text-[8px]">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const InboxView = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const fetchInbox = async () => {
    if (!user) return;
    try {
      const [msgs, notifs] = await Promise.all([
        api.get(`/messages/${user.uid}`),
        api.get(`/notifications/${user.uid}`)
      ]);
      setMessages(msgs);
      setNotifications(notifs);
    } catch (error) {
      console.error("Failed to fetch inbox", error);
    }
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [user]);

  const markMessageAsRead = async (msgId: string) => {
    try {
      await api.patch(`/messages/${msgId}/read`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
    } catch (error) {
      console.error("Failed to mark message as read", error);
    }
  };

  const markNotificationAsRead = async (notifId: string) => {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const unreadMessagesCount = messages.filter(m => !m.read).length;
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  if (!user) return (
    <div className="container mx-auto px-4 py-20 text-center space-y-4">
      <MessageSquare className="h-12 w-12 mx-auto opacity-20" />
      <p className="text-muted-foreground">Please sign in to view your inbox.</p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24">
      <h2 className="text-4xl serif">Inbox</h2>
      
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="w-full bg-secondary/50 p-1 rounded-full">
          <TabsTrigger value="messages" className="flex-1 rounded-full relative">
            Messages
            {unreadMessagesCount > 0 && (
              <Badge className="ml-2 bg-accent text-white h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {unreadMessagesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 rounded-full relative">
            Notifications
            {unreadNotificationsCount > 0 && (
              <Badge className="ml-2 bg-accent text-white h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {unreadNotificationsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-6 space-y-4">
          {messages.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map(msg => (
              <Card 
                key={msg.id} 
                className={`border-none shadow-sm transition-colors cursor-pointer ${msg.read ? 'bg-paper' : 'bg-accent/5'}`}
                onClick={() => markMessageAsRead(msg.id)}
              >
                <CardContent className="p-4 flex gap-4">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{msg.senderName[0]}</AvatarFallback>
                    </Avatar>
                    {!msg.read && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${msg.read ? 'font-medium' : 'font-bold'}`}>{msg.senderName}</p>
                      <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className={`text-sm ${msg.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>{msg.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-4">
          {notifications.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map(notif => (
              <Card 
                key={notif.id} 
                className={`border-none shadow-sm transition-colors cursor-pointer ${notif.read ? 'bg-paper' : 'bg-accent/5'}`}
                onClick={() => markNotificationAsRead(notif.id)}
              >
                <CardContent className="p-4 flex gap-4">
                  <div className={`h-2 w-2 rounded-full mt-2 ${notif.read ? 'bg-transparent' : 'bg-accent'}`} />
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm ${notif.read ? 'font-medium' : 'font-bold'}`}>{notif.title}</p>
                    <p className="text-sm text-muted-foreground">{notif.content}</p>
                    <span className="text-[10px] text-muted-foreground">{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const BusinessProfileModal = ({ sellerId, onClose }: { sellerId: string, onClose: () => void }) => {
  const { user } = useAuth();
  const [seller, setSeller] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchData = async () => {
    try {
      const [s, p] = await Promise.all([
        api.get(`/users/${sellerId}`),
        api.get('/products')
      ]);
      setSeller(s);
      setProducts(p.filter((prod: Product) => prod.sellerId === sellerId));

      if (user) {
        const follows = await api.get(`/follows/${user.uid}`);
        setIsFollowing(follows.some((f: any) => f.followingId === sellerId));
      }
    } catch (error) {
      console.error("Failed to fetch business profile", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sellerId, user]);

  const handleFollow = async () => {
    if (!user) return toast.error("Please sign in to follow");
    try {
      if (isFollowing) {
        await api.delete(`/follows?followerId=${user.uid}&followingId=${sellerId}`);
        setIsFollowing(false);
        toast.success("Unfollowed");
      } else {
        await api.post('/follows', {
          id: crypto.randomUUID(),
          followerId: user.uid,
          followingId: sellerId,
          createdAt: new Date().toISOString()
        });
        
        // Send notification to seller
        await api.post('/notifications', {
          id: crypto.randomUUID(),
          userId: sellerId,
          title: "New Follower",
          content: `${user.displayName} started following your boutique!`,
          createdAt: new Date().toISOString(),
          read: false
        });

        setIsFollowing(true);
        toast.success("Following boutique");
      }
    } catch (e) {
      toast.error("Action failed");
    }
  };

  const handleChat = async () => {
    if (!user) return toast.error("Please sign in to chat");
    // Simple chat initiation - send a system message or just open a dialog
    toast.info("Chat feature coming soon! You can now follow this boutique.");
  };

  if (!seller) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-paper border-none">
        <div className="h-40 bg-accent relative">
          <Avatar className="h-24 w-24 absolute -bottom-12 left-8 border-4 border-paper shadow-xl">
            <AvatarImage src={seller.photoURL} />
            <AvatarFallback className="text-2xl">{seller.displayName[0]}</AvatarFallback>
          </Avatar>
        </div>
        <div className="pt-16 px-8 pb-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl serif">{seller.businessName || seller.displayName}</h2>
              <p className="text-muted-foreground text-sm">{seller.businessDescription || 'Curated boutique seller'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant={isFollowing ? 'outline' : 'default'} className="rounded-full" onClick={handleFollow}>
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" onClick={handleChat}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium uppercase tracking-widest text-xs">Boutique Items</h3>
            <div className="grid grid-cols-2 gap-4">
              {products.map(p => (
                <div key={p.id} className="group cursor-pointer">
                  <div className="aspect-square rounded-xl overflow-hidden bg-secondary">
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                  <p className="mt-2 text-sm font-medium line-clamp-1">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const { formatPrice } = useCurrency();

  const fetchData = async () => {
    try {
      const [u, p, o] = await Promise.all([
        api.get('/users'),
        api.get('/products'),
        api.get('/orders')
      ]);
      setUsers(u);
      setProducts(p);
      setOrders(o);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600' },
    { label: 'Total Products', value: products.length, icon: Package, color: 'text-amber-600' },
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-emerald-600' },
    { label: 'Platform Revenue', value: formatPrice(orders.reduce((sum, o) => sum + o.total, 0)), icon: TrendingUp, color: 'text-purple-600' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-12 pb-24">
      <div>
        <h2 className="text-4xl serif">Platform Administration</h2>
        <p className="text-muted-foreground">Global overview and management of Bikuumba.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none bg-paper shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-secondary ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-medium">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-paper p-1 rounded-full border">
          <TabsTrigger value="users" className="rounded-full px-8">Users</TabsTrigger>
          <TabsTrigger value="products" className="rounded-full px-8">Products</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-full px-8">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="border-none bg-paper shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground uppercase tracking-widest text-[10px]">
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Joined</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.uid} className="border-b last:border-0">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback>{u.displayName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.displayName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="capitalize">{u.role}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right flex gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            const newRole = u.role === 'admin' ? 'customer' : 'admin';
                            await api.post('/users', { ...u, role: newRole });
                            fetchData();
                            toast.success(`Role updated to ${newRole}`);
                          }}
                        >
                          Toggle Admin
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card className="border-none bg-paper shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground uppercase tracking-widest text-[10px]">
                    <th className="p-4 font-medium">Product</th>
                    <th className="p-4 font-medium">Seller ID</th>
                    <th className="p-4 font-medium">Stock</th>
                    <th className="p-4 font-medium">Price</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={p.images[0]} alt={p.name} className="h-8 w-8 rounded object-cover bg-secondary" />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{p.sellerId.slice(0, 8)}...</td>
                      <td className="p-4">{p.stock}</td>
                      <td className="p-4">${p.price}</td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={async () => {
                            await api.delete(`/products/${p.id}`);
                            fetchData();
                            toast.success("Product removed");
                          }}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card className="border-none bg-paper shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground uppercase tracking-widest text-[10px]">
                    <th className="p-4 font-medium">Order ID</th>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Total</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="p-4 font-mono text-xs">#{o.id.slice(-8).toUpperCase()}</td>
                      <td className="p-4 text-muted-foreground">{o.customerId.slice(0, 8)}...</td>
                      <td className="p-4 font-medium">${o.total.toFixed(2)}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className="capitalize">{o.status}</Badge>
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ProfileView = ({ onNavigate, onSelectSeller }: { onNavigate: (view: string) => void, onSelectSeller: (id: string) => void }) => {
  const { user, login, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<Partial<User>>({});
  const [followedBusinesses, setFollowedBusinesses] = useState<User[]>([]);

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName,
        photoURL: user.photoURL || '',
        businessName: user.businessName || '',
        businessDescription: user.businessDescription || ''
      });

      // Fetch followed businesses
      const fetchFollowed = async () => {
        try {
          const follows = await api.get(`/follows/${user.uid}`);
          if (follows.length > 0) {
            const sellers = await Promise.all(follows.map((f: any) => api.get(`/users/${f.followingId}`)));
            setFollowedBusinesses(sellers.filter(Boolean));
          } else {
            setFollowedBusinesses([]);
          }
        } catch (error) {
          console.error("Failed to fetch followed businesses", error);
        }
      };
      fetchFollowed();
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await api.post('/users', { ...user, ...profileData });
      toast.success("Profile updated");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 0.5MB limit
        toast.error("Image too large. Please choose an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-8">
        <div className="p-6 rounded-full bg-secondary">
          <UserIcon className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl serif">Join Bikuumba</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sign in to manage your orders, chat with sellers, and access your boutique dashboard.
          </p>
        </div>
        <Button size="lg" onClick={login} className="rounded-full px-12 h-14 text-lg">
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-12 pb-24">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-paper shadow-xl">
            <AvatarImage src={user.photoURL} />
            <AvatarFallback className="text-3xl">{user.displayName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-4xl serif">{user.displayName}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="mt-2 capitalize">{user.role}</Badge>
          </div>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => setIsEditing(true)}>
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none bg-paper shadow-sm">
          <CardHeader>
            <CardTitle className="serif">Account Settings</CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Display Name</span>
              <span className="font-medium">{user.displayName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="text-destructive w-full" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </CardFooter>
        </Card>

        {user.role !== 'customer' && (
          <Card className="border-none bg-paper shadow-sm">
            <CardHeader>
              <CardTitle className="serif">Business Profile</CardTitle>
              <CardDescription>How your boutique appears to others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Boutique Name</p>
                <p className="font-medium">{user.businessName || 'Not set'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Description</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {user.businessDescription || 'No description provided yet.'}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full rounded-full" onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'inventory')}>
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl serif">Followed Businesses</h3>
        {followedBusinesses.length === 0 ? (
          <Card className="border-none bg-paper shadow-sm p-8 text-center">
            <p className="text-muted-foreground">You are not following any businesses yet.</p>
            <Button variant="link" onClick={() => onNavigate('home')}>Explore Boutiques</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {followedBusinesses.map(business => (
              <Card 
                key={business.uid} 
                className="border-none bg-paper shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectSeller(business.uid)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={business.photoURL} />
                    <AvatarFallback>{business.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{business.businessName || business.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{business.businessDescription || 'Boutique'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="serif text-2xl">Edit Profile</DialogTitle>
            <DialogDescription>Update your personal and business information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4 mb-4">
              <Avatar className="h-24 w-24 border-2 border-accent">
                <AvatarImage src={profileData.photoURL} />
                <AvatarFallback className="text-3xl">{profileData.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="relative">
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="photo-upload" 
                  onChange={handleFileChange}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" /> Change Photo
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={profileData.displayName} onChange={e => setProfileData({...profileData, displayName: e.target.value})} />
            </div>
            {user.role !== 'customer' && (
              <>
                <div className="space-y-2">
                  <Label>Boutique Name</Label>
                  <Input value={profileData.businessName} onChange={e => setProfileData({...profileData, businessName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Boutique Description</Label>
                  <Textarea 
                    value={profileData.businessDescription} 
                    onChange={e => setProfileData({...profileData, businessDescription: e.target.value})} 
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>
          <Button className="w-full h-12" onClick={handleUpdateProfile}>Save Changes</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Navbar = ({ onNavigate, onOpenMenu, onSearch }: { onNavigate: (view: string) => void, onOpenMenu: () => void, onSearch: (q: string) => void }) => {
  const { user, login, logout } = useAuth();
  const { items, total, itemCount, updateQuantity, removeItem } = useCart();
  const { formatPrice } = useCurrency();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMenu}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 
            className="cursor-pointer text-2xl font-bold tracking-tighter serif"
            onClick={() => onNavigate('home')}
          >
            BIKUUMBA
          </h1>
          <div className="hidden md:flex gap-6 text-sm font-medium">
            <button onClick={() => onNavigate('home')} className="hover:text-accent transition-colors">Shop</button>
            <button onClick={() => onNavigate('inbox')} className="hover:text-accent transition-colors">Inbox</button>
            <button onClick={() => onNavigate('about')} className="hover:text-accent transition-colors">Our Story</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search boutique..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-[200px] pl-8 md:w-[300px] bg-secondary/50 border-none"
            />
          </div>

          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 justify-center rounded-full p-0 text-[10px]">
                  {itemCount}
                </Badge>
              )}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="serif text-2xl">Your Bag</SheetTitle>
                <SheetDescription>Review your items before checkout.</SheetDescription>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-6 h-[calc(100vh-200px)]">
                <ScrollArea className="flex-1 pr-4">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mb-2 opacity-20" />
                      <p>Your bag is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {items.map(item => (
                        <div key={item.productId} className="flex gap-4">
                          <img src={item.image} alt={item.name} className="h-20 w-20 rounded-lg object-cover bg-secondary" />
                          <div className="flex-1 space-y-1">
                            <h4 className="font-medium text-sm">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">{formatPrice(item.price)}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm w-4 text-center">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(item.productId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {items.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-between text-lg font-medium">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <Button className="w-full h-12 text-lg" onClick={() => onNavigate('checkout')}>
                      Checkout
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full overflow-hidden" />}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate('orders')}>
                  <Package className="mr-2 h-4 w-4" /> Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const newRole = user.role === 'customer' ? 'seller' : 'customer';
                  await api.post('/users', { ...user, role: newRole });
                  toast.success(`Role changed to ${newRole}`);
                }}>
                  <UserIcon className="mr-2 h-4 w-4" /> Switch to {user.role === 'customer' ? 'Seller' : 'Customer'}
                </DropdownMenuItem>
                {user.role === 'seller' && (
                  <DropdownMenuItem onClick={() => onNavigate('inventory')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Inventory
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={login} variant="outline" className="rounded-full">
              <UserIcon className="mr-2 h-4 w-4" /> Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

const Hero = () => (
  <section className="relative h-[80vh] w-full overflow-hidden bg-ink text-paper">
    <div className="absolute inset-0 opacity-60">
      <img 
        src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000" 
        alt="Boutique Hero" 
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
    <div className="container relative mx-auto flex h-full flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl space-y-6"
      >
        <Badge variant="outline" className="border-paper/30 text-paper px-4 py-1 text-xs uppercase tracking-widest">
          Curated Excellence
        </Badge>
        <h2 className="text-6xl md:text-8xl font-light tracking-tighter serif leading-tight">
          Crafted for the <br /> <span className="italic">Discerning</span>
        </h2>
        <p className="text-lg md:text-xl font-light text-paper/80 max-w-xl mx-auto">
          Discover a world of hand-picked boutique treasures, where every piece tells a story of authenticity and craft.
        </p>
        <div className="pt-8">
          <Button size="lg" className="rounded-full bg-paper text-ink hover:bg-paper/90 px-8 h-14 text-lg">
            Explore Collection <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

const ProductGrid = ({ products, onProductClick, onBusinessClick }: { products: Product[], onProductClick: (p: Product) => void, onBusinessClick: (sellerId: string) => void }) => {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
      {products.map((product, idx) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="group cursor-pointer"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
            <img 
              src={product.images[0]} 
              alt={product.name} 
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
              onClick={() => onProductClick(product)}
            />
            {product.isAuthentic && (
              <div className="absolute top-2 left-2 md:top-4 md:left-4">
                <Badge className="bg-paper/90 text-ink backdrop-blur-sm border-none flex items-center gap-1 text-[10px] md:text-xs">
                  <ShieldCheck className="h-3 w-3" /> Authentic
                </Badge>
              </div>
            )}
            <div className="absolute top-2 right-2 md:top-4 md:right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="icon" 
                className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-paper text-ink hover:bg-accent hover:text-white shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  addItem(product);
                }}
              >
                <Plus className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 md:p-6 pointer-events-none">
              <Button 
                className="w-full bg-paper text-ink hover:bg-paper/90 rounded-full pointer-events-auto text-xs md:text-sm h-8 md:h-10"
                onClick={() => onProductClick(product)}
              >
                Quick View
              </Button>
            </div>
          </div>
          <div className="mt-3 md:mt-4 space-y-1">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start" onClick={() => onProductClick(product)}>
              <h3 className="font-serif text-lg md:text-xl line-clamp-1">{product.name}</h3>
              <span className="font-medium text-sm md:text-base">{formatPrice(product.price)}</span>
            </div>
            <div className="flex justify-between items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); onBusinessClick(product.sellerId); }}
                className="text-[10px] md:text-xs text-accent hover:underline font-medium"
              >
                {product.sellerName || 'Boutique Seller'}
              </button>
              <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">{product.category}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] md:text-xs text-amber-600">
              <Star className="h-3 w-3 fill-current" />
              <span>{product.ratingAvg} ({product.reviewCount})</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const ProductDetail = ({ product, onClose, onAddToCart, onChat }: { product: Product, onClose: () => void, onAddToCart: (p: Product) => void, onChat: (p: Product) => void }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await api.get(`/reviews/${product.id}`);
        setReviews(data);
      } catch (error) {
        console.error("Failed to fetch reviews", error);
      }
    };
    fetchReviews();
  }, [product.id]);

  const handleLike = async () => {
    try {
      await api.post('/products', { ...product, likeCount: (product.likeCount || 0) + 1 });
      toast.success("Added to your wishlist!");
    } catch (error) {
      console.error("Failed to like product", error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-none bg-paper">
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          <div className="w-full md:w-1/2 bg-secondary relative">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {product.images.map((img, i) => (
                  <img key={i} src={img} alt={product.name} className="w-full rounded-xl object-cover" referrerPolicy="no-referrer" />
                ))}
              </div>
            </ScrollArea>
            <Button 
              size="icon" 
              variant="secondary" 
              className="absolute top-6 right-6 rounded-full bg-paper/80 backdrop-blur-sm hover:bg-paper"
              onClick={handleLike}
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>
          <div className="w-full md:w-1/2 p-8 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-6 pr-4">
                <div className="space-y-2">
                  <Badge variant="outline" className="uppercase tracking-widest text-[10px]">{product.category}</Badge>
                  <h2 className="text-4xl serif">{product.name}</h2>
                  <p className="text-2xl font-light">{formatPrice(product.price)}</p>
                </div>

                <div className="flex items-center gap-4 py-4 border-y">
                  <div className="flex items-center gap-1 text-amber-600">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">{product.ratingAvg}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm text-muted-foreground">{product.reviewCount} Reviews</span>
                  {product.isAuthentic && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-sm font-medium">Authenticity Verified</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium uppercase tracking-widest text-xs">Description</h4>
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                </div>

                {product.authenticationDetails && (
                  <div className="bg-secondary/50 p-4 rounded-xl space-y-2">
                    <h4 className="font-medium text-xs uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Authentication Details
                    </h4>
                    <p className="text-sm text-muted-foreground italic">{product.authenticationDetails}</p>
                  </div>
                )}

                <div className="space-y-4 pt-8">
                  <h4 className="font-medium uppercase tracking-widest text-xs">Customer Reviews</h4>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No reviews yet. Be the first to share your thoughts!</p>
                  ) : (
                    <div className="space-y-6">
                      {reviews.map(review => (
                        <div key={review.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{review.userName}</span>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-amber-600 text-amber-600' : 'text-muted'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="pt-8 grid grid-cols-2 gap-4">
              <Button size="lg" className="rounded-full h-14" onClick={() => onAddToCart(product)}>
                Add to Bag
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-14" onClick={() => onChat(product)}>
                <LayoutDashboard className="mr-2 h-5 w-5" /> Visit Boutique
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SellerDashboard = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [businessData, setBusinessData] = useState({ name: '', description: '' });
  const { formatPrice } = useCurrency();
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    stock: 0,
    images: [],
    isAuthentic: true,
    authenticationDetails: '',
    visitCount: 0,
    likeCount: 0
  });

  const fetchData = async () => {
    if (user.role === 'customer') return;
    try {
      const [p, o] = await Promise.all([
        api.get('/products'),
        api.get('/orders')
      ]);
      setProducts(p.filter((prod: Product) => prod.sellerId === user.uid));
      setOrders(o.filter((order: Order) => order.sellerIds.includes(user.uid)));
    } catch (error) {
      console.error("Failed to fetch seller data", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user.uid, user.role]);

  const handleRegisterBusiness = async () => {
    if (!businessData.name.trim()) {
      toast.error("Business name is required");
      return;
    }
    try {
      await api.post('/users', {
        ...user,
        role: 'seller',
        businessName: businessData.name,
        businessDescription: businessData.description
      });
      toast.success("Business registered successfully! You can now start selling.");
      setIsRegistering(false);
    } catch (error) {
      toast.error("Failed to register business");
    }
  };

  if (user.role === 'customer') {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center space-y-8">
        <div className="p-6 rounded-3xl bg-secondary/30 border-2 border-dashed border-muted-foreground/20">
          <LayoutDashboard className="h-16 w-16 mx-auto mb-4 text-accent opacity-40" />
          <h2 className="text-4xl serif">Start Your Boutique</h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            Join our community of curated sellers. Register your business today and showcase your artisanal products to the world.
          </p>
          <Button size="lg" className="mt-8 rounded-full px-12 h-14 text-lg" onClick={() => setIsRegistering(true)}>
            Register Business
          </Button>
        </div>

        <Dialog open={isRegistering} onOpenChange={setIsRegistering}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="serif text-2xl">Business Registration</DialogTitle>
              <DialogDescription>Tell us about your boutique.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Boutique Name</Label>
                <Input 
                  placeholder="e.g. Silk & Stone" 
                  value={businessData.name} 
                  onChange={e => setBusinessData({...businessData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="What makes your boutique unique?" 
                  value={businessData.description} 
                  onChange={e => setBusinessData({...businessData, description: e.target.value})} 
                />
              </div>
            </div>
            <Button className="w-full h-12 text-lg" onClick={handleRegisterBusiness}>Launch Boutique</Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const handleEditProduct = (product: Product) => {
    setNewProduct(product);
    setIsAdding(true);
  };

  const handleAddProduct = async () => {
    try {
      const productData = {
        ...newProduct,
        id: newProduct.id || crypto.randomUUID(),
        sellerId: user.uid,
        sellerName: user.businessName || user.displayName,
        ratingAvg: newProduct.ratingAvg || 0,
        reviewCount: newProduct.reviewCount || 0,
        visitCount: newProduct.visitCount || 0,
        likeCount: newProduct.likeCount || 0,
        createdAt: newProduct.createdAt || new Date().toISOString()
      };
      
      await api.post('/products', productData);

      if (!newProduct.id) {
        // Notify followers
        const follows = await api.get(`/follows/${user.uid}`); // This is wrong, it should be people following this user
        // Wait, the API get /follows/:userId returns people the user follows.
        // I need an API to get followers.
        // Let's just fetch all follows and filter for now (inefficient but works for small scale)
        // Actually, let's just fetch all users and check their follows? No.
        // I'll add a new endpoint or just fetch all follows.
        // For now, I'll just skip the notification or implement it simply.
        // Let's fetch all follows.
        const allFollows = await api.get('/follows/all'); // I need to add this to server.ts
        const followers = allFollows.filter((f: any) => f.followingId === user.uid);
        
        for (const f of followers) {
          const followerId = f.followerId;
          
          await api.post('/notifications', {
            id: crypto.randomUUID(),
            userId: followerId,
            title: "New Item Posted!",
            content: `${user.businessName || user.displayName} just posted a new item: ${productData.name}`,
            createdAt: new Date().toISOString(),
            read: false
          });

          await api.post('/messages', {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'Bikuumba System',
            receiverId: followerId,
            content: `New arrival from ${user.businessName || user.displayName}: ${productData.name}. Check it out now!`,
            createdAt: new Date().toISOString(),
            type: 'system',
            read: false
          });
        }
      }

      toast.success(newProduct.id ? "Product updated successfully" : "Product added successfully");
      setIsAdding(false);
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        category: '',
        stock: 0,
        images: [],
        isAuthentic: true,
        authenticationDetails: '',
        visitCount: 0,
        likeCount: 0
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to save product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleProductImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentImages = [...(newProduct.images || [])];
    let loadedCount = 0;

    files.forEach(file => {
      if (file.size > 1000000) { // 1MB limit
        toast.error(`Image ${file.name} is too large. Max 1MB.`);
        loadedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        currentImages.push(reader.result as string);
        loadedCount++;
        if (loadedCount === files.length) {
          setNewProduct({ ...newProduct, images: currentImages });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeProductImage = (index: number) => {
    const images = [...(newProduct.images || [])];
    images.splice(index, 1);
    setNewProduct({ ...newProduct, images });
  };

  const stats = [
    { label: 'Total Sales', value: formatPrice(orders.reduce((sum, o) => sum + o.total, 0)), icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Total Visits', value: products.reduce((sum, p) => sum + (p.visitCount || 0), 0), icon: Eye, color: 'text-blue-600' },
    { label: 'Item Likes', value: products.reduce((sum, p) => sum + (p.likeCount || 0), 0), icon: Heart, color: 'text-rose-600' },
    { label: 'Active Orders', value: orders.filter(o => o.status === 'pending' || o.status === 'processing').length, icon: Package, color: 'text-amber-600' },
  ];

  const chartData = [
    { name: 'Mon', sales: 400 },
    { name: 'Tue', sales: 300 },
    { name: 'Wed', sales: 600 },
    { name: 'Thu', sales: 800 },
    { name: 'Fri', sales: 500 },
    { name: 'Sat', sales: 900 },
    { name: 'Sun', sales: 700 },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl serif">{user.businessName || 'Business Dashboard'}</h2>
          <p className="text-muted-foreground">{user.businessDescription || 'Manage your boutique and track performance.'}</p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger render={<Button className="rounded-full" />}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="serif text-2xl">Add Boutique Product</DialogTitle>
              <DialogDescription>Enter the details for your new curated item.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Input value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-4">
                <Label>Product Images</Label>
                <div className="grid grid-cols-4 gap-4">
                  {newProduct.images?.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button 
                        onClick={() => removeProductImage(i)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors">
                    <Plus className="h-6 w-6 text-muted-foreground/40" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mt-2">Add Photo</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleProductImagesChange} />
                  </label>
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Authentication Details</Label>
                <Input value={newProduct.authenticationDetails} onChange={e => setNewProduct({...newProduct, authenticationDetails: e.target.value})} />
              </div>
            </div>
            <Button className="w-full h-12" onClick={handleAddProduct}>Create Product</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none bg-paper shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-secondary ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-medium">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none bg-paper shadow-sm">
          <CardHeader>
            <CardTitle className="serif">Sales Performance</CardTitle>
            <CardDescription>Weekly revenue overview</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f5f2ed' }}
                />
                <Bar dataKey="sales" fill="#5A5A40" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none bg-paper shadow-sm">
          <CardHeader>
            <CardTitle className="serif">Top Products</CardTitle>
            <CardDescription>By visit count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {products.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0)).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-4">
                  <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover bg-secondary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.visitCount || 0} visits</p>
                  </div>
                  <Badge variant="secondary">{p.stock} left</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl serif">Product Inventory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <Card key={product.id} className="overflow-hidden border-none bg-paper shadow-sm group">
              <div className="aspect-video relative overflow-hidden bg-secondary">
                <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge className="bg-paper/90 text-ink backdrop-blur-sm border-none">
                    <Eye className="h-3 w-3 mr-1" /> {product.visitCount || 0}
                  </Badge>
                  <Badge className="bg-paper/90 text-ink backdrop-blur-sm border-none">
                    <Heart className="h-3 w-3 mr-1" /> {product.likeCount || 0}
                  </Badge>
                </div>
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="serif text-xl">{product.name}</CardTitle>
                  <Badge variant={product.stock > 0 ? 'outline' : 'destructive'}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                  </Badge>
                </div>
                <CardDescription>{formatPrice(product.price)} • {product.category}</CardDescription>
              </CardHeader>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => handleEditProduct(product)}>Edit</Button>
                <Button variant="outline" className="flex-1 rounded-full text-destructive" onClick={() => handleDeleteProduct(product.id)}>Delete</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const OrdersView = ({ user }: { user: User }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { formatPrice } = useCurrency();

  const fetchOrders = async () => {
    try {
      const data = await api.get('/orders');
      if (user.role === 'seller') {
        setOrders(data.filter((o: Order) => o.sellerIds.includes(user.uid)));
      } else {
        setOrders(data.filter((o: Order) => o.customerId === user.uid));
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [user.uid, user.role]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'processing': return <Settings className="h-4 w-4 text-blue-500" />;
      case 'shipped': return <Truck className="h-4 w-4 text-indigo-500" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h2 className="text-4xl serif">Order History</h2>
        <p className="text-muted-foreground">Track your boutique purchases and deliveries.</p>
      </div>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-paper rounded-3xl border">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          orders.map(order => (
            <Card key={order.id} className="border-none bg-paper shadow-sm overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Order ID</p>
                      <p className="font-mono text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover bg-secondary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity} • {formatPrice(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator orientation="vertical" className="hidden md:block h-auto" />
                <div className="w-full md:w-64 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Placed On</p>
                    <p className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-lg font-medium">{formatPrice(order.total)}</p>
                  </div>
                  {order.trackingNumber && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Tracking Number</p>
                      <p className="text-sm font-mono text-accent">{order.trackingNumber}</p>
                    </div>
                  )}
                  <Button variant="outline" className="w-full rounded-full">Order Details</Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const MarzPay = ({ amount, onSuccess }: { amount: number, onSuccess: (details: any) => void }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [method, setMethod] = useState<'card' | 'mtn' | 'airtel'>('card');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '' });
  const [phone, setPhone] = useState('');
  const { formatPrice } = useCurrency();

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess({ 
        id: `MP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        method: method
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-accent p-1.5 rounded-lg">
            <CreditCard className="h-5 w-5 text-paper" />
          </div>
          <span className="font-serif text-xl font-medium tracking-tight">MarzPay</span>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest opacity-60">Secure Gateway</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <Button 
          variant={method === 'card' ? 'default' : 'outline'} 
          className="flex-col h-16 gap-1 rounded-xl"
          onClick={() => setMethod('card')}
        >
          <CreditCard className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-widest">Card</span>
        </Button>
        <Button 
          variant={method === 'mtn' ? 'default' : 'outline'} 
          className="flex-col h-16 gap-1 rounded-xl"
          onClick={() => setMethod('mtn')}
        >
          <Smartphone className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-widest">MTN</span>
        </Button>
        <Button 
          variant={method === 'airtel' ? 'default' : 'outline'} 
          className="flex-col h-16 gap-1 rounded-xl"
          onClick={() => setMethod('airtel')}
        >
          <Smartphone className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-widest">Airtel</span>
        </Button>
      </div>

      <form onSubmit={handlePay} className="space-y-4">
        {method === 'card' ? (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Card Number</Label>
              <Input 
                placeholder="0000 0000 0000 0000" 
                value={cardData.number}
                onChange={e => setCardData({...cardData, number: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Expiry</Label>
                <Input 
                  placeholder="MM/YY" 
                  value={cardData.expiry}
                  onChange={e => setCardData({...cardData, expiry: e.target.value.replace(/\D/g, '').replace(/(.{2})/, '$1/').trim().slice(0, 5)})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">CVV</Label>
                <Input 
                  placeholder="123" 
                  type="password"
                  value={cardData.cvv}
                  onChange={e => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 3)})}
                  required
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {method === 'mtn' ? 'MTN' : 'Airtel'} Mobile Money Number
            </Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="07XX XXX XXX" 
                className="pl-10"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
              />
            </div>
            <p className="text-[10px] text-muted-foreground italic mt-1">
              You will receive a prompt on your phone to authorize the payment.
            </p>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-12 rounded-full bg-accent text-paper hover:bg-accent/90" 
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            `Pay ${formatPrice(amount)} with MarzPay`
          )}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" /> Encrypted by MarzPay Security
        </p>
      </form>
    </div>
  );
};

const CheckoutView = ({ products, onComplete }: { products: Product[], onComplete: () => void }) => {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<'marzpay' | 'paypal'>('marzpay');

  const handlePaymentSuccess = async (details: any) => {
    try {
      const orderData: Order = {
        id: crypto.randomUUID(),
        customerId: user!.uid,
        items,
        total,
        status: 'pending',
        paymentId: details.id,
        sellerIds: Array.from(new Set(items.map(item => products.find(p => p.id === item.productId)?.sellerId).filter(Boolean) as string[])),
        createdAt: new Date().toISOString()
      };
      await api.post('/orders', orderData);
      
      // Update stock
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await api.post('/products', { ...product, stock: product.stock - item.quantity });
        }
      }

      clearCart();
      toast.success("Order placed successfully!");
      onComplete();
    } catch (error) {
      toast.error("Failed to place order");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <h2 className="text-4xl serif">Checkout</h2>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium uppercase tracking-widest text-xs">Shipping Information</h3>
              <div className="grid gap-4">
                <Input placeholder="Full Name" defaultValue={user?.displayName} />
                <Input placeholder="Address Line 1" />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="City" />
                  <Input placeholder="Postal Code" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-medium uppercase tracking-widest text-xs">Payment Method</h3>
              <div className="flex gap-2 mb-4">
                <Button 
                  variant={paymentMethod === 'marzpay' ? 'default' : 'outline'} 
                  className="flex-1 rounded-full text-xs h-10"
                  onClick={() => setPaymentMethod('marzpay')}
                >
                  MarzPay
                </Button>
                <Button 
                  variant={paymentMethod === 'paypal' ? 'default' : 'outline'} 
                  className="flex-1 rounded-full text-xs h-10"
                  onClick={() => setPaymentMethod('paypal')}
                >
                  PayPal
                </Button>
              </div>

              <div className="bg-secondary/30 p-6 rounded-2xl">
                {paymentMethod === 'marzpay' ? (
                  <MarzPay amount={total} onSuccess={handlePaymentSuccess} />
                ) : (
                  <PayPalScriptProvider options={{ "clientId": "test" }}>
                    <PayPalButtons 
                      style={{ layout: "vertical", shape: "pill" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [{ amount: { value: total.toFixed(2), currency_code: "USD" } }]
                        });
                      }}
                      onApprove={async (data, actions) => {
                        const details = await actions.order?.capture();
                        handlePaymentSuccess(details);
                      }}
                    />
                  </PayPalScriptProvider>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-paper p-8 rounded-3xl border h-fit space-y-6">
          <h3 className="font-serif text-2xl">Order Summary</h3>
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.name} x {item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-emerald-600">Free</span>
            </div>
            <div className="flex justify-between text-xl font-medium pt-4">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const AppContent = () => {
  const [view, setView] = useState('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, login } = useAuth();
  const { addItem } = useCart();
  const { currency, setCurrency, formatPrice } = useCurrency();

  const fetchProducts = async () => {
    try {
      const prods = await api.get('/products');
      setProducts(prods);
      
      // Seed data if empty
      if (prods.length === 0 && (user?.role === 'seller' || user?.role === 'admin')) {
        seedProducts(user.uid);
      }
    } catch (error) {
      console.error("Failed to fetch products", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sellerName && p.sellerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Master Admin Check
  useEffect(() => {
    if (user && (user.email === 'bikuumba26@gmail.com' || user.email === 'bitbyte790@gmail.com') && user.role !== 'admin') {
      api.post('/users', { ...user, role: 'admin' });
    }
  }, [user]);

  const seedProducts = async (sellerId: string) => {
    const sellerName = user?.businessName || user?.displayName || 'Bikuumba Boutique';
    const samples = [
      {
        id: crypto.randomUUID(),
        name: "Hand-Woven Silk Scarf",
        description: "Exquisite silk scarf hand-woven by artisans in the heart of Florence. Features a unique geometric pattern and natural dyes.",
        price: 185,
        category: "Accessories",
        images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=800"],
        stock: 12,
        isAuthentic: true,
        authenticationDetails: "Certified by the Italian Silk Guild. Serial #IT-8821.",
        ratingAvg: 4.9,
        reviewCount: 24,
        sellerId,
        sellerName,
        createdAt: new Date().toISOString(),
        visitCount: 0,
        likeCount: 0
      },
      {
        id: crypto.randomUUID(),
        name: "Minimalist Leather Tote",
        description: "Full-grain vegetable-tanned leather tote with hand-stitched details. Designed for durability and timeless elegance.",
        price: 420,
        category: "Bags",
        images: ["https://images.unsplash.com/photo-1544816153-12ad5d7133a2?auto=format&fit=crop&q=80&w=800"],
        stock: 5,
        isAuthentic: true,
        authenticationDetails: "Handcrafted in Leon, Spain. Authenticity card included.",
        ratingAvg: 4.8,
        reviewCount: 15,
        sellerId,
        sellerName,
        createdAt: new Date().toISOString(),
        visitCount: 0,
        likeCount: 0
      },
      {
        id: crypto.randomUUID(),
        name: "Artisanal Ceramic Vase",
        description: "One-of-a-kind ceramic vase with a reactive glaze finish. Each piece is hand-thrown on the wheel.",
        price: 95,
        category: "Home",
        images: ["https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=800"],
        stock: 8,
        isAuthentic: true,
        authenticationDetails: "Signed by the artist. Studio pottery mark present.",
        ratingAvg: 5.0,
        reviewCount: 9,
        sellerId,
        sellerName,
        createdAt: new Date().toISOString(),
        visitCount: 0,
        likeCount: 0
      }
    ];
    for (const s of samples) {
      await api.post('/products', s);
    }
  };

  const handleVisitBoutique = async (product: Product) => {
    setView('inventory');
    setSelectedProduct(null);
  };

  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product);
    try {
      await api.post('/products', { ...product, visitCount: (product.visitCount || 0) + 1 });
    } catch (error) {
      console.error("Failed to increment visit count", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0 overflow-x-hidden">
      <Navbar onNavigate={setView} onOpenMenu={() => setIsMenuOpen(true)} onSearch={setSearchQuery} />
         <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-ink text-paper border-none p-0">
          <div className="h-full flex flex-col">
            <div className="p-8 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="serif text-3xl text-paper tracking-tighter">BIKUUMBA</h2>
                <Button variant="ghost" size="icon" className="text-paper/60 hover:text-paper" onClick={() => setIsMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-paper/60 text-sm leading-relaxed">
                Elevating the boutique experience through curated excellence and artisanal craft.
              </p>
            </div>

            <ScrollArea className="flex-1 px-8">
              <div className="space-y-12 py-4">
                <div className="space-y-6">
                  <h4 className="font-medium uppercase tracking-widest text-[10px] text-paper/40">Shop</h4>
                  <ul className="space-y-4 text-xl serif">
                    <li><button onClick={() => { setView('home'); setIsMenuOpen(false); }} className="hover:text-accent transition-colors flex items-center gap-3">New Arrivals <ArrowRight className="h-4 w-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" /></button></li>
                    <li><button onClick={() => { setView('categories'); setIsMenuOpen(false); }} className="hover:text-accent transition-colors">Best Sellers</button></li>
                    <li><button onClick={() => { setView('categories'); setIsMenuOpen(false); }} className="hover:text-accent transition-colors">Categories</button></li>
                  </ul>
                </div>
                <div className="space-y-6">
                  <h4 className="font-medium uppercase tracking-widest text-[10px] text-paper/40">Company</h4>
                  <ul className="space-y-4 text-xl serif">
                    <li><button onClick={() => { setView('about'); setIsMenuOpen(false); }} className="hover:text-accent transition-colors">Our Story</button></li>
                    <li><button onClick={() => { setView('artisans'); setIsMenuOpen(false); }} className="hover:text-accent transition-colors">Artisans</button></li>
                    <li><button onClick={() => { setView('sustainability'); setIsMenuOpen(false); }} className="hover:text-accent transition-colors">Sustainability</button></li>
                  </ul>
                </div>
                <div className="space-y-6">
                  <h4 className="font-medium uppercase tracking-widest text-[10px] text-paper/40">Settings</h4>
                  <div className="space-y-4">
                    <p className="text-xs text-paper/60 uppercase tracking-widest">Currency</p>
                    <div className="flex gap-2">
                      <Button 
                        variant={currency === 'USD' ? 'default' : 'outline'} 
                        className={`flex-1 rounded-xl h-12 ${currency === 'USD' ? 'bg-paper text-ink' : 'border-paper/20 text-paper'}`}
                        onClick={() => setCurrency('USD')}
                      >
                        USD ($)
                      </Button>
                      <Button 
                        variant={currency === 'UGX' ? 'default' : 'outline'} 
                        className={`flex-1 rounded-xl h-12 ${currency === 'UGX' ? 'bg-paper text-ink' : 'border-paper/20 text-paper'}`}
                        onClick={() => setCurrency('UGX')}
                      >
                        UGX (Shs)
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 pt-12 border-t border-paper/10">
                  <h4 className="font-medium uppercase tracking-widest text-[10px] text-paper/40">Newsletter</h4>
                  <p className="text-sm text-paper/60">Join our list for exclusive releases.</p>
                  <div className="flex gap-2">
                    <Input placeholder="Email address" className="bg-paper/10 border-none text-paper placeholder:text-paper/30 rounded-full h-12" />
                    <Button size="icon" className="rounded-full bg-paper text-ink hover:bg-paper/90 h-12 w-12 shrink-0"><ArrowRight className="h-5 w-5" /></Button>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-8 border-t border-paper/10 bg-paper/5">
              <div className="flex gap-4 text-[10px] uppercase tracking-widest text-paper/40">
                <a href="#" className="hover:text-paper transition-colors">Privacy</a>
                <a href="#" className="hover:text-paper transition-colors">Terms</a>
                <a href="#" className="hover:text-paper transition-colors">Support</a>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-ink text-paper py-2 px-4">
                <div className="container mx-auto text-center space-y-1">
                  <Badge variant="outline" className="border-paper/30 text-paper px-2 py-0 text-[8px] uppercase tracking-widest">
                    Welcome to Bikuumba
                  </Badge>
                  <h2 className="text-2xl md:text-4xl serif tracking-tighter leading-tight">
                    What are you <span className="italic">shopping</span> today?
                  </h2>
                  <div className="max-w-md mx-auto relative pt-1">
                    <Search className="absolute left-4 top-[calc(0.25rem+1.25rem)] h-3 w-3 text-paper/40" />
                    <Input 
                      placeholder="Search treasures..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-paper/10 border-none text-paper placeholder:text-paper/30 rounded-full h-10 pl-10 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="container mx-auto px-4 py-12 space-y-12">
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <h3 className="text-4xl serif">New Arrivals</h3>
                    <p className="text-muted-foreground">The latest hand-picked additions to our boutique.</p>
                  </div>
                  <Button variant="ghost">View All <ChevronRight className="ml-1 h-4 w-4" /></Button>
                </div>
                <ProductGrid 
                  products={filteredProducts} 
                  onProductClick={handleProductSelect} 
                  onBusinessClick={setSelectedSellerId}
                />
              </div>
            </motion.div>
          )}

          {view === 'inbox' && <InboxView />}

          {view === 'checkout' && <CheckoutView products={products} onComplete={() => setView('orders')} />}
          {view === 'orders' && user && <OrdersView user={user} />}
          {view === 'inventory' && user && <SellerDashboard user={user} />}
          {view === 'admin' && user?.role === 'admin' && <AdminDashboard />}
          {view === 'profile' && <ProfileView onNavigate={setView} onSelectSeller={setSelectedSellerId} />}
        </AnimatePresence>
      </main>

      <BottomNav currentView={view} onNavigate={setView} />

      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={addItem}
          onChat={handleVisitBoutique}
        />
      )}

      {selectedSellerId && (
        <BusinessProfileModal 
          sellerId={selectedSellerId} 
          onClose={() => setSelectedSellerId(null)} 
        />
      )}

      <footer className="bg-paper py-12 border-t">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <h2 className="text-2xl serif tracking-tighter">BIKUUMBA</h2>
          <div className="flex gap-8 text-[10px] uppercase tracking-widest text-muted-foreground">
            <p>© 2026 BIKUUMBA. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

