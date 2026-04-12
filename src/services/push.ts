import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDHB8M8T5Tk6P5W9gS7QkHguvv3QMK2dgDCeDT",
  authDomain: "bikuumba.firebaseapp.com",
  projectId: "bikuumba",
  storageBucket: "bikuumba.appspot.com",
  messagingSenderId: "117188235400499142560",
  appId: "1:117188235400499142560:web:abcdef123456"
};

let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
let messaging: Messaging | null = null;

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  
  if (!('Notification' in window)) {
    console.warn("This browser does not support notifications");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn("Notification permission denied");
    return null;
  }

  try {
    messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: "BAyyXxvXJK-U-jjy3qUpmcXrO4_QJ0gw5ODKBVbuiOrk068ix122km1FlNtxB5UPZb8062lVYYfvyA2U3Yio3Q0"
    });
    return token;
  } catch (error) {
    console.error("Failed to get notification token:", error);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return onMessage(messaging, callback);
};

export const subscribeToNewItems = async (token: string, userId: string) => {
  try {
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId })
    });
  } catch (error) {
    console.error("Failed to subscribe to notifications:", error);
  }
};

export const sendPushNotification = async (userId: string, title: string, body: string, data?: Record<string, string>) => {
  try {
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, data })
    });
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
};