import {useCallback, useEffect, useState} from 'react';

const SUB_KEY = 'technova_push_opted_in';

export function useNotifications() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SUB_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (supported) {
      setPermission(Notification.permission);
    }
  }, [supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    let nextPerm = Notification.permission;
    if (nextPerm === 'default') {
      nextPerm = await Notification.requestPermission();
    }
    setPermission(nextPerm);
    if (nextPerm === 'granted') {
      setSubscribed(true);
      try {
        localStorage.setItem(SUB_KEY, 'true');
      } catch {
        // ignore
      }
      try {
        new Notification('TechNova Alerts Enabled', {
          body: 'You will receive order updates, flash deals, and new flagship arrival alerts.',
          icon: '/pwa-192x192.png',
        });
      } catch {
        // ignore in headless browsers where Notification constructor may throw
      }
      return true;
    }
    return false;
  }, [supported]);

  const unsubscribe = useCallback(() => {
    setSubscribed(false);
    try {
      localStorage.setItem(SUB_KEY, 'false');
    } catch {
      // ignore
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string) => {
      if (!supported || !subscribed || Notification.permission !== 'granted') return;
      try {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
        });
      } catch {
        // ignore
      }
    },
    [supported, subscribed]
  );

  return {supported, permission, subscribed, subscribe, unsubscribe, notify};
}
