import { useState, useEffect } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { parseEther } from 'viem'
import { Sun, Wallet, LogOut, ExternalLink, Loader2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react'
import { arcTestnet, projectId } from './config/wagmi'

// GM calldata (0x474d = "GM" in hex) sent to this vanity address
const GM_ADDRESS = '0x000000000000000000000000000000000000474d' as const
const GM_HEX = '0x474d'

interface GmRecord {
  txHash: string
  address: string
  timestamp: number
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function shortenHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function App() {
  const { address, isConnected, chain } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const [gmRecords, setGmRecords] = useState<GmRecord[]>([])
  const [copied, setCopied] = useState(false)
  const [showWalletMenu, setShowWalletMenu] = useState(false)

  const {
    sendTransaction,
    data: txHash,
    isPending: isSending,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Load saved GMs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gm-records')
    if (saved) {
      try { setGmRecords(JSON.parse(saved)) } catch { /* ignore */ }
    }
  }, [])

  // Save new confirmed GM to history
  useEffect(() => {
    if (isConfirmed && txHash && address) {
      const newRecord: GmRecord = { txHash, address, timestamp: Date.now() }
      setGmRecords(prev => {
        const updated = [newRecord, ...prev].slice(0, 20)
        localStorage.setItem('gm-records', JSON.stringify(updated))
        return updated
      })
    }
  }, [isConfirmed, txHash, address])

  const isWrongNetwork = isConnected && chain?.id !== arcTestnet.id

  function sendGM() {
    resetSend()
    sendTransaction({
      to: GM_ADDRESS,
      value: parseEther('0'),
      data: GM_HEX,
    })
  }

  function copyAddress() {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function connectMetaMask() {
    connect({ connector: injected() })
    setShowWalletMenu(false)
  }

  function connectWalletConnect() {
    connect({ connector: walletConnect({ projectId }) })
    setShowWalletMenu(false)
  }

  const explorerUrl = (hash: string) =>
    `${arcTestnet.blockExplorers.default.url}/tx/${hash}`

  return (
    <div className="min-h-screen bg-[#080a0f] text-white font-sans flex flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-1/4 w-[400px] h-[300px] bg-blue-600/8 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-sm tracking-wide text-white/80">OnChain GM</span>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Arc Testnet
            </span>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {shortenAddress(address!)}
            </button>
            <button
              onClick={() => disconnect()}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
              title="Disconnect"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-600/25 disabled:opacity-60"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
            {showWalletMenu && (
              <div className="absolute right-0 top-12 w-52 rounded-xl bg-[#0f1117] border border-white/10 shadow-2xl overflow-hidden z-50">
                <button
                  onClick={connectMetaMask}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-all"
                >
                  🦊 MetaMask
                </button>
                <div className="border-t border-white/5" />
                <button
                  onClick={connectWalletConnect}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-all"
                >
                  🔗 WalletConnect
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <span>☀️</span>
            Arc Testnet · Chain ID 5042002
          </div>
          <h1 className="text-7xl sm:text-8xl font-black tracking-tighter bg-gradient-to-br from-white via-white/90 to-white/40 bg-clip-text text-transparent mb-4">
            GM
          </h1>
          <p className="text-white/40 text-base max-w-sm mx-auto leading-relaxed">
            Say good morning to the world — permanently, on-chain, on Arc network.
          </p>
        </div>

        {/* Action card */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 backdrop-blur-sm shadow-2xl">

            {!isConnected ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-7 h-7 text-violet-400" />
                </div>
                <p className="text-white/60 text-sm mb-6">Connect your wallet to send a GM on-chain</p>
                <button
                  onClick={() => setShowWalletMenu(v => !v)}
                  className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/25"
                >
                  Connect Wallet
                </button>
                <p className="text-white/25 text-xs mt-4">
                  Need testnet USDC for gas?{' '}
                  <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                    Circle Faucet →
                  </a>
                </p>
              </div>
            ) : isWrongNetwork ? (
              <div className="text-center py-4">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="text-white/70 text-sm mb-1 font-medium">Wrong Network</p>
                <p className="text-white/40 text-xs mb-5">Please switch to Arc Testnet in your wallet</p>
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 text-left space-y-1.5">
                  <InfoRow label="Network" value="Arc Testnet" />
                  <InfoRow label="Chain ID" value="5042002" />
                  <InfoRow label="Currency" value="USDC" />
                  <InfoRow label="RPC" value="rpc.testnet.arc.network" small />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={sendGM}
                  disabled={isSending || isConfirming}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed
                    bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                    shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30 text-white"
                >
                  {isSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Confirm in wallet…
                    </span>
                  ) : isConfirming ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Confirming on-chain…
                    </span>
                  ) : (
                    '☀️ Send GM on-chain'
                  )}
                </button>

                {isConfirmed && txHash && (
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-emerald-400 text-sm font-semibold mb-1">GM sent! ☀️</p>
                      <a
                        href={explorerUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-white/50 hover:text-white/80 text-xs transition-colors"
                      >
                        <span>{shortenHash(txHash)}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                )}

                {sendError && (
                  <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 text-sm font-semibold mb-0.5">Transaction failed</p>
                      <p className="text-white/40 text-xs leading-relaxed line-clamp-3">
                        {sendError.message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-1 text-xs text-white/25">
                  <span>Data: <code className="text-white/40">0x474d</code> = "GM"</span>
                  <a
                    href="https://testnet.arcscan.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white/50 transition-colors"
                  >
                    ArcScan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GM History */}
        {gmRecords.length > 0 && (
          <div className="w-full max-w-md mt-8">
            <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest mb-3 px-1">
              Your GM History
            </h2>
            <div className="space-y-2">
              {gmRecords.map((r, i) => (
                <a
                  key={i}
                  href={explorerUrl(r.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">☀️</span>
                    <div>
                      <p className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">
                        {shortenHash(r.txHash)}
                      </p>
                      <p className="text-white/30 text-xs">{shortenAddress(r.address)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/30 text-xs">
                    <span>{timeAgo(r.timestamp)}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-white/20 text-xs border-t border-white/5">
        Built on{' '}
        <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 transition-colors">
          Arc Network
        </a>
        {' '}· GM = <code className="text-white/35">0x474d</code>
      </footer>
    </div>
  )
}

function InfoRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/35 text-xs">{label}</span>
      <span className={`text-white/60 font-mono ${small ? 'text-[11px]' : 'text-xs'}`}>{value}</span>
    </div>
  )
}
