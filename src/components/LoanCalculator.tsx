"use client";

import { useId, useMemo, useState } from "react";
import { PERIODS, PLANS, type Period, type PlanId, plan2InterestRate, project, yearlyFromSalary } from "@/lib/loans";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1).replace(/\.0$/, "")}%`;

const PERIOD_LABEL: Record<Period, string> = {
  month: "Monthly",
  week: "Weekly",
  fortnight: "Every 2 weeks",
  "four-weeks": "Every 4 weeks",
  year: "Yearly",
};

const PERIOD_ORDER: Period[] = ["month", "four-weeks", "fortnight", "week", "year"];
const ORDER: PlanId[] = ["plan1", "plan2", "plan4", "plan5", "pgl"];

function toNumber(value: string): number {
  const n = Number(value.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function LoanCalculator() {
  const id = useId();
  const [salary, setSalary] = useState("35000");
  const [period, setPeriod] = useState<Period>("month");
  const [plans, setPlans] = useState<PlanId[]>(["plan2"]);
  const [balance, setBalance] = useState("45000");
  const [growth, setGrowth] = useState("3");
  const [years, setYears] = useState("30");
  const [projPlan, setProjPlan] = useState<PlanId>("plan2");

  const salaryN = toNumber(salary);
  const valid = !Number.isNaN(salaryN) && salaryN <= 10_000_000;
  const result = useMemo(() => (valid ? yearlyFromSalary(salaryN, plans, period) : null), [valid, salaryN, plans, period]);

  const balanceN = toNumber(balance);
  const growthN = Number(growth) / 100;
  const yearsN = Number(years);
  const projValid = valid && !Number.isNaN(balanceN) && Number.isFinite(growthN) && growthN > -0.5 && growthN < 0.5 && yearsN > 0 && yearsN <= 40;
  const projection = useMemo(
    () => (projValid ? project({ plan: projPlan, balance: balanceN, salary: salaryN, salaryGrowth: growthN, yearsLeft: yearsN }) : null),
    [projValid, projPlan, balanceN, salaryN, growthN, yearsN],
  );

  function toggle(plan: PlanId, on: boolean) {
    setPlans((prev) => (on ? [...prev, plan] : prev.filter((p) => p !== plan)));
    if (on) {
      setProjPlan(plan);
      setYears(String(PLANS[plan].writeOffYears));
    }
  }

  const per = PERIOD_LABEL[period].toLowerCase();

  return (
    <div className="space-y-6">
      <form className="card space-y-5" onSubmit={(e) => e.preventDefault()} aria-describedby={`${id}-hint`}>
        <p id={`${id}-hint`} className="text-sm text-slate-600">
          Enter your yearly salary before tax. Results update as you type.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`${id}-salary`}>Yearly salary before tax (£)</label>
            <input id={`${id}-salary`} className="field" inputMode="decimal" autoComplete="off" value={salary}
              onChange={(e) => setSalary(e.target.value)} aria-invalid={!valid} aria-describedby={`${id}-salary-err`} />
            {!valid && <p id={`${id}-salary-err`} className="mt-1 text-sm text-red-700">Enter a salary in pounds, for example 32000.</p>}
          </div>
          <div>
            <label className="label" htmlFor={`${id}-period`}>How often you are paid</label>
            <select id={`${id}-period`} className="field" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              {PERIOD_ORDER.map((p) => (
                <option key={p} value={p}>{PERIOD_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="label">Your loan plans (tick all you have)</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ORDER.map((p) => (
              <label key={p} className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={plans.includes(p)}
                  onChange={(e) => toggle(p, e.target.checked)} />
                <span>
                  <span className="block font-semibold">{PLANS[p].name}</span>
                  <span className="block text-sm text-slate-600">{PLANS[p].who}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      <section className="card border-[var(--accent)]" aria-live="polite" aria-labelledby={`${id}-res`}>
        <h2 id={`${id}-res`} className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">Your repayment</h2>
        {result && plans.length > 0 ? (
          <>
            <p className="mt-2 text-4xl font-bold">
              {gbp.format(result.perPeriod.total)} <span className="text-lg font-medium text-slate-600">{period === "year" ? "a year" : per}</span>
            </p>
            <p className="mt-1 text-slate-700">That is {gbp.format(result.perYear)} over the {PERIODS[period] === 1 ? "year" : `year (${PERIODS[period]} pay days)`}.</p>
            <ul className="mt-4 space-y-1 text-sm text-slate-700">
              {result.perPeriod.split.map((s) => (
                <li key={s.plan}>{PLANS[s.plan].name}: {gbp.format(s.amount)}</li>
              ))}
              {plans.includes("pgl") && <li>Postgraduate Loan: {gbp.format(result.perPeriod.postgraduate)}</li>}
            </ul>
            {result.perPeriod.total === 0 && (
              <p className="mt-3 text-sm text-slate-700">Your pay is at or below the threshold, so nothing is taken. Interest is still added.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-slate-700">{plans.length === 0 ? "Tick at least one plan." : "Enter a valid salary."}</p>
        )}
      </section>

      <section className="card space-y-4" aria-labelledby={`${id}-proj`}>
        <h2 id={`${id}-proj`} className="text-lg font-bold">Will I pay it off before it is written off?</h2>
        <p className="text-sm text-slate-600">A rough estimate for one plan, using today&apos;s thresholds and interest rates.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`${id}-pplan`}>Plan</label>
            <select id={`${id}-pplan`} className="field" value={projPlan}
              onChange={(e) => { const p = e.target.value as PlanId; setProjPlan(p); setYears(String(PLANS[p].writeOffYears)); }}>
              {ORDER.map((p) => <option key={p} value={p}>{PLANS[p].name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`${id}-bal`}>Balance you owe now (£)</label>
            <input id={`${id}-bal`} className="field" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor={`${id}-growth`}>Yearly pay rise (%)</label>
            <input id={`${id}-growth`} className="field" inputMode="decimal" value={growth} onChange={(e) => setGrowth(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor={`${id}-years`}>Years until write-off</label>
            <input id={`${id}-years`} className="field" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
        </div>
        <div aria-live="polite" className="rounded-xl bg-slate-50 p-4">
          {projection ? (
            projection.paidOff ? (
              <p>
                <strong>Paid off in about {Math.floor(projection.months / 12)} years {projection.months % 12} months.</strong>{" "}
                You would repay {gbp.format(projection.totalRepaid)} in total, including {gbp.format(projection.totalInterest)} of interest.
              </p>
            ) : (
              <p>
                <strong>Not paid off.</strong> You would repay {gbp.format(projection.totalRepaid)} and about{" "}
                {gbp.format(projection.writtenOff)} would be written off after {years} years.
              </p>
            )
          ) : (
            <p>Check the salary, balance, pay rise (−50 to 50%) and years (1 to 40).</p>
          )}
          <p className="mt-2 text-sm text-slate-600">
            Interest used: {projPlan === "plan2" && valid ? `${pct(plan2InterestRate(salaryN))} (Plan 2 rate for your salary)` : pct(PLANS[projPlan].interest)}.
          </p>
        </div>
      </section>
    </div>
  );
}
