const CACHE_NAME = 'bikuumba-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  // Determine notification type and customize
  let title = data.title || 'Bikuumba';
  let body = data.body || '';
  let tag = data.data?.type || 'general';
  let icon = '/icon-192.png';
  
  // Customize based on notification type
  if (data.data?.type === 'message') {
    title = data.title;
    body = data.body;
    icon = '/message-icon.png';
    tag = 'message-' + data.data.senderId;
  } else if (data.data?.type === 'order') {
    title = data.title;
    body = data.body;
    icon = '/order-icon.png';
    tag = 'order-' + data.data.orderId;
  } else if (data.data?.type === 'new_order') {
    title = data.title;
    body = data.body;
    icon = '/order-icon.png';
  }
  
  const options = {
    body: body,
    icon: icon,
    badge: '/badge-72.png',
    tag: tag,
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    priority: 'high',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'reply', title: 'Reply' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  
  if (event.action === 'reply' || !event.action) {
    // Determine where to navigate based on notification type
    let url = '/';
    if (data.type === 'message' && data.senderId) {
      url = '/inbox?chat=' + data.senderId;
    } else if (data.type === 'order' && data.orderId) {
      url = '/orders?order=' + data.orderId;
    } else if (data.type === 'new_order' && data.orderId) {
      url = '/orders?order=' + data.orderId;
    }
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // If there's a window open, focus it
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        return clients.openWindow(url);
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skipWaiting') {
    self.skipWaiting();
  }
});