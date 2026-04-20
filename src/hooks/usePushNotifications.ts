import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = 'BAqQ9OZxN_HPNxvhNv8XWjkrg6hW9PCIOgZPnQvZ4wp12eEYg2efnkR0TX5d5MnSn6LcYTOtoia866rznJr2edA';

export function usePushNotifications(userId: string | undefined) {
  async function subscribeUser() {
    if (!userId) return;

    try {
      // 1. Verificar suporte
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push não suportado neste navegador.');
        return false;
      }

      // 2. Registrar/Pegar Service Worker
      const registration = await navigator.serviceWorker.ready;

      // 3. Solicitar permissão (Aqui abre o prompt nativo)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      // 4. Se inscrever no serviço de Push do navegador
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // 5. Salvar no Supabase
      const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!) as any));
      const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!) as any));

      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth
      }, { onConflict: 'user_id,endpoint' });

      console.log('Push registrado com sucesso! 🚀');
      return true;
    } catch (err) {
      console.error('Erro ao configurar Push:', err);
      return false;
    }
  }

  return { subscribeUser };
}

// Auxiliar para converter a chave VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
