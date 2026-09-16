const NAV_LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#numbers", label: "Numbers" },
  { href: "#api", label: "API" },
]

const REPO_URL = "https://github.com/Vrinda072/prism"

export default function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-8 py-4">
        <a href="#overview" className="flex items-center gap-1 font-heading text-xl font-bold text-ink">
          PRISM
          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-xs font-medium text-paper transition-opacity hover:opacity-85"
        >
          View repository
        </a>
      </div>
    </header>
  )
}
