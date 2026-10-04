// UK student loan repayment rules for the 2026/27 tax year (6 April 2026 to 5 April 2027).
// Sources (checked 4 October 2026):
//   https://www.gov.uk/repaying-your-student-loan/what-you-pay
//   https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
//   https://www.gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled

export type PlanId = "plan1" | "plan2" | "plan4" | "plan5" | "pgl";

export interface Plan {
  id: PlanId;
  name: string;
  /** Yearly income threshold in pounds */
  threshold: number;
  /** Share of income above the threshold that is repaid */
  rate: number;
  /** Interest rate shown on gov.uk (Plan 2 is the lowest point of its sliding scale) */
  interest: number;
  /** Years after the April you were first due to repay */
  writeOffYears: number;
  who: string;
}

export const TAX_YEAR = "2026/27";

export const PLANS: Record<PlanId, Plan> = {
  plan1: { id: "plan1", name: "Plan 1", threshold: 26_900, rate: 0.09, interest: 0.041, writeOffYears: 25,
    who: "England or Wales before 1 September 2012, or Northern Ireland" },
  plan2: { id: "plan2", name: "Plan 2", threshold: 29_385, rate: 0.09, interest: 0.041, writeOffYears: 30,
    who: "England from 1 September 2012 to 31 July 2023, or Wales from 1 September 2012" },
  plan4: { id: "plan4", name: "Plan 4", threshold: 33_795, rate: 0.09, interest: 0.041, writeOffYears: 30,
    who: "Scotland" },
  plan5: { id: "plan5", name: "Plan 5", threshold: 25_000, rate: 0.09, interest: 0.041, writeOffYears: 40,
    who: "England, courses starting on or after 1 August 2023" },
  pgl: { id: "pgl", name: "Postgraduate Loan", threshold: 21_000, rate: 0.06, interest: 0.06, writeOffYears: 30,
    who: "Master's or doctoral loan from England or Wales" },
};

/** Plan 2 variable interest after you leave your course: RPI + up to 3%, capped. */
export const PLAN2_INTEREST = { rpi: 0.041, maxExtra: 0.03, cap: 0.06, lower: 29_385, upper: 52_885 };

export const PERIODS = { year: 1, month: 12, "four-weeks": 13, fortnight: 26, week: 52 } as const;
export type Period = keyof typeof PERIODS;

/** Threshold for one pay period, cut (not rounded) to whole pence, as in HMRC's tables. */
export function periodThreshold(yearly: number, period: Period): number {
  return Math.floor((yearly * 100) / PERIODS[period]) / 100;
}

/**
 * Rounds down to the pound without float errors. Pay and thresholds are whole pence, so
 * 9% or 6% of the difference has at most 4 decimal places: snap to that first, then floor.
 */
function floorPounds(amount: number): number {
  return Math.floor(Math.round(amount * 10_000) / 10_000);
}

export interface Split { plan: PlanId; amount: number }
export interface Repayment {
  /** Undergraduate deduction this pay period (whole pounds, rounded down) */
  undergraduate: number;
  /** Postgraduate Loan deduction this pay period */
  postgraduate: number;
  total: number;
  /** How the undergraduate deduction is shared between plans */
  split: Split[];
}

/**
 * Deduction for one pay period. Undergraduate plans share one 9% deduction over the
 * LOWEST threshold you have. A Postgraduate Loan adds 6% over its own threshold.
 */
export function repaymentForPeriod(pay: number, plans: PlanId[], period: Period = "month"): Repayment {
  if (!Number.isFinite(pay) || pay < 0) throw new RangeError("Pay must be a positive number");
  const unique = [...new Set(plans)];
  const ug = unique.filter((p) => p !== "pgl").map((p) => PLANS[p]).sort((a, b) => a.threshold - b.threshold);

  let undergraduate = 0;
  const split: Split[] = [];
  if (ug.length > 0) {
    const t = ug.map((p) => periodThreshold(p.threshold, period));
    undergraduate = floorPounds(Math.max(0, pay - t[0]) * 0.09);
    // Lower plans are capped at 9% of the gap to the next threshold; the rest goes to the highest plan.
    let left = undergraduate;
    for (let i = 0; i < ug.length; i++) {
      const isLast = i === ug.length - 1;
      const band = isLast ? left : Math.min(left, floorPounds(Math.max(0, Math.min(pay, t[i + 1]) - t[i]) * 0.09));
      split.push({ plan: ug[i].id, amount: band });
      left -= band;
    }
  }

  const postgraduate = unique.includes("pgl")
    ? floorPounds(Math.max(0, pay - periodThreshold(PLANS.pgl.threshold, period)) * PLANS.pgl.rate)
    : 0;

  return { undergraduate, postgraduate, total: undergraduate + postgraduate, split };
}

/** Repayments for a whole year from a yearly salary paid in equal instalments. */
export function yearlyFromSalary(salary: number, plans: PlanId[], period: Period = "month") {
  const n = PERIODS[period];
  const perPeriod = repaymentForPeriod(salary / n, plans, period);
  return { perPeriod, perYear: perPeriod.total * n };
}

/** Plan 2 interest rate for a yearly income once you have left your course. */
export function plan2InterestRate(income: number, r = PLAN2_INTEREST): number {
  const share = Math.min(1, Math.max(0, (income - r.lower) / (r.upper - r.lower)));
  return Math.min(r.cap, r.rpi + r.maxExtra * share);
}

export interface ProjectionInput {
  plan: PlanId;
  balance: number;
  salary: number;
  /** Yearly pay rise, e.g. 0.03 for 3% */
  salaryGrowth: number;
  yearsLeft: number;
  /** Fixed interest rate. Leave out to use the plan default (Plan 2 follows income). */
  interest?: number;
}

export interface ProjectionResult {
  paidOff: boolean;
  months: number;
  totalRepaid: number;
  totalInterest: number;
  writtenOff: number;
}

/**
 * Month-by-month estimate for one plan. Thresholds and rates stay at 2026/27 levels,
 * interest is added monthly, and repayments follow the monthly payroll rule.
 */
export function project(input: ProjectionInput): ProjectionResult {
  const { plan, salaryGrowth } = input;
  let balance = Math.max(0, input.balance);
  let salary = Math.max(0, input.salary);
  const months = Math.round(Math.max(0, input.yearsLeft) * 12);
  let totalRepaid = 0;
  let totalInterest = 0;

  for (let m = 0; m < months; m++) {
    if (m > 0 && m % 12 === 0) salary *= 1 + salaryGrowth;
    if (balance <= 0) return done(true, m);
    const rate = input.interest ?? (plan === "plan2" ? plan2InterestRate(salary) : PLANS[plan].interest);
    const interest = (balance * rate) / 12;
    balance += interest;
    totalInterest += interest;
    const pay = Math.min(balance, repaymentForPeriod(salary / 12, [plan], "month").total);
    balance -= pay;
    totalRepaid += pay;
  }
  return done(balance <= 0.005, months);

  function done(paidOff: boolean, m: number): ProjectionResult {
    return {
      paidOff,
      months: m,
      totalRepaid: round2(totalRepaid),
      totalInterest: round2(totalInterest),
      writtenOff: paidOff ? 0 : round2(balance),
    };
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
