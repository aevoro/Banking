import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Phone, Lock, User as UserIcon, Mail, ShieldCheck } from 'lucide-react';
import { isValidBelarusPhone, isValidEmail } from '@/utils/validators';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, register } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    setMode(authModalMode);
  }, [authModalMode]);

  // Form states (all empty)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

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
      success('Вход выполнен', 'Вы успешно авторизовались в Banking Ledger.');
      setLoginPassword('');
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
        'Введите номер РБ (+375 и 9 цифр любого оператора: 25, 29, 33, 44...)'
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
      success('Регистрация завершена', 'Ваш расчетный счет открыт.');
      setRegPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка регистрации';
      error('Ошибка регистрации', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      maxWidth="md"
      title={mode === 'login' ? 'Вход в личный кабинет' : 'Регистрация клиента'}
      description={
        mode === 'login'
          ? 'Введите номер телефона и пароль для доступа к счетам и переводам'
          : 'Откройте мультивалютный банковский счет за 1 минуту'
      }
    >
      <div className="mt-4">
        {/* Mode Tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
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
              placeholder="Введите пароль"
              leftIcon={<Lock className="w-5 h-5" aria-hidden="true" />}
              required
            />

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isSubmitting}
            >
              Войти в кабинет
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
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
              label="Email"
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
              className="w-full mt-2"
              size="lg"
              isLoading={isSubmitting}
            >
              Зарегистрироваться
            </Button>
          </form>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
          <span>Безопасное соединение и шифрование паролей</span>
        </div>
      </div>
    </Modal>
  );
};
