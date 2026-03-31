import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotification(null);

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError("As senhas não batem, cria! Tá querendo me enganar? 🤨");
        setLoading(false);
        return;
      }
      
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username: username
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setNotification("Fechou! Cadastro realizado. Dá um confere no seu e-mail para confirmar a conta! 📩");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message === 'Invalid login credentials' ? "Credenciais inválidas, cria! Esqueceu a própria senha? 🤦‍♂️" : signInError.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      {notification && (
        <div className="notification-overlay">
          <div className="notification">
            <p>{notification}</p>
            <button onClick={() => setNotification(null)}>Já é!</button>
          </div>
        </div>
      )}
      
      <div className="auth-card">
        <h2 className="logo-text">IAI CRIA</h2>
        <p className="subtitle">{isLogin ? 'Bota sua conta aí e entra logo!' : 'Faz o cadastro aí rapidinho, sem enrolação!'}</p>

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Nome" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required 
                />
                <input 
                  type="text" 
                  placeholder="Sobrenome" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required 
                />
              </div>
              <input 
                type="text" 
                placeholder="Nome de Usuário (@...)" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </>
          )}
          
          <input 
            type="email" 
            placeholder="E-mail" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          
          <input 
            type="password" 
            placeholder="Senha" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />

          {!isLogin && (
            <input 
              type="password" 
              placeholder="Confirma a senha" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
          )}

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <p className="toggle-text">
          {isLogin ? 'Ainda não tem conta?' : 'Já é da casa?'} 
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? ' Cadastra logo essa porr*' : ' Faz o login aí!'}
          </span>
        </p>
      </div>
    </div>
  );
}
