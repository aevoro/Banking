import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/services/api';
import type { CurrencyCode, ExchangeRate } from '@/types';
import {
  TrendingUp,
  Calculator,
  RefreshCw,
  Building2,
  Calendar,
  Info,
} from 'lucide-react';
import { formatDate } from '@/utils/formatters';

export const RatesView: React.FC = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Converter state
  const [calcAmount, setCalcAmount] = useState('1000');
  const [calcFrom, setCalcFrom] = useState<CurrencyCode>('BYN');
  const [calcTo, setCalcTo] = useState<CurrencyCode>('USD');

  const loadRates = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRates();
      setRates(data);
    } catch {
      setRates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const numericCalcAmount = parseFloat(calcAmount) || 0;
  const convertedResult = api.calculateConversion(calcFrom, calcTo, numericCalcAmount);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#0c1424] via-[#0f172a] to-[#04241a] text-white shadow-lg border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Building2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              Национальный банк Республики Беларусь (НБРБ)
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">
              Официальные котировки валют с автоматической синхронизацией
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadRates}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Обновить котировки</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rates Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 md:p-7">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Таблица курсов к белорусскому рублю (BYN)
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>{rates[0] ? formatDate(rates[0].date) : 'Свежие данные'}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {rates.map((rate) => (
                <div
                  key={rate.curId}
                  className="py-4.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-base text-slate-800 dark:text-slate-200 font-mono">
                      {rate.curAbbreviation}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {rate.curName}
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-medium">
                          ({rate.curScale} {rate.curAbbreviation})
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        Код валюты: {rate.curId}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {rate.curOfficialRate.toFixed(4)} BYN
                    </div>
                    <span className="text-xs text-slate-400">
                      за {rate.curScale} {rate.curAbbreviation}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Note box */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
              <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Курсы синхронизируются с официальным API НБРБ. Расчет валютных конвертаций учитывает масштаб валюты (`Cur_Scale`) и рассчитывается с точностью до 8 знаков в соответствии со стандартами банковского учета.
              </span>
            </div>
          </Card>
        </div>

        {/* Currency Calculator (1 col) */}
        <div className="space-y-4">
          <Card className="p-6 md:p-7">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Калькулятор конвертации
              </h3>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <Input
                  label="Сумма для пересчета"
                  type="number"
                  min="0"
                  step="any"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="1000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Из валюты
                  </label>
                  <select
                    value={calcFrom}
                    onChange={(e) => setCalcFrom(e.target.value as CurrencyCode)}
                    className="w-full h-12 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BYN">BYN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    В валюту
                  </label>
                  <select
                    value={calcTo}
                    onChange={(e) => setCalcTo(e.target.value as CurrencyCode)}
                    className="w-full h-12 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BYN">BYN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>
              </div>

              {/* Result Preview Box */}
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800/80 text-center space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Результат конвертации
                </span>
                <p className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {convertedResult.toFixed(2)} {calcTo}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {calcAmount || 0} {calcFrom} = {convertedResult.toFixed(4)} {calcTo}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
