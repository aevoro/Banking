import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Phone, Lock, User as UserIcon, Mail, ShieldCheck } from 'lucide-react';
import { isValidBelarusPhone, isValidEmail } from '@/utils/validators';

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { login, register } = useAuth();
  const { success, error } = useToast();

  // Login Form (starts completely blank)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form (starts completely blank)
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidBelarusPhone(loginPhone)) {
      error(
        'Неверный телефон',
        'Введите номер в формате +375XXXXXXXXX (код 25, 29, 33, 44 или гор. 17)'
      );
      return;
    }
    if (!loginPassword) {
      error('Ошибка', 'Введите пароль');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ phone: loginPhone, password: loginPassword });
      success('Добро пожаловать!', 'Вы успешно авторизовались в Banking Ledger.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось войти';
      error('Ошибка авторизации', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim()) {
      error('Ошибка', 'Укажите имя и фамилию');
      return;
    }
    if (!isValidBelarusPhone(regPhone)) {
      error(
        'Неверный телефон',
        'Введите номер РБ (+375 и 9 цифр любого оператора: 25, 29, 33, 44, 17...)'
      );
      return;
    }
    if (!isValidEmail(regEmail)) {
      error('Неверный email', 'Введите корректный адрес электронной почты');
      return;
    }
    if (regPassword.length < 6) {
      error('Слабый пароль', 'Пароль должен содержать не менее 6 символов');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        firstName: regFirstName,
        lastName: regLastName,
        phone: regPhone,
        email: regEmail,
        password: regPassword,
        currencies: ['BYN', 'USD'],
      });
      success('Регистрация завершена', 'Ваш счет и мультивалютный кошелек успешно открыты.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка регистрации';
      error('Ошибка регистрации', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10 bg-gradient-to-b from-slate-100 via-emerald-50/20 to-slate-200 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900">
      <div className="w-full max-w-xl space-y-7">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 items-center justify-center text-white shadow-xl shadow-emerald-500/25">
            <svg
              className="w-10 h-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Banking Ledger
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Мультивалютная банковская платформа
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-8 md:p-10 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800">
          {/* Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800 mb-7">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-xl py-3 text-base font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Вход по номеру
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-xl py-3 text-base font-bold transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Регистрация
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <Input
                label="Номер телефона (РБ)"
                type="tel"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="+375 (XX) XXX-XX-XX"
                leftIcon={<Phone className="w-5 h-5" aria-hidden="true" />}
                helperText="Любой оператор: А1 (29, 44), МТС (29, 33), life:) (25)"
                required
              />

              <Input
                label="Пароль"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Введите ваш пароль"
                leftIcon={<Lock className="w-5 h-5" aria-hidden="true" />}
                required
              />

              <Button
                type="submit"
                className="w-full mt-4"
                size="lg"
                isLoading={isSubmitting}
              >
                Войти в кабинет
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Имя"
                  type="text"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  placeholder="Иван"
                  leftIcon={<UserIcon className="w-5 h-5" aria-hidden="true" />}
                  required
                />
                <Input
                  label="Фамилия"
                  type="text"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  placeholder="Иванов"
                  required
                />
              </div>

              <Input
                label="Номер телефона"
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+375 (XX) XXX-XX-XX"
                leftIcon={<Phone className="w-5 h-5" aria-hidden="true" />}
                helperText="Формат +375XXXXXXXXX (9 цифр любого оператора РБ)"
                required
              />

              <Input
                label="Электронная почта (Email)"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="ivan@example.by"
                leftIcon={<Mail className="w-5 h-5" aria-hidden="true" />}
                required
              />

              <Input
                label="Придумайте пароль"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                leftIcon={<Lock className="w-5 h-5" aria-hidden="true" />}
                required
              />

              <Button
                type="submit"
                className="w-full mt-4"
                size="lg"
                isLoading={isSubmitting}
              >
                Зарегистрироваться
              </Button>
            </form>
          )}

          <div className="mt-7 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Двухфакторная авторизация и шифрование данных</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
