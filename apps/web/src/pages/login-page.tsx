import { KeyRound, LoaderCircle, LogIn, ShieldCheck } from 'lucide-react';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { useAuth } from '../auth/auth-context';
import { getApiErrorMessage } from '../lib/api';

export function LoginPage(): React.JSX.Element {
  const { isLoading, login, profile } = useAuth();
  const navigate = useNavigate();
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && profile !== null) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(accessKey.trim());
      await navigate({ to: '/' });
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message.startsWith('Эта роль')
        ? requestError.message
        : getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Патруль">
        <span className="login-brand__mark"><ShieldCheck size={30} aria-hidden="true" /></span>
        <div>
          <h1>Патруль</h1>
          <p>Панель службы контроля</p>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <div className="login-form__heading">
            <span className="section-icon"><KeyRound size={20} aria-hidden="true" /></span>
            <div>
              <h2>Вход в систему</h2>
              <p>Используйте выданный ключ доступа</p>
            </div>
          </div>

          <label className="field">
            <span>Ключ доступа</span>
            <input
              autoComplete="current-password"
              autoFocus
              onChange={(event) => setAccessKey(event.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              spellCheck={false}
              type="password"
              value={accessKey}
            />
          </label>

          {error !== null ? <div className="form-error" role="alert">{error}</div> : null}

          <button className="primary-button" disabled={submitting || accessKey.trim().length < 8} type="submit">
            {submitting ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
            Войти
          </button>
        </form>
      </section>
    </main>
  );
}
