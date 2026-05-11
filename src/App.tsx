import { useState, useEffect, useCallback } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
} from 'wagmi'
import { injected } from 'wagmi/connectors'
import {
  Sun, Wallet, LogOut, ExternalLink, Loader2,
  CheckCircle2, AlertCircle, Copy, Check, RefreshCw,
} from 'lucide-react'
import { arcTestnet } from './config/wagmi'
import { GM_CONTRACT_ADDRESS, GM_ABI } from './config/contract'

interface GmEvent {
  sender: string
  timestamp: bigint
  txHash: string
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function shortenHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

function timeAgo(ts: bigint) {
  const diff = Math.floor(Date.now() / 1000) - Number(ts)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function App() {
  const { address, isConnected, chain } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()

  const [recentGMs, setRecentGMs] = useState<GmEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [copied, setCopied] = useState(false)

  // Read total GM count from contract
  const { data: totalGMs, refetch: refetchTotal } = useReadContract({
    address: GM_CONTRACT_ADDRESS,
    abi: GM_ABI,
    functionName: 'totalGMs',
  })

  // Read how many times this wallet has said GM
  const { data: myGMCount, refetch: refetchMyCount } = useReadContract({
    address: GM_CONTRACT_ADDRESS,
    abi: GM_ABI,
    functionName: 'gmCount',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Send GM transaction
  const {
    writeContract,
    data: txHash,
    isPending: isSending,
    error: sendError,
    reset: resetWrite,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  // Fetch recent GM events from the blockchain
  const fetchEvents = useCallback(async () => {
    if (!publicClient) return
    setLoadingEvents(true)
    try {
      const logs = await publicClient.getLogs({
        address: GM_CONTRACT_ADDRESS,
        event: GM_ABI[3], // GMSent event
        fromBlock: 0n,
        toBlock: 'latest',
      })
      const events: GmEvent[] = logs
        .slice(-20)
        .reverse()
        .map((log) => ({
          sender: log.args.sender as string,
          timestamp: log.args.timestamp as bigint,
          txHash: log.transactionHash ?? '',
        }))
      setRecentGMs(events)
    } catch (e) {
      console.error('Failed to fetch events:', e)
    } finally {
      setLoadingEvents(false)
    }
  }, [publicClient])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Refetch everything after a GM is confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetchTotal()
      refetchMyCount()
      fetchEvents()
    }
  }, [isConfirmed, refetchTotal, refetchMyCount, fetchEvents])

  const isWrongNetwork = isConnected && chain?.id !== arcTestnet.id

  function sendGM() {
    resetWrite()
    writeContract({
      address: GM_CONTRACT_ADDRESS,
      abi: GM_ABI,
      functionName: 'gm',
    })
  }

  function copyAddress() {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const explorerTx = (hash: string) =>
    `${arcTestnet.blockExplorers.default.url}/tx/${hash}`

  const explorerAddress = (addr: string) =>
    `${arcTestnet.blockExplorers.default.url}/address/${addr}`

  return (
    <div className="min-h-screen bg-[#080a0f] text-white font-sans flex flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-1/4 w-[400px] h-[300px] bg-amber-600/5 rounded-full blur-[100px]" />
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
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-600/25 disabled:opacity-60"
          >
            <Wallet className="w-4 h-4" />
            {isConnecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            ☀️ Arc Testnet · Chain ID 5042002
          </div>
          <h1 className="text-7xl sm:text-8xl font-black tracking-tighter bg-gradient-to-br from-white via-white/90 to-white/40 bg-clip-text text-transparent mb-4">
            GM
          </h1>
          <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
            Say good morning permanently on-chain on Arc network.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-8">
          <StatCard
            label="Total GMs"
            value={totalGMs !== undefined ? totalGMs.toString() : '…'}
            emoji="🌍"
          />
          {isConnected && address && (
            <StatCard
              label="Your GMs"
              value={myGMCount !== undefined ? myGMCount.toString() : '…'}
              emoji="⭐"
            />
          )}
        </div>

        {/* Action card */}
        <div className="w-full max-w-md mb-10">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 backdrop-blur-sm shadow-2xl">

            {!isConnected ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-7 h-7 text-violet-400" />
                </div>
                <p className="text-white/60 text-sm mb-6">Connect your wallet to send a GM on-chain</p>
                <button
                  onClick={() => connect({ connector: injected() })}
                  disabled={isConnecting}
                  className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/25 disabled:opacity-60"
                >
                  {isConnecting ? 'Connecting…' : '🦊 Connect MetaMask'}
                </button>
                <p className="text-white/25 text-xs mt-4">
                  Need testnet USDC?{' '}
                  <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                    Circle Faucet →
                  </a>
                </p>
              </div>
            ) : isWrongNetwork ? (
              <div className="text-center py-4">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="text-white/70 text-sm font-medium mb-1">Wrong Network</p>
                <p className="text-white/40 text-xs mb-5">Switch to Arc Testnet in your wallet</p>
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 text-left space-y-1.5">
                  <InfoRow label="Network" value="Arc Testnet" />
                  <InfoRow label="Chain ID" value="5042002" />
                  <InfoRow label="Currency" value="USDC" />
                  <InfoRow label="RPC" value="rpc.testnet.arc.network" small />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* GM Button */}
                <button
                  onClick={sendGM}
                  disabled={isSending || isConfirming}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed
                    bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                    shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30 text-white"
                >
                  {isSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Confirm in wallet…
                    </span>
                  ) : isConfirming ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Confirming on-chain…
                    </span>
                  ) : '☀️ Send GM on-chain'}
                </button>

                {/* Success */}
                {isConfirmed && txHash && (
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-emerald-400 text-sm font-semibold mb-1">GM sent! ☀️</p>
                      <a
                        href={explorerTx(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-white/50 hover:text-white/80 text-xs transition-colors"
                      >
                        {shortenHash(txHash)} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Error */}
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

                {/* Contract link */}
                <div className="flex items-center justify-between px-1 text-xs text-white/25">
                  <a
                    href={explorerAddress(GM_CONTRACT_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white/50 transition-colors"
                  >
                    Contract <ExternalLink className="w-3 h-3" />
                  </a>
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

        {/* Recent GMs Feed */}
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest">
              Recent GMs on-chain
            </h2>
            <button
              onClick={fetchEvents}
              disabled={loadingEvents}
              className="flex items-center gap-1 text-white/30 hover:text-white/60 text-xs transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loadingEvents ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingEvents && recentGMs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-white/20 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading GMs…
            </div>
          ) : recentGMs.length === 0 ? (
            <div className="text-center py-12 text-white/20 text-sm">
              No GMs yet — be the first! ☀️
            </div>
          ) : (
            <div className="space-y-2">
              {recentGMs.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">☀️</span>
                    <div>
                      <a
                        href={explorerAddress(g.sender)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/70 text-sm font-medium hover:text-white transition-colors"
                      >
                        {shortenAddress(g.sender)}
                      </a>
                      <p className="text-white/30 text-xs">said GM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/25 text-xs">{timeAgo(g.timestamp)}</span>
                    {g.txHash && (
                      <a
                        href={explorerTx(g.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/20 hover:text-white/50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-white/20 text-xs border-t border-white/5 mt-16">
        Contract{' '}
        <a
          href={explorerAddress(GM_CONTRACT_ADDRESS)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/35 hover:text-white/60 font-mono transition-colors"
        >
          {shortenAddress(GM_CONTRACT_ADDRESS)}
        </a>
        {' '}· Built on{' '}
        <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="text-white/35 hover:text-white/60 transition-colors">
          Arc Network
        </a>
      </footer>
    </div>
  )
}

function StatCard({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
      <span className="text-2xl mb-1">{emoji}</span>
      <span className="text-2xl font-black text-white tracking-tight">{value}</span>
      <span className="text-white/30 text-xs mt-0.5">{label}</span>
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
