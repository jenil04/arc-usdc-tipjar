// Arc USDC Tip Jar — static dapp. No backend, no keys: reads Arc mainnet over public RPC,
// and sends transactions only through the visitor's own browser wallet (EIP-1193).
const JAR = '0x8Ab0Aa71f4a80f64024faAd7068278645b70f0C3';
const DEPLOY_BLOCK = 24912362;
const USDC = '0x3600000000000000000000000000000000000000';
const RPC = 'https://rpc.mainnet.arc.io';
const EXPLORER = 'https://explorer.arc.io';
const CHAIN_ID_HEX = '0x13b2'; // 5042
const TIPPED_TOPIC = '0x4f629a5f1c8e7fc616770a8d34896b447f3457037c40a23347478746309d73c2';
const SEL = { owner: '0x8da5cb5b', balanceOf: '0x70a08231', allowance: '0xdd62ed3e', approve: '0x095ea7b3', tip: '0x0d9d4f06' };
const LOG_CHUNK = 5000; // Arc RPC caps eth_getLogs ranges below 10k blocks
const RECENT_CHUNKS = 36; // ~1 day at ~0.5s blocks

const $ = (id) => document.getElementById(id);
const log = (m) => { $('log').textContent = m; };

async function rpc(method, params) {
  const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}
const pad = (hex) => hex.replace(/^0x/, '').padStart(64, '0');
const addrWord = (a) => pad(a.toLowerCase());
const fmtUsdc = (atomic) => {
  const s = atomic.toString().padStart(7, '0');
  return `${s.slice(0, -6)}.${s.slice(-6)}`.replace(/\.?0+$/, '') || '0';
};
function parseUsdc(str) {
  const m = String(str).trim().match(/^(\d+)(?:\.(\d{0,6}))?$/);
  if (!m) throw new Error('Amount must be a number with at most 6 decimals, e.g. 0.5');
  const v = BigInt(m[1]) * 1000000n + BigInt((m[2] || '').padEnd(6, '0') || '0');
  if (v <= 0n) throw new Error('Amount must be greater than 0');
  return v;
}
function encodeString(s) {
  const bytes = new TextEncoder().encode(s);
  let hex = ''; for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0');
  return pad(bytes.length.toString(16)) + padded;
}
function decodeString(dataHex, wordIndexOfOffset) {
  const d = dataHex.replace(/^0x/, '');
  const off = parseInt(d.slice(wordIndexOfOffset * 64, wordIndexOfOffset * 64 + 64), 16) * 2;
  const len = parseInt(d.slice(off, off + 64), 16);
  const hex = d.slice(off + 64, off + 64 + len * 2);
  const bytes = new Uint8Array(hex.match(/../g)?.map((h) => parseInt(h, 16)) || []);
  return new TextDecoder().decode(bytes);
}
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadStatus() {
  $('jarAddr').textContent = JAR;
  $('jarLink').href = `${EXPLORER}/address/${JAR}`;
  $('cli').textContent = `# Tip 0.5 USDC from the CLI (Foundry). Amounts are 6-decimal ERC-20 USDC.
cast send ${USDC} 'approve(address,uint256)' ${JAR} 500000 --rpc-url ${RPC} --private-key $PRIVATE_KEY
cast send ${JAR} 'tip(uint256,string)' 500000 "hello" --rpc-url ${RPC} --private-key $PRIVATE_KEY`;
  try {
    const ownerWord = await rpc('eth_call', [{ to: JAR, data: SEL.owner }, 'latest']);
    const owner = '0x' + ownerWord.slice(-40);
    $('owner').textContent = owner;
    const bal = await rpc('eth_call', [{ to: USDC, data: SEL.balanceOf + addrWord(owner) }, 'latest']);
    $('ownerBal').textContent = `${fmtUsdc(BigInt(bal))} USDC`;
  } catch (e) {
    $('owner').textContent = `error: ${e.message}`; $('ownerBal').textContent = '—';
  }
}

async function getLogs(from, to) {
  return rpc('eth_getLogs', [{ address: JAR, topics: [TIPPED_TOPIC], fromBlock: '0x' + from.toString(16), toBlock: '0x' + to.toString(16) }]);
}

