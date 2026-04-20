/**
 * VELLAR PAY - Integração PushinPay
 * Gateway para Depósito (Cash-in) e Saque (Cash-out)
 */

const PUSHINPAY_API_URL = 'https://api.pushinpay.com.br/api';

export interface PixTransactionRequest {
  amount: number; // Centavos ou Reais (Geralmente Reais com ponto decimal)
  userId: string;
  userName: string;
  userCpf: string;
}

export interface PixTransactionResponse {
  id: string;
  invoice_id: string;
  pix_code: string;
  qr_code_base64: string;
  status: string;
}

/**
 * Gera uma nova cobrança PIX na PushinPay
 */
export async function createPixPayment(
  token: string, 
  data: PixTransactionRequest
): Promise<PixTransactionResponse | null> {
  try {
    const response = await fetch(`${PUSHINPAY_API_URL}/pix/cashin`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        value: data.amount, // Valor em Reais
        external_id: `${data.userId}_${Date.now()}`,
        callback_url: `${window.location.origin}/api/webhook/pushinpay`, // URL de Webhook (A configurar)
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PushinPay API Error:', errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('PushinPay Integration Error:', error);
    return null;
  }
}

/**
 * Consulta o status de uma transação específica
 */
export async function getPixStatus(token: string, transactionId: string) {
  try {
    const response = await fetch(`${PUSHINPAY_API_URL}/pix/cashin/${transactionId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}
