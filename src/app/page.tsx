import { LoanCalculator } from "@/components/LoanCalculator";
import { SiteFooter } from "@/components/SiteFooter";
import { PERIODS, PLANS, TAX_YEAR, periodThreshold, type PlanId } from "@/lib/loans";
import { SITE } from "@/site";

const gbp = (n: number, d = 0) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: d, maximumFractionDigits: d });

const faqs = [
  {
    q: "How much is taken from my pay for my student loan?",
    a: "9% of everything you earn above your plan's threshold (6% for a Postgraduate Loan). On Plan 2 in 2026/27 the threshold is £29,385 a year, so on £35,000 you repay 9% of £5,615, which is about £42 a month.",
  },
  {
    q: "Which student loan plan am I on?",
    a: "It depends on where you lived and when your course started. England from September 2012 to July 2023 is usually Plan 2, England from August 2023 is Plan 5, Scotland is Plan 4, and Northern Ireland or England and Wales before September 2012 is Plan 1. Your payslip, P60 or online repayment account shows the plan.",
  },
  {
    q: "Does the amount I owe change my monthly repayment?",
    a: "No. Repayments depend only on your income. Your balance and interest only decide whether you clear the loan before it is written off.",
  },
  {
    q: "I have two plans. Do I pay twice?",
    a: "Not for undergraduate plans. You pay one 9% deduction over the lowest threshold of the plans you have, and it is shared between them. A Postgraduate Loan is separate: you pay 6% over £21,000 on top.",
  },
  {
    q: "Why is my payslip deduction different?",
    a: "Employers work on each pay period, not your yearly salary, and round down to the whole pound. Bonuses or overtime in one month raise that month's deduction. If you earned under the yearly threshold over the whole tax year, you can ask for a refund.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: SITE.name,
      url: SITE.url,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      author: { "@type": "Person", name: "Mahir Faysal", url: "https://mfaysal.com" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

const ORDER: PlanId[] = ["plan1", "plan2", "plan4", "plan5", "pgl"];

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bg-[var(--accent)] text-white">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-100">Tax year {TAX_YEAR} · England, Scotland, Wales, NI</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">UK Student Loan Repayment Calculator</h1>
          <p className="mt-3 max-w-2xl text-teal-50">
            See how much comes out of your pay each month on Plan 1, 2, 4, 5 or a Postgraduate Loan, using the HMRC
            thresholds for {TAX_YEAR}. Then check whether you are likely to clear the loan before it is written off.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-3xl px-4">
        <LoanCalculator />

        <article className="prose-uk mt-10">
          <h2>Student loan thresholds for {TAX_YEAR}</h2>
          <p>These apply from 6 April 2026 to 5 April 2027. Pay-period figures are the ones HMRC gives employers.</p>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th scope="col">Plan</th><th scope="col">Yearly</th><th scope="col">Monthly</th><th scope="col">Weekly</th><th scope="col">Rate</th><th scope="col">Written off after</th></tr>
              </thead>
              <tbody>
                {ORDER.map((p) => (
                  <tr key={p}>
                    <th scope="row">{PLANS[p].name}</th>
                    <td>{gbp(PLANS[p].threshold)}</td>
                    <td>{gbp(periodThreshold(PLANS[p].threshold, "month"), 2)}</td>
                    <td>{gbp(periodThreshold(PLANS[p].threshold, "week"), 2)}</td>
                    <td>{PLANS[p].rate * 100}%</td>
                    <td>{PLANS[p].writeOffYears} years</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Write-off periods count from the April you were first due to repay. Plan 1 loans first paid before 1 September 2006 are
            written off at 65 instead, and some older Plan 4 loans at 65 or 30 years, whichever comes first.
          </p>

          <h2>How the repayment is worked out</h2>
          <ul>
            <li>Your employer divides the yearly threshold by the number of pay days ({PERIODS.month} for monthly, {PERIODS.week} for weekly).</li>
            <li>They take 9% of your pay above that figure, or 6% above the Postgraduate Loan threshold, and round down to the whole pound.</li>
            <li>With two undergraduate plans you pay once, over the lowest threshold. The lower plan gets at most 9% of the gap between the two thresholds and the rest goes to the other plan.</li>
            <li>A Postgraduate Loan is taken on top, at 6% over £21,000 a year.</li>
          </ul>
          <h3>Example</h3>
          <p>
            You are on Plan 1 and earn £33,000 a year, paid monthly. £2,750 − £2,241.66 = £508.34, and 9% of that is £45.75,
            so £45 is taken each month. This matches the worked example on gov.uk.
          </p>

          <h2>Interest rates</h2>
          <p>
            On 4 October 2026 gov.uk listed 4.1% for Plans 1, 4 and 5 and 6% for the Postgraduate Loan. Plan 2 interest after you leave your course
            is 4.1% on incomes up to £29,385, rising on a sliding scale to 6% at £52,885 or more. The payoff estimate uses these rates and keeps
            thresholds fixed, so treat it as a rough guide, not a forecast.
          </p>

          <h2>Questions</h2>
          {faqs.map((f) => (
            <section key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </section>
          ))}

          <h2>Sources</h2>
          <ul>
            <li><a href="https://www.gov.uk/repaying-your-student-loan/what-you-pay">Repaying your student loan: how much you repay (gov.uk)</a></li>
            <li><a href="https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027">Rates and thresholds for employers 2026 to 2027 (HMRC)</a></li>
            <li><a href="https://www.gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled">When your student loan gets written off (gov.uk)</a></li>
          </ul>
        </article>
      </main>

      <SiteFooter repo={SITE.repo}>
        <p>
          This calculator is an independent tool and is not connected to the Student Loans Company or HMRC. It gives estimates only.
          Check your payslip or your online repayment account for the amounts that apply to you.
        </p>
      </SiteFooter>
    </>
  );
}
