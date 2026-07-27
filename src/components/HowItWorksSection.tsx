function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-9z"
      />
      <path strokeLinecap="round" d="M16 12.5h.01" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10h8M8 14h5M7 4h10a3 3 0 013 3v7a3 3 0 01-3 3H9l-4 3v-3a3 3 0 01-3-3V7a3 3 0 013-3z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h3l2-7 4 14 2-7h5" />
    </svg>
  );
}

const STEPS = [
  {
    step: "01",
    title: "Connect your wallet",
    body: "Link Freighter, Albedo, or xBull. Orbit never touches your keys — you stay in control.",
    icon: WalletIcon,
  },
  {
    step: "02",
    title: "Talk to Orbit",
    body: "Type what you want in plain language: send XLM, swap assets, fund testnet, or open escrow.",
    icon: ChatIcon,
  },
  {
    step: "03",
    title: "Approve on-chain",
    body: "Every payment is prepared in chat, then signed in your wallet. Nothing moves without you.",
    icon: ShieldIcon,
  },
  {
    step: "04",
    title: "See the results",
    body: "Private activity on your wallet page. Public product stats and feedback on Insights.",
    icon: PulseIcon,
  },
] as const;

const CAPABILITIES = [
  {
    title: "Send",
    command: "send 10 XLM to G…",
    detail: "Peer transfers with explorer links and contract logging on testnet.",
  },
  {
    title: "Swap",
    command: "swap 5 XLM to USDC",
    detail: "Get a quote, confirm once, and execute through Stellar DEX paths.",
  },
  {
    title: "Escrow",
    command: "escrow 25 XLM to G…",
    detail: "Lock funds until release or refund — useful for demos and deals.",
  },
  {
    title: "Insights",
    command: "open /insights",
    detail: "Judges and visitors see live usage, wallets, and anonymous feedback.",
  },
] as const;

interface HowItWorksSectionProps {
  onLaunch: () => void;
  isConnecting: boolean;
}

export function HowItWorksSection({ onLaunch, isConnecting }: HowItWorksSectionProps) {
  return (
    <section id="how-it-works" className="how-it-works" aria-labelledby="how-it-works-title">
      <div className="how-it-works-inner">
        <header className="how-it-works-header">
          <p className="how-it-works-eyebrow">How it works</p>
          <h2 id="how-it-works-title" className="how-it-works-title">
            From chat to Stellar
            <br />
            in four steps
          </h2>
          <p className="how-it-works-lead">
            Orbit is conversational finance on Stellar testnet — built for Rise In. No forms, no
            dashboards-first UX. Just message, sign, and go.
          </p>
        </header>

        <ol className="how-steps">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.step} className="how-step-card">
                <div className="how-step-icon" aria-hidden>
                  <Icon />
                </div>
                <div className="how-step-body">
                  <span className="how-step-num">{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="how-capabilities">
          <div className="how-capabilities-head">
            <h3>What you can do today</h3>
            <p>Real commands on testnet — try them after you launch.</p>
          </div>
          <ul className="how-cap-grid">
            {CAPABILITIES.map((cap) => (
              <li key={cap.title} className="how-cap-card">
                <p className="how-cap-label">{cap.title}</p>
                <code className="how-cap-command">{cap.command}</code>
                <p className="how-cap-detail">{cap.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="how-trust-strip">
          <div className="how-trust-item">
            <span className="how-trust-dot" aria-hidden />
            <span>Non-custodial</span>
          </div>
          <div className="how-trust-item">
            <span className="how-trust-dot" aria-hidden />
            <span>Stellar testnet</span>
          </div>
          <div className="how-trust-item">
            <span className="how-trust-dot" aria-hidden />
            <span>Wallet-signed txs</span>
          </div>
        </div>

        <div className="how-cta">
          <button
            type="button"
            className="hero-connect-btn"
            disabled={isConnecting}
            onClick={onLaunch}
          >
            {isConnecting ? "Launching…" : "Launch app"}
          </button>
          <p className="how-cta-note">Free testnet XLM via Friendbot after you connect.</p>
        </div>
      </div>
    </section>
  );
}
