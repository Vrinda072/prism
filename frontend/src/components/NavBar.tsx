import { useModelStatus } from "../hooks/useModelStatus"

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#numbers", label: "Numbers" },
  { href: "#findings", label: "Findings" },
]

const REPO_URL = "https://github.com/Vrinda072/prism"

const STATUS_LABEL = {
  checking: "Checking",
  online: "Online",
  offline: "Offline",
} as const

const STATUS_DOT = {
  checking: "bg-muted",
  online: "bg-positive",
  offline: "bg-accent",
} as const

export default function NavBar() {
  const status = useModelStatus()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-8 py-4">
        <a href="#workspace" className="flex items-center gap-1 font-heading text-xl font-bold text-ink">
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
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden items-center gap-1.5 font-mono text-xs text-muted sm:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
            CLIP ViT-B/32 &middot; {STATUS_LABEL[status]}
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-ink px-5 py-2.5 text-xs font-medium text-paper transition-opacity hover:opacity-85"
          >
            View repository
          </a>
        </div>
      </div>
    </header>
  )
}
