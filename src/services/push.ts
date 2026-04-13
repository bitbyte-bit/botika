const VAPID_PUBLIC_KEY = "BAyyXxvXJK-U-jjy3qUpmcXrO4_QJ0gw5ODKBVbuiOrk068ix122km1FlNtxB5UPZb8062lVYYfvyA2U3Yio3Q0";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const existingPush = await registration.pushManager.getSubscription();
      
      if (existingPush) {
        return JSON.stringify(existingPush.toJSON());
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      return JSON.stringify(subscription.toJSON());
    }
    return null;
  } catch (error) {
    console.error("Failed to get notification permission:", error);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'push') {
        callback(event.data.payload);
      }
    });
  }
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