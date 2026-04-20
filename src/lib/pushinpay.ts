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

import { supabase } from './supabase';

/**
 * Gera uma nova cobrança PIX na PushinPay
 */
export async function createPixPayment(
  token: string, 
  data: PixTransactionRequest,
  moraisAmount: number
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
        value: data.amount, // Valor em Reais (ex: 10.00)
        external_id: `vellar_${data.userId}_${Date.now()}`,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PushinPay API Error:', errorData);
      return null;
    }

    const payData: PixTransactionResponse = await response.json();

    // REGISTRO NO BANCO (Log para o Webhook)
    // Isso é o que garante que o saldo caia na conta do usuário automaticamente
    const { error: logError } = await supabase.rpc('log_moral_purchase_attempt', {
      p_amount: moraisAmount,
      p_reais: data.amount,
      p_external_id: payData.id, // O ID real da transação na PushinPay
      p_pix_code: payData.pix_code
    });

    if (logError) {
      console.error('Erro ao registrar log de compra:', logError);
      // Mesmo com erro no log, retornamos os dados pro usuário poder pagar, 
      // mas o automático pode falhar.
    }

    return payData;
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
