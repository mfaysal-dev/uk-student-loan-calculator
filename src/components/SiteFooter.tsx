export function SiteFooter({ repo, children }: { repo: string; children?: React.ReactNode }) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-8 text-sm text-slate-600">
        {children}
        <p>
          Built by{" "}
          <a className="font-semibold text-slate-900 underline underline-offset-2 hover:text-[var(--accent)]" href="https://mfaysal.com">
            Mahir Faysal
          </a>{" "}
          ·{" "}
          <a className="underline underline-offset-2 hover:text-[var(--accent)]" href={repo}>
            Source on GitHub
          </a>{" "}
          · Runs in your browser. Nothing you type is sent anywhere.
        </p>
      </div>
    </footer>
  );
}
