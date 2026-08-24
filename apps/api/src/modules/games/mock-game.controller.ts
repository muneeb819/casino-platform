import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import crypto from "crypto";
import { AppConfig } from "../../common/config";
import { PrismaService } from "../../common/prisma.service";
import { WalletService } from "../wallet/wallet.service";

const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎"];
const TRIPLE_MULT: Record<string, number> = { "🍒": 3, "🍋": 5, "🔔": 10, "⭐": 15, "💎": 40 };

@Controller("mock-game")
export class MockGameController {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  @Get(":token")
  async page(@Param("token") token: string, @Res() res: Response) {
    const session = await this.prisma.gameSession.findUnique({
      where: { sessionToken: token },
      include: { game: true },
    });
    if (!session || session.status !== "OPEN") throw new NotFoundException("Session not found");
    const balanceCents = await this.wallet.balanceOf(session.userId);
    res.type("html").send(this.renderHtml(session.sessionToken, session.game.name, balanceCents));
  }

  @HttpCode(200)
  @Post(":token/spin")
  async spin(@Param("token") token: string, @Body() body: { betCents: number }) {
    const session = await this.prisma.gameSession.findUnique({ where: { sessionToken: token } });
    if (!session || session.status !== "OPEN") throw new NotFoundException("Session not found");
    const user = await this.wallet.assertPlayable(session.userId);

    const bet = Number(body.betCents);
    if (!Number.isInteger(bet) || bet < 10 || bet > 100000) {
      throw new ForbiddenException("Invalid bet size");
    }
    void user;

    const roundId = `mg_${crypto.randomBytes(9).toString("hex")}`;
    await this.wallet.placeBet({
      userId: session.userId,
      gameId: session.gameId,
      roundId,
      amountCents: bet,
    });

    const reels: string[] = [this.pick(), this.pick(), this.pick()];
    let payoutCents = 0;
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      payoutCents = bet * TRIPLE_MULT[reels[0]];
    } else if (
      reels[0] === reels[1] ||
      reels[1] === reels[2] ||
      reels[0] === reels[2]
    ) {
      payoutCents = Math.floor(bet / 2);
    }

    if (payoutCents > 0) {
      await this.wallet.settleWin({
        userId: session.userId,
        gameId: session.gameId,
        roundId: `${roundId}_win`,
        amountCents: payoutCents,
      });
    }

    return {
      reels,
      payoutCents,
      balanceCents: await this.wallet.balanceOf(session.userId),
    };
  }

  @HttpCode(200)
  @Post(":token/close")
  async close(@Param("token") token: string) {
    await this.prisma.gameSession.updateMany({
      where: { sessionToken: token, status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    return { ok: true };
  }

  private pick(): string {
    return SYMBOLS[crypto.randomInt(SYMBOLS.length)];
  }

  private renderHtml(token: string, gameName: string, balanceCents: number): string {
    const apiBase = AppConfig.load().publicBaseUrl;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${gameName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: radial-gradient(circle at top, #1e293b, #0f172a); color: #f8fafc;
         min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }
  h1 { font-size: 1.1rem; letter-spacing: .2em; text-transform: uppercase; color: #fbbf24; }
  .machine { background:#111827; border:1px solid #334155; border-radius:16px; padding:22px; box-shadow:0 20px 60px rgba(0,0,0,.6); }
  .reels { display:flex; gap:12px; margin-bottom:16px; }
  .reel { width:76px; height:76px; display:flex; align-items:center; justify-content:center; font-size:44px;
          background:#0f172a; border:1px solid #334155; border-radius:12px; }
  .reel.spin { animation: bump .15s linear infinite; }
  @keyframes bump { 50% { transform: translateY(-4px); } }
  .balance { color:#a5b4fc; font-variant-numeric: tabular-nums; }
  .row { display:flex; gap:8px; justify-content:center; margin-top:14px; flex-wrap: wrap;}
  button.bet { padding:6px 12px; border-radius:8px; border:1px solid #475569; background:#1e293b; color:#e2e8f0; cursor:pointer; }
  button.bet.active { background:#f59e0b; color:#1f2937; border-color:#f59e0b; font-weight:700; }
  #spinBtn { margin-top:14px; padding:12px 42px; font-size:1rem; font-weight:800; letter-spacing:.1em; border:none;
             border-radius:10px; background:linear-gradient(180deg,#fbbf24,#d97706); color:#1f2937; cursor:pointer; }
  #spinBtn:disabled { opacity:.5; cursor:wait; }
  #result { min-height:24px; font-weight:700; }
</style>
</head>
<body>
  <h1>${gameName}</h1>
  <div class="machine">
    <div class="reels">
      <div class="reel" id="r0">🍒</div>
      <div class="reel" id="r1">🍋</div>
      <div class="reel" id="r2">🔔</div>
    </div>
    <div style="text-align:center">Balance: <span class="balance" id="bal"></span></div>
    <div class="row" id="chips"></div>
    <div style="text-align:center"><button id="spinBtn">SPIN</button></div>
    <div id="result" style="text-align:center;margin-top:10px;color:#fbbf24"></div>
  </div>
<script>
  var TOKEN = ${JSON.stringify(token)};
  var API = ${JSON.stringify(apiBase)};
  var state = { bet: 50, balance: ${balanceCents} / 100 };
  var chips = [10, 50, 100, 500];
  var balEl = document.getElementById('bal');
  var resultEl = document.getElementById('result');
  var spinBtn = document.getElementById('spinBtn');
  var chipsEl = document.getElementById('chips');
  function fmt(c) { return '$' + (c / 100).toFixed(2); }
  function renderBal() { balEl.textContent = fmt(state.balance); }
  chips.forEach(function (c) {
    var b = document.createElement('button');
    b.className = 'bet' + (c === state.bet ? ' active' : '');
    b.textContent = fmt(c);
    b.onclick = function () {
      state.bet = c;
      Array.prototype.forEach.call(chipsEl.children, function (el) { el.classList.remove('active'); });
      b.classList.add('active');
    };
    chipsEl.appendChild(b);
  });
  renderBal();
  spinBtn.onclick = function () {
    spinBtn.disabled = true;
    document.querySelectorAll('.reel').forEach(function (el) { el.classList.add('spin'); });
    resultEl.textContent = '';
    fetch(API + '/mock-game/' + TOKEN + '/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betCents: state.bet })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setTimeout(function () {
          ['r0','r1','r2'].forEach(function (id, i) {
            var el = document.getElementById(id);
            el.classList.remove('spin');
            el.textContent = data.reels[i];
          });
          state.balance = data.balanceCents;
          renderBal();
          resultEl.textContent = data.payoutCents > 0
            ? 'WIN +' + fmt(data.payoutCents)
            : 'No win - try again';
          spinBtn.disabled = false;
        }, 420);
      })
      .catch(function () { spinBtn.disabled = false; });
  };
  window.addEventListener('beforeunload', function () {
    navigator.sendBeacon(API + '/mock-game/' + TOKEN + '/close');
  });
</script>
</body>
</html>`;
  }
}
