import { describe, expect, it } from "vitest";
import { PLANS, periodThreshold, plan2InterestRate, project, repaymentForPeriod, yearlyFromSalary } from "@/lib/loans";

describe("thresholds match HMRC's 2026/27 employer tables", () => {
  it.each([
    ["plan1", "month", 2241.66], ["plan1", "week", 517.3],
    ["plan2", "month", 2448.75], ["plan2", "week", 565.09],
    ["plan4", "month", 2816.25], ["plan4", "week", 649.9],
    ["plan5", "month", 2083.33], ["plan5", "week", 480.76],
    ["pgl", "month", 1750], ["pgl", "week", 403.84],
  ] as const)("%s per %s = £%s", (plan, period, expected) => {
    expect(periodThreshold(PLANS[plan].threshold, period)).toBe(expected);
  });
});

describe("gov.uk worked examples", () => {
  it("Plan 1, £2,750 a month → £45", () => {
    expect(repaymentForPeriod(2750, ["plan1"]).total).toBe(45);
  });
  it("Plan 4, £3,000 a month → £16", () => {
    expect(repaymentForPeriod(3000, ["plan4"]).total).toBe(16);
  });
  it("Plan 1 + Plan 2, £3,200 a month → £86, split £18 / £68", () => {
    const r = repaymentForPeriod(3200, ["plan2", "plan1"]);
    expect(r.total).toBe(86);
    expect(r.split).toEqual([{ plan: "plan1", amount: 18 }, { plan: "plan2", amount: 68 }]);
  });
  it("Postgraduate Loan + Plan 2, £2,500 a month → £45 + £4 = £49", () => {
    const r = repaymentForPeriod(2500, ["pgl", "plan2"]);
    expect([r.postgraduate, r.undergraduate, r.total]).toEqual([45, 4, 49]);
  });
});

describe("edge cases", () => {
  it("pays nothing at or below the threshold", () => {
    expect(repaymentForPeriod(2083.33, ["plan5"]).total).toBe(0);
    expect(repaymentForPeriod(0, ["plan2"]).total).toBe(0);
  });
  it("pays nothing with no plan", () => {
    expect(repaymentForPeriod(5000, []).total).toBe(0);
  });
  it("rounds down to whole pounds without float errors", () => {
    // £1,065.09 is exactly £500 over the Plan 2 weekly threshold (£565.09): 9% = £45.
    // Plain floating point gives (1065.09 - 565.09) * 0.09 = 44.999999999999986, which floors to £44.
    expect((1065.09 - 565.09) * 0.09).toBeLessThan(45);
    expect(repaymentForPeriod(1065.09, ["plan2"], "week").total).toBe(45);
    // ...but snapping to whole pence would be wrong: £499.95 over → 9% = £44.9955, which must stay £44
    expect(repaymentForPeriod(565.09 + 499.95, ["plan2"], "week").total).toBe(44);
  });
  it("ignores duplicate plans", () => {
    expect(repaymentForPeriod(3200, ["plan1", "plan1"]).total).toBe(repaymentForPeriod(3200, ["plan1"]).total);
  });
  it("only the lowest plan is used when pay is between two thresholds", () => {
    const r = repaymentForPeriod(2400, ["plan1", "plan2"]);
    expect(r.split).toEqual([{ plan: "plan1", amount: 14 }, { plan: "plan2", amount: 0 }]);
  });
  it("rejects negative or NaN pay", () => {
    expect(() => repaymentForPeriod(-1, ["plan1"])).toThrow(RangeError);
    expect(() => repaymentForPeriod(NaN, ["plan1"])).toThrow(RangeError);
  });
  it("yearly salary: £33,000 on Plan 1 monthly = £540 a year", () => {
    expect(yearlyFromSalary(33000, ["plan1"]).perYear).toBe(540);
  });
});

describe("Plan 2 interest", () => {
  it("4.1% at or below £29,385, 6% at £52,885 or more, sliding between", () => {
    expect(plan2InterestRate(20000)).toBeCloseTo(0.041);
    expect(plan2InterestRate(29385)).toBeCloseTo(0.041);
    expect(plan2InterestRate(60000)).toBeCloseTo(0.06);
    expect(plan2InterestRate(41135)).toBeCloseTo(0.056); // halfway: 4.1% + 1.5%
  });
});

describe("projection", () => {
  it("a small balance on a high salary is paid off early", () => {
    const r = project({ plan: "plan1", balance: 5000, salary: 60000, salaryGrowth: 0, yearsLeft: 25 });
    expect(r.paidOff).toBe(true);
    expect(r.months).toBeLessThan(24);
    expect(r.writtenOff).toBe(0);
    expect(r.totalRepaid).toBeCloseTo(5000 + r.totalInterest, 1);
  });
  it("income below the threshold means nothing is repaid and the balance is written off", () => {
    const r = project({ plan: "plan5", balance: 40000, salary: 20000, salaryGrowth: 0, yearsLeft: 40, interest: 0 });
    expect(r).toMatchObject({ paidOff: false, totalRepaid: 0, writtenOff: 40000 });
  });
});
