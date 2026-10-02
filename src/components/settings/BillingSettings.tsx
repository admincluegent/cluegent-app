import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { createRazorpayLiveOrder, getLiveBillingPlans, verifyRazorpayLiveOrderPayment } from '@/services/backendApi';
import { useAuth } from '@/contexts/auth.context';
import type { NewPaidPlan, BillingInterval } from '@/types/firebase';
import type { BillingCurrency, LiveBillingPlanPrice } from '@/types/backend';
import './BillingSettings.css';

type Category = 'hour' | 'month' | 'year';
const ORIGINAL_PRICES: Record<BillingCurrency, Record<NewPaidPlan, string>> = {
  INR: { hour3: '₹999', hour10: '₹2,499', monthly200: '₹6,499', quarterly200: '₹10,499', annual200: '₹42,499' },
  USD: { hour3: '$12', hour10: '$29', monthly200: '$69', quarterly200: '$120', annual200: '$480' },
};
const CARDS: Array<{ id: NewPaidPlan; category: Category; interval: BillingInterval; name: string; hours: number; months: number }> = [
  { id: 'hour3', category: 'hour', interval: 'hour', name: '3 Hour Pack', hours: 3, months: 0 },
  { id: 'hour10', category: 'hour', interval: 'hour', name: '10 Hour Pack', hours: 10, months: 0 },
  { id: 'monthly200', category: 'month', interval: 'month', name: 'Monthly', hours: 200, months: 1 },
  { id: 'quarterly200', category: 'month', interval: 'quarter', name: '3 Months', hours: 200, months: 3 },
  { id: 'annual200', category: 'year', interval: 'year', name: 'Yearly', hours: 200, months: 12 },
];

function cardHighlights(card: typeof CARDS[number]): string[] {
  const common = [
    'Undetectability - Cluegent stays invisible during screen sharing',
    'Screen capture analysis',
    'Real-time assistant',
    'Coding + meeting support',
  ];
  if (card.category === 'hour') return [
    `${card.hours} hours of live interview help`, ...common,
    `${card.id === 'hour3' ? 30 : 75} AI Resume Builder (all templates)`,
    'Watermark-free resumes.',
  ];
  return [
    common[0], 'Unlimited AI interview assistance', 'Unlimited AI requests',
    'Unlimited Screen capture analysis', common[2], common[3],
    'Unlimited AI Resume Builder (all templates)', 'Watermark-free resumes.',
  ];
}

type Payment = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string;
  prefill: { name: string; email: string }; notes: Record<string, string>; theme: { color: string };
  handler: (payment: Payment) => void; modal: { ondismiss: () => void };
};
declare global {
  interface Window { Razorpay?: new (options: CheckoutOptions) => { open: () => void; on?: (event: string, callback: (data: { error?: { description?: string } }) => void) => void }; }
}
let checkoutScript: Promise<void> | null = null;
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScript) return checkoutScript;
  checkoutScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => fail(), 20000);
    const fail = () => { window.clearTimeout(timer); script.remove(); checkoutScript = null; reject(new Error('Could not load payment checkout. Please retry.')); };
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => { window.clearTimeout(timer); if (window.Razorpay) resolve(); else fail(); };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return checkoutScript;
}

