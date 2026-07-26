import { Link, useLocation } from "react-router-dom";

type InfoSlug = "security" | "terms" | "privacy" | "risk";

const PAGES: Record<
  InfoSlug,
  { title: string; eyebrow: string; body: string[] }
> = {
  security: {
    title: "How Orbit handles your keys",
    eyebrow: "Non-custodial",
    body: [
      "Orbit never holds, stores, or transmits your private keys or seed phrase.",
      "You connect through Freighter, Albedo, or xBull. Every payment, swap, and escrow requires an explicit wallet approval from you.",
      "AI or chat suggestions only prepare transaction details. Your wallet alone authorizes value movement on Stellar.",
      "Orbit currently runs on Stellar testnet. Do not send real mainnet funds to addresses used here.",
    ],
  },
  terms: {
    title: "Terms of service",
    eyebrow: "Legal",
    body: [
      "Orbit is a testnet demonstration product built for the Rise In × Stellar builder program.",
      "The software is provided as-is, without warranty. Testnet assets have no real-world value.",
      "You are responsible for the wallets you connect and the transactions you approve.",
      "These terms are a lightweight placeholder and will be expanded before any mainnet launch.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    eyebrow: "Legal",
    body: [
      "Orbit processes chat commands and wallet interaction events locally in your browser where possible.",
      "Optional product analytics (for example Vercel Analytics) may collect anonymous usage events such as page views and feature usage.",
      "Feedback you submit may include a truncated wallet address if you are connected.",
      "We do not sell personal data. This policy will be expanded before mainnet.",
    ],
  },
  risk: {
    title: "Risk disclosure",
    eyebrow: "Legal",
    body: [
      "Crypto and DeFi products involve risk, including loss of funds, smart-contract bugs, and network downtime.",
      "Orbit is experimental software on Stellar testnet. Do not use real funds or rely on it for production finance.",
      "Transaction previews and chat responses can be wrong. Always verify amounts, addresses, and network before signing.",
      "Past testnet behavior does not guarantee future mainnet performance or security.",
    ],
  },
};

export function InfoPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "") as InfoSlug;
  const page = slug in PAGES ? PAGES[slug] : null;

  if (!page) {
    return (
      <div className="metrics-page info-page">
        <h1>Page not found</h1>
        <p className="metrics-sub">
          <Link to="/" className="text-link">
            Back to Chat
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="metrics-page info-page">
      <header className="metrics-hero">
        <div>
          <p className="metrics-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
        </div>
      </header>
      <section className="info-prose">
        {page.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
      <p className="info-back">
        <Link to="/" className="text-link">
          ← Back to Chat
        </Link>
      </p>
    </div>
  );
}