async function loadTips() {
  try {
    const head = parseInt(await rpc('eth_blockNumber', []), 16);
    const ranges = [];
    for (let i = 0; i < RECENT_CHUNKS; i++) {
      const to = head - i * LOG_CHUNK; const from = Math.max(DEPLOY_BLOCK, to - LOG_CHUNK + 1);
      if (to < DEPLOY_BLOCK) break;
      ranges.push([from, to]);
      if (from === DEPLOY_BLOCK) break;
    }
    const oldest = ranges[ranges.length - 1][0];
    if (oldest > DEPLOY_BLOCK) ranges.push([DEPLOY_BLOCK, DEPLOY_BLOCK + LOG_CHUNK - 1]); // first tips ever
    const logs = [];
    for (let i = 0; i < ranges.length; i += 6) {
      const batch = await Promise.all(ranges.slice(i, i + 6).map(([f, t]) => getLogs(f, t).catch(() => [])));
      batch.forEach((b) => logs.push(...b));
    }
    const seen = new Set();
    const rows = logs.filter((l) => !seen.has(l.transactionHash + l.logIndex) && seen.add(l.transactionHash + l.logIndex))
      .sort((a, b) => parseInt(b.blockNumber, 16) - parseInt(a.blockNumber, 16))
      .map((l) => {
        const from = '0x' + l.topics[1].slice(-40);
        const amount = BigInt('0x' + l.data.slice(2, 66));
        let note = ''; try { note = decodeString(l.data, 1); } catch {}
        return `<tr><td>${parseInt(l.blockNumber, 16)}</td><td><a href="${EXPLORER}/address/${from}" target="_blank" rel="noreferrer">${short(from)}</a></td>`
          + `<td>${fmtUsdc(amount)}</td><td>${esc(note)}</td><td><a href="${EXPLORER}/tx/${l.transactionHash}" target="_blank" rel="noreferrer">${short(l.transactionHash)}</a></td></tr>`;
      });
    $('tips').innerHTML = rows.length ? rows.join('') : '<tr><td colspan="5" class="muted">No tips in the scanned range yet. Be the first!</td></tr>';
    $('tipsNote').innerHTML = `Shows the last ~day plus the first tips after deploy. Full history: <a href="${EXPLORER}/address/${JAR}?tab=logs" target="_blank" rel="noreferrer">explorer logs</a>.`;
  } catch (e) {
    $('tips').innerHTML = `<tr><td colspan="5">Could not load tips: ${esc(e.message)}</td></tr>`;
  }
}

let account;
async function ensureArc(eth) {
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (e) {
    if (e.code !== 4902 && e?.data?.originalError?.code !== 4902) throw e;
    await eth.request({ method: 'wallet_addEthereumChain', params: [{ chainId: CHAIN_ID_HEX, chainName: 'Arc',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: [RPC], blockExplorerUrls: [EXPLORER] }] });
  }
}
async function waitReceipt(hash) {
  for (let i = 0; i < 120; i++) {
    const r = await rpc('eth_getTransactionReceipt', [hash]);
    if (r) { if (r.status !== '0x1') throw new Error(`transaction ${hash} reverted`); return r; }
    await new Promise((s) => setTimeout(s, 1000));
  }
  throw new Error(`timed out waiting for ${hash}`);
}

$('connect').onclick = async () => {
  const eth = window.ethereum;
  if (!eth) { log('No browser wallet found. Install MetaMask/Rabby, or use the CLI commands below.'); return; }
  try {
    [account] = await eth.request({ method: 'eth_requestAccounts' });
    await ensureArc(eth);
    const bal = await rpc('eth_call', [{ to: USDC, data: SEL.balanceOf + addrWord(account) }, 'latest']);
    log(`Connected ${account} on Arc · ${fmtUsdc(BigInt(bal))} USDC`);
    $('tip').disabled = false;
  } catch (e) { log(`Connect failed: ${e.message}`); }
};

$('tip').onclick = async () => {
  const eth = window.ethereum;
  try {
    const amount = parseUsdc($('amount').value);
    const note = $('note').value.slice(0, 120);
    $('tip').disabled = true;
    await ensureArc(eth);
    const allowance = BigInt(await rpc('eth_call', [{ to: USDC, data: SEL.allowance + addrWord(account) + addrWord(JAR) }, 'latest']));
    if (allowance < amount) {
      log('Approve USDC in your wallet…');
      const h1 = await eth.request({ method: 'eth_sendTransaction', params: [{ from: account, to: USDC, data: SEL.approve + addrWord(JAR) + pad(amount.toString(16)) }] });
      log(`Approve sent ${h1}, waiting…`); await waitReceipt(h1);
    }
    log('Confirm the tip in your wallet…');
    const data = SEL.tip + pad(amount.toString(16)) + pad('40') + encodeString(note);
    const h2 = await eth.request({ method: 'eth_sendTransaction', params: [{ from: account, to: JAR, data }] });
    log(`Tip sent ${h2}, waiting…`); await waitReceipt(h2);
    $('log').innerHTML = `Thanks! Tipped ${fmtUsdc(amount)} USDC. <a href="${EXPLORER}/tx/${h2}" target="_blank" rel="noreferrer">View on explorer</a>`;
    loadStatus(); loadTips();
  } catch (e) { log(`Tip failed: ${e.message}`); }
  finally { $('tip').disabled = !account; }
};

loadStatus();
loadTips();