export const BillingSettings: React.FC = () => {
  const { subscription, planStatus, refreshProfile } = useAuth();
  const [category, setCategory] = useState<Category>('month');
  const [currency, setCurrency] = useState<BillingCurrency>('INR');
  const [prices, setPrices] = useState<LiveBillingPlanPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<NewPaidPlan | null>(null);
  const [pending, setPending] = useState<{ id: NewPaidPlan; orderId: string; since: number } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const hourlyExhausted = (planStatus?.plan === 'hour3' || planStatus?.plan === 'hour10') && planStatus.remaining.sttSeconds <= 0;
  const fetchPrices = async () => {
    setLoading(true); setError('');
    try { const result = await getLiveBillingPlans(); setPrices(result.prices); }
    catch { setError('Could not load current prices. Retry before purchasing.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void fetchPrices(); void refreshProfile(); }, []);
  useEffect(() => {
    const interval = subscription?.billingInterval;
    if (interval) setCategory(interval === 'hour' ? 'hour' : interval === 'year' ? 'year' : 'month');
  }, [subscription?.billingInterval]);
  useEffect(() => {
    const refresh = () => { void refreshProfile(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refreshProfile]);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      if (Date.now() - pending.since > 60000) { setPending(null); setBusy(null); setMessage('If you completed payment, refresh billing to check activation.'); return; }
      void refreshProfile();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [pending, refreshProfile]);
  useEffect(() => {
    if (pending && subscription?.orderId === pending.orderId && subscription.plan === pending.id) {
      setPending(null); setBusy(null); setMessage('Payment verified. Your plan is active.');
    }
  }, [subscription, pending]);

  const buy = async (card: typeof CARDS[number]) => {
    if (busy || pending) return;
    const currentPaid = subscription?.plan !== 'free' && subscription?.status === 'active';
    const topup = subscription?.billingInterval === 'hour' && card.interval === 'hour';
    if (currentPaid && !topup && !window.confirm('This purchase replaces your current plan and its remaining allowance. Continue?')) return;
    setBusy(card.id); setError(''); setMessage('');
    try {
      await loadCheckout();
      const order = await createRazorpayLiveOrder(card.id, card.interval, currency);
      setPending({ id: card.id, orderId: order.orderId, since: Date.now() });
      let verificationStarted = false;
      const checkout = new window.Razorpay!({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: order.name, description: order.description, prefill: order.prefill, notes: order.notes, theme: { color: '#2563eb' },
        handler: payment => {
          verificationStarted = true;
          void (async () => {
            setMessage('Verifying payment…');
            try {
              if (payment.razorpay_order_id !== order.orderId) throw new Error('Payment order did not match checkout.');
              await verifyRazorpayLiveOrderPayment(payment);
              await refreshProfile(); setMessage('Payment verified. Your plan is active.'); setPending(null);
            } catch (err) { setError(err instanceof Error ? err.message : 'Payment verification failed. Refresh billing to retry activation.'); }
            finally { setBusy(null); }
          })();
        },
        modal: { ondismiss: () => { if (!verificationStarted) { setBusy(null); setMessage('Checkout closed. Waiting briefly for any completed payment.'); } } },
      });
      checkout.on?.('payment.failed', data => { setError(data.error?.description || 'Payment failed. Please retry checkout.'); setBusy(null); setPending(null); });
      checkout.open();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open checkout.'); setBusy(null); setPending(null); }
  };

  return (
    <div className="min-h-full bg-white p-4 text-slate-950 animated fadeIn">
      <section className="mx-auto max-w-[800px] space-y-3">
        <header className="text-center">
          <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.055em]">Choose your plan</h2>
          <p className="mt-2 text-sm text-slate-500">Hourly packs or prepaid access with a fresh monthly listening allowance.</p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Billing plans" className="flex w-fit rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.35)]">
          {(['hour', 'month', 'year'] as Category[]).map(tab => (
            <button key={tab} role="tab" id={`billing-${tab}`} aria-selected={category === tab} aria-controls="billing-plans"
              aria-label={tab === 'hour' ? 'Hourly' : tab === 'month' ? 'Monthly' : 'Yearly'} aria-describedby={tab === 'year' ? 'billing-year-offer' : undefined}
              tabIndex={category === tab ? 0 : -1}
              onKeyDown={event => {
                const tabs: Category[] = ['hour', 'month', 'year'];
                const index = tabs.indexOf(tab);
                const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[2] : null;
                if (next) { event.preventDefault(); setCategory(next); document.getElementById(`billing-${next}`)?.focus(); }
              }}
              onClick={() => setCategory(tab)} className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition active:scale-[0.97] ${category === tab ? tab === 'year' ? 'bg-gradient-to-r from-slate-800 via-slate-700 to-zinc-600 text-white' : 'bg-gradient-to-r from-amber-300 via-orange-500 to-red-600 text-white' : 'text-slate-500 hover:text-slate-950'}`}>
              {tab === 'hour' ? 'Hourly' : tab === 'month' ? 'Monthly' : 'Yearly'}
              {tab === 'year' && <span id="billing-year-offer" className="ml-1.5 inline-block rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-700">50% off</span>}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <div role="group" aria-label="Billing currency" className="inline-flex rounded-[18px] border border-slate-200 bg-slate-100/90 p-0.5">
            {(['INR', 'USD'] as BillingCurrency[]).map(value => <button key={value} type="button" aria-pressed={currency === value}
              disabled={!!busy || !!pending} onClick={() => setCurrency(value)}
              className={`min-w-[82px] rounded-[14px] px-3 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${currency === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}>
              <span aria-hidden="true" className="mr-1.5">{value === 'INR' ? '🇮🇳' : '🇺🇸'}</span>{value}
            </button>)}
          </div>
        </div>
        </div>
        {hourlyExhausted && <div role="status" className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-slate-800">
          <h3 className="font-semibold">Hours exhausted</h3>
          <p className="mt-1">Buy another hourly pack or switch to a monthly plan to continue listening. Your balance updates after payment is verified.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button onClick={() => setCategory('hour')} className="rounded-xl border border-emerald-400 bg-white px-4 py-2 font-semibold hover:bg-emerald-50">Buy hourly pack</button>
            <button onClick={() => setCategory('month')} className="rounded-xl border border-blue-400 bg-white px-4 py-2 font-semibold hover:bg-blue-100">Switch to monthly</button>
          </div>
        </div>}
        {loading ? <p role="status" className="text-center text-slate-500">Loading current prices…</p> :
          <div id="billing-plans" role="tabpanel" aria-labelledby={`billing-${category}`} className="mx-auto flex max-w-[640px] flex-wrap justify-center gap-3">
            {CARDS.filter(card => card.category === category).map((card, index) => {
              const price = prices.find(price => price.planId === card.id && price.interval === card.interval && price.currency === currency);
              const accent = card.category === 'year' ? { border: 'border-slate-500', bullet: 'text-slate-600', button: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' } : index === 0 ? { border: 'border-emerald-400', bullet: 'text-emerald-500', button: 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800' } : { border: 'border-blue-400', bullet: 'text-orange-500', button: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' };
              const active = subscription?.status === 'active' && subscription.plan === card.id;
              return <article key={card.id} className={`relative flex min-h-[400px] w-full max-w-[310px] min-w-0 flex-col rounded-[24px] border-2 bg-white p-3 text-slate-950 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.45)] ${accent.border}`}>
                <h3 className="text-lg font-semibold">{card.name}</h3>
                <div className="mt-3 flex flex-wrap items-baseline gap-1.5">
                  {price && <del aria-label="Original price" className="text-sm font-medium text-slate-400 decoration-2">{ORIGINAL_PRICES[currency][card.id]}</del>}
                  <p className={`text-[1.75rem] font-semibold tracking-tight ${price ? 'billing-sparkle billing-price-sparkle' : ''}`}>{price?.displayPrice ?? 'Unavailable'}</p>
                  {['hour10','quarterly200','annual200'].includes(card.id) && <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700">Most Popular</span>}
                </div>
                <p className="mt-1 text-[13px] leading-5 text-slate-500">{card.months > 1 ? `${price?.displayMonthlyPrice ?? '—'}/month equivalent · paid upfront for ${card.months} months` : card.months === 1 ? '' : ''}</p>
                {card.months > 0 && <p className="mt-1 text-xs leading-4 text-slate-500"></p>}
                <ul className="my-2 space-y-1 text-xs leading-4 text-slate-700">
                  {cardHighlights(card).map(item => <li key={item} className="flex gap-2"><Check size={14} className={`mt-0.5 shrink-0 ${accent.bullet}`} /><span className={/^(Undetectability|Real-time|Coding|Unlimited)/.test(item) ? 'font-semibold' : undefined}>{item}</span></li>)}
                </ul>
                <button disabled={!price || !!busy || !!pending || (active && card.interval !== 'hour')}
                  aria-label={busy === card.id ? 'Processing…' : active && card.interval !== 'hour' ? 'Current plan' : card.interval === 'hour' && subscription?.billingInterval === 'hour' ? 'Add hours' : 'Upgrade'}
                  onClick={() => void buy(card)} className={`billing-sparkle billing-upgrade-sparkle mt-auto inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-[13px] font-semibold shadow-[0_14px_36px_-28px_rgba(15,23,42,0.35)] transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${accent.button}`}>
                  {busy === card.id ? <><Loader2 size={16} className="animate-spin" />Processing…</> : active && card.interval !== 'hour' ? 'Current plan' : card.interval === 'hour' && subscription?.billingInterval === 'hour' ? 'Add hours' : 'Upgrade'}
                </button>
              </article>;
            })}
          </div>}
        <section aria-label="Free trial" className="mx-auto flex max-w-[640px] flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.45)]">
          <div><p className="text-sm font-semibold text-slate-500">Free Trial</p><h3 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Free</h3><p className="mt-1 text-xs text-slate-500">12 minutes total Cluegent usage</p></div>
          <ul className="grid gap-2 text-xs text-slate-800 sm:grid-cols-2">{['Try live answers', 'Try screenshot analysis', 'Real-time assistant', 'Upgrade to continue'].map(item => <li key={item} className="flex gap-2"><Check size={14} className="text-emerald-500" />{item}</li>)}</ul>
        </section>
        <p className="text-xs text-slate-500">Prices in {currency}. Prepaid plans do not automatically charge again. Your 12-minute free trial remains available before upgrading.</p>
        {message && <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{message}</p>}
        {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button className="ml-3 underline" onClick={() => void fetchPrices()}>Reload prices</button></div>}
      </section>
    </div>
  );
};
