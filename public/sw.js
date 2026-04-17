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
  
  let title = data.title || 'Bikuumba';
  let body = data.body || '';
  let tag = data.data?.type || 'general';
  
  if (data.data?.type === 'message') {
    title = data.title;
    body = data.body;
    tag = 'message-' + data.data.senderId;
  } else if (data.data?.type === 'order') {
    title = data.title;
    body = data.body;
    tag = 'order-' + data.data.orderId;
  } else if (data.data?.type === 'new_order') {
    title = data.title;
    body = data.body;
  }
  
  const options = {
    body: body,
    tag: tag,
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    priority: 'high'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  
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
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'push' && event.data.payload) {
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'push',
          payload: event.data.payload
        });
      });
    });
  }
});