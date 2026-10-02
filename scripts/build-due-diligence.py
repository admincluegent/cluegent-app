"""Render aggregate-only due diligence artifacts. Never connects to production."""
import json, html, re
from pathlib import Path
from datetime import datetime, timedelta
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
d = json.loads((OUT / 'CLUEGENT_METRICS.json').read_text())
f, r, u = d['firebase'], d['razorpay'], d['usage']
money = lambda n: f'INR {n / 100:,.2f}'
pc = lambda n: f'{100*n:.2f}%'
gross = r['baseCurrencyAllTime']['INR']['grossSubunits']
commercial = r['baseCurrencyCommercial']['INR']['grossSubunits']
last30 = r['baseCurrencyLast30']['INR']['grossSubunits']
months = ['2026-04','2026-05','2026-06','2026-07','2026-08','2026-09']
signups = [f['monthlySignupsExistingAccounts'].get(m,0) for m in months]
revenues = [r['baseCurrencyMonthly'].get(m,{}).get('INR',{}).get('grossSubunits',0)/100 for m in months]
sections=[]
def section(title, subtitle, blocks): sections.append({'title':title,'subtitle':subtitle,'blocks':blocks})
def p(s): return ('p',s)
def h(s): return ('h',s)
def table(headers, rows): return ('table',headers,rows)
def chart(title, labels, values, unit): return ('chart',title,labels,values,unit)
na='Data unavailable or requires access'

section('Cluegent', 'TRACTION & ACQUISITION DUE DILIGENCE / 24 SEPTEMBER 2026', [
p('An evidence-led review of the product, retained user base, payment collections and measurable growth. Prepared for founder and prospective-buyer review; not an audited financial statement or valuation.'),
table(['Current traction','Verified result'],[
['Existing signed-in Firebase accounts',str(f['totalExistingAuthAccounts'])],
['Explicit Free-plan signed-in accounts',str(f['signedInClassification']['free'])],
['Commercial paying identities, all time',str(r['commercialUniquePayingIdentities'])],
['Customer collections, excluding live tests',money(commercial)],
['Last 30 days captured collections',money(last30)],
['Active live paid entitlements','11'],
['Paying-customer countries',na]]),
h('The acquisition thesis'),
p('Cluegent has a functioning desktop AI product, measurable customer payments and an expanding retained signup base. The evidence supports early commercial traction, but does not yet establish repeatable acquisition economics, strong retention, recurring revenue or profitability.'),
p('The strongest buyer narrative is verified early demand plus a working technical asset. The principal diligence needs are measurement quality, renewal behavior, customer geography, operating costs and software ownership/licensing.'),
p('Scope: aggregate-only, read-only production analysis. No customer names, emails, account identifiers, payment identifiers or secrets are included. User instruction to continue with the full PDF is treated as approval to finalize with all caveats retained.'),
p('Primary snapshot: '+d['asOf']+' UTC. Last 30 days: '+d['last30Days']['from']+' to '+d['last30Days']['to']+'. Analytics uses a different, explicitly labeled calendar window. [S1-S4]')])

section('01 / Product overview','WHAT THE ASSET DOES',[
p('Cluegent is an Electron desktop assistant for live conversations, interview preparation and permitted interview assistance, coding prompts, screenshot-aware answers and resume/context-aware workflows. The code includes a desktop overlay, audio capture and transcription, streaming AI responses, local meeting history and retrieval, Firebase identity and usage controls, paid plan entitlements and a public marketing website. [S5]'),
table(['Layer','Observed implementation'],[
['Desktop experience','Electron 42, React 18, TypeScript 5.6; Vite 8, Tailwind 3, Radix and Framer Motion'],
['Native integration','Rust NAPI module; audio capture/resampling/VAD; platform-specific Windows and macOS integrations'],
['AI services','Provider routing for OpenAI, DeepSeek, Gemini and Groq; transcription integration including Deepgram token service and AssemblyAI code'],
['Cloud backend','Firebase Authentication, named Firestore database cluegent, Firebase Functions and Hosting'],
['Commerce','Razorpay live/test payment integration, server-side verification and entitlement/usage enforcement'],
['Local data','SQLite and vector-retrieval code paths for local history/context'],
['Acquisition surface','Static/generated SEO website and GA4 website instrumentation']]),
h('Customer value and limits'),
p('The integrated desktop workflow reduces switching between transcription, context and AI assistance. Screen-capture exclusion is platform-dependent; this review does not certify invisibility across every sharing application or OS. Position and sell the product for authorized use, with clear recording and disclosure expectations.'),
p('Product capabilities above are source-code observations, not a fresh end-to-end release test. Local package version is 1.0.8; the deployed binary/version was not independently attested. No broad security audit or performance benchmark was performed. [S5]')])

classes=[['Stored Free plan',229],['Expired paid entitlement, effective Free',6],['Active live paid entitlement',11],['Other non-free entitlement, payment provenance unverified',1],['Test entitlement',1]]
section('02 / User dashboard','FIREBASE AUTH + FIRESTORE RECONCILIATION',[
table(['Metric','Value / definition'],[
['Existing Auth accounts / with a recorded sign-in','248 / 248'],['Stored Free-plan signed-in users','229'],['Effective Free including expired paid entitlement','235 = 229 + 6'],['Active live paid plan split','Plus 8; Pro 2; Power 1'],['Email-verified / disabled accounts',f"{f['verifiedEmail']} / {f['disabled']}"],['Signups in rolling last 30 days',str(f['signupsLast30Days'])],['Firestore profiles / profiles without current Auth','268 / 20'],['Current Auth accounts missing profile','0']]),
table(['Mutually exclusive current Auth classification','Accounts'],classes),
h('Conversion, carefully defined'),
p('21 of 248 currently retained Auth accounts match a commercial payer: 8.47%. This is a snapshot ever-paid share, not a historical signup-cohort conversion rate. There are 22 all-time commercial paying identities; one has no current Auth match. Active live paid entitlements are 11 of 248 accounts, or 4.44%. [S1-S3]'),
p('All-time commercial payer states: 11 active live paid, 4 currently Free, 6 expired paid entitlements and 1 without a current Auth match. Past purchasers are not necessarily current paying subscribers.'),
p('Auth counts include only accounts still present. Deleted signups are absent, so 248 is not a defensible lifetime-ever-signup total. Expired entitlements may remain stored as paid until a later application request normalizes them. No production normalization was triggered during this review.')])

growth=[]
for i,m in enumerate(months):
    rate='N/A (no prior month)' if i==0 else ('N/A (prior month zero)' if signups[i-1]==0 else pc(signups[i]/signups[i-1]-1))
    growth.append([m+(' (partial)' if m=='2026-09' else ''),str(signups[i]),str(sum(signups[:i+1])),rate])
section('03 / Growth history','RETAINED SIGNUP COHORTS; NOT A LAUNCH-DATE CLAIM',[
chart('Monthly retained-account signups', ['Apr','May','Jun','Jul','Aug','Sep*'],signups,'accounts'),
table(['Month','Signups','Cumulative','MoM'],growth),
p('September is incomplete through 24 September; its comparison with a full August is not like-for-like. Month-on-month percentages are descriptive arithmetic, not forecasts. Daily and Monday-start weekly signup series are supplied in CLUEGENT_METRICS.json. Missing dates in those maps mean zero retained-account signups, not missing API pages. [S1]'),
h('Observed milestones'),
p('16 April 2026: earliest retained Auth account. May: live-test payment activity only in the captured ledger. June: first month with non-test captured collections in the available ledger. August: retained monthly signups rise to 87 and gross collections reach INR 11,453.03. September to snapshot: 91 retained signups and INR 19,062.15 gross collections. [S1, S3]'),
p('Official launch date, pre-retention history and deleted-account events: '+na+'. The report begins at the earliest retained evidence, not an asserted product launch.')])

section('04 / Revenue & collections','RAZORPAY LIVE LEDGER; NOT MRR OR PROFIT',[
table(['Measure','All time','Last 30 days'],[
['Gross captured collections, INR base',money(gross),money(last30)],
['Commercial collections, excluding live tests',money(commercial),money(last30)],
['Captured transactions','28','12'],['Commercial transactions','23','12'],['Unique commercial paying identities','22','12'],
['Native INR payment amount','INR 17,011.00','INR 7,494.00'],['Native USD payment amount','USD 199.00','USD 163.00'],['Recorded refunds','0','0']]),
p('Five captured live-test transactions total INR 25.00. They are included in gross processor collections but excluded from commercial collections. Razorpay has 35 payment records: 28 captured and 7 failed. Failed attempts contribute no revenue. [S3]'),
h('Currency and accounting method'),
p('INR payments use their native amount. USD payments use the actual Razorpay base_amount/base_currency: INR 18,661.67 all time and INR 15,273.55 in the last 30 days. These are recorded processor conversions, not an invented FX rate. Original USD and INR amounts are never simply added together.'),
p('Collections are grouped by payment creation timestamp, not bank settlement date. Captured cash is not accrual revenue, recurring revenue, net profit or cash received in the bank. Processor fees, taxes, chargebacks, settlements, operating costs and deferred-revenue accounting have not been reconciled; those measures are '+na+'.'),
p('The refund endpoint returned zero records and captured payments show zero amount refunded. This does not constitute an independent bank or chargeback audit. Identity deduplication uses Firebase UID, with customer ID/email fallbacks in memory; a paying identity is not a verified natural person.')])

planrows=[[k.title(),str(v['INR']['payments']),money(v['INR']['grossSubunits'])] for k,v in sorted(r['baseCurrencyByPlan'].items())]
section('05 / Revenue growth & mix','ACTUAL CAPTURED AMOUNTS; SEPTEMBER IS PARTIAL',[
chart('Monthly captured collections', ['Apr','May','Jun','Jul','Aug','Sep*'],revenues,'INR'),
table(['Month','Gross INR base','Scope'],[[m,money(round(revenues[i]*100)),'Live-test only' if m=='2026-05' else ('Partial month' if m=='2026-09' else 'Captured ledger')] for i,m in enumerate(months)]),
table(['Plan','Payments','INR base collections'],planrows),
p('Plus generated INR 18,760.42 from 18 commercial payments, Pro INR 10,396.22 from 4 and Power INR 6,491.03 from 1. One customer identity may purchase more than once or across plans; payment counts are not plan-level customer counts. [S3]'),
p('Twenty-three commercial payments across 22 commercial identities indicate limited repeat-payment evidence. This is insufficient to establish renewal rate, revenue retention or lifetime value. Monthly collections must not be multiplied by 12 and presented as verified ARR.')])

section('06 / Global reach & acquisition','WEBSITE GEOGRAPHY IS NOT CUSTOMER GEOGRAPHY',[
table(['Website GA4 metric','25 August - 23 September 2026'],[['Active users','1,341'],['New users','1,337'],['Engaged sessions','447'],['Engagement rate','30.91%'],['Average engagement time','14 seconds'],['Events / key events','6,074 / 0'],['GA4 reported revenue','INR 0.00']]),
table(['Top observed website country','Active users'],[[k,str(v)] for k,v in d['websiteAnalytics']['topCountries'].items()]),
p('Source: GA4 Cluegent Website, property 542401409, Demographic details report. This is a 30-complete-calendar-day window, different from the rolling financial window. Property timezone was not verified. Country rows can be non-additive and include unknowns; the displayed 86 rows are not evidence of 86 customer countries. [S4]'),
p('Paying-customer country counts: '+na+'. Firebase profiles provide no country coverage. No usable card-country value was returned, and the two invoices scanned supplied no billing country for commercial payments. Currency is not evidence of residency. Signup countries are also unavailable. [S1-S3]'),
p('Daily/monthly traffic series, confirmed top acquisition channels, keyword attribution and organic-growth trend: '+na+'. No channel values from mixed-date dashboard cards are used. Website GA4 zero revenue must not override the payment ledger. Website users are not app users.')])

usage_rows=[[m,str(u['months'][m]['usersWithAnyUsage']),str(u['months'][m]['prompts']),str(u['months'][m]['screenshots']),f"{u['months'][m]['sttSeconds']/3600:.2f}"] for m in months]
section('07 / Product usage & retention','SERVER COUNTERS; NOT INTERVIEW COUNTS',[
table(['Recorded usage','All available valid monthly periods'],[['Prompts',f"{u['totals']['prompts']:,}"],['Screenshot analyses',f"{u['totals']['screenshots']:,}"],['Transcription seconds / hours',f"{u['totals']['sttSeconds']:,} / {u['totals']['sttSeconds']/3600:.2f}"],['Distinct identities with nonzero usage',str(u['distinctUsersWithAnyRecordedUsage'])],['Usage identities without current Auth',str(u['usageUsersWithoutCurrentAuth'])]]),
table(['Month','Used IDs','Prompts','Screenshots','STT hours'],usage_rows),
p(f"Across {u['distinctUsersWithAnyRecordedUsage']} recorded usage identities, the arithmetic averages are {u['totals']['prompts']/u['distinctUsersWithAnyRecordedUsage']:.2f} prompts, {u['totals']['screenshots']/u['distinctUsersWithAnyRecordedUsage']:.2f} screenshot analyses and {u['totals']['sttSeconds']/60/u['distinctUsersWithAnyRecordedUsage']:.2f} transcription minutes per identity. These are lifetime recorded-counter averages, not per-session or per-paying-user metrics. [S2]"),
table(['Monthly return proxy','Returned / prior used IDs','Rate'],[[x['from']+' to '+x['to'],f"{x['returnedUsers']} / {x['previousActiveUsers']}",pc(x['returnRate'])] for x in u['monthToMonthReturn']]),
p('Return proxy = identity with nonzero monthly counters in both periods / identity with nonzero counters in the earlier period. It is not D7/D30 signup-cohort retention. September is incomplete. Monthly records include legacy/test/orphaned usage; one zero-valued invalid-period document is excluded. April usage identities exceed retained April signups, illustrating differing historical coverage.'),
p('True sessions/interviews, duration per session and app DAU/WAU/MAU: '+na+'. Desktop analytics functions are disabled/no-op in source. Firebase last-sign-in timestamps cannot reconstruct daily activity. [S2, S5]')])

section('08 / Business & technology diligence','ASSET QUALITY, TRANSFERABILITY AND RISKS',[
table(['Area','Evidence / diligence implication'],[
['Monetization','Free, Plus, Pro and Power entitlements exist; live collections verified. Recurrence and bank settlement are unverified.'],
['Cloud enforcement','Server-side identity, entitlement and usage logic exist. Rules, roles, abuse prevention and race conditions need a separate security audit.'],
['Desktop/native operations','Cross-platform Rust/audio integrations and Electron packaging increase maintenance scope. Fresh release, updater and capture compatibility tests remain required.'],
['Service dependence','Firebase, Razorpay and external AI/STT providers are operating dependencies. Ownership, transferability, costs, limits and contracts need confirmation.'],
['Local retrieval','SQLite/vector code paths exist. Packaging/dependency consistency and migration/backup behavior were not runtime-tested.'],
['Documentation drift','README plan limits differ from current server plan configuration; marketing, backend and support documentation need reconciliation.'],
['Privacy & measurement','Desktop analytics is disabled; useful for data minimization, but weakens funnel and retention measurement. Website GA4 is separately enabled.']]),
h('Ownership and license review is material'),
p('README identifies the repository as based on the Natively upstream project and distributed under AGPL-3.0. Do not represent the entire codebase as exclusively proprietary. A buyer should review upstream provenance, license compliance, contributor assignments and all third-party assets with counsel. This report records the codebase evidence; it is not a legal opinion. [S5]'),
p('No secrets or individual customer records are part of the deliverables. Production access was read-only. Existing unrelated source/website edits were preserved. This is targeted technical diligence of major subsystems, not line-by-line certification of every file.')])

section('09 / Growth roadmap','PROPOSED TARGETS ONLY - NOT ACTUALS OR FORECAST REVENUE',[
table(['Horizon','Proposed work','Evidence needed before advancing'],[
['Next 2 months','Reconcile payment-to-entitlement states; separate live tests; instrument consent-aware funnel and purchase events; collect billing country only where appropriate; document licensing and releases.','A repeatable aggregate dashboard; source reconciliation; defined activation and retention cohorts; verified purchase tracking.'],
['Next 6 months','Run bounded SEO/onboarding experiments; segment Free-to-paid and repeat purchases; improve first-session reliability; measure service costs and support effort.','Cohort retention and repeat-payment evidence; channel-level conversion with costs; measured gross contribution and support load.'],
['Next 12 months','Scale only validated acquisition channels; improve cross-platform release operations; develop a consent-forward product positioning; prepare a transfer-ready buyer data room.','Repeatable acquisition economics; costed renewal behavior; ownership and vendor documentation; tested release and recovery processes.']]),
h('Decision gates, not speculative promises'),
p('Do not scale ad spend based solely on traffic or signup growth. First connect acquisition source, activation, payment and repeat usage using privacy-respecting identifiers and explicit definitions. Do not treat this report as authorization to add tracking, change production data or increase advertising budgets.'),
p('No numeric revenue, user or valuation forecast is supplied because validated conversion cohorts, churn, cost structure and channel economics are missing. Numeric targets should be set only after those baselines and the operating budget are agreed. The 2/6/12-month horizons are planning horizons requested by the founder, not historical measurements.'),
h('Buyer-readiness next steps'),
p('Resolve entitlement and orphan-profile discrepancies; reconcile Razorpay with settlements and accounting; establish customer-country coverage without exporting PII; verify license obligations and transfer rights; then update this evidence pack on a consistent cadence.')])

section('10 / Sources & discrepancies','EVIDENCE REGISTER AND EXPLICIT LIMITATIONS',[
table(['ID','Source and coverage'],[
['S1','Firebase Authentication, project cluegent-2514d, accounts:batchGet; paginated existing-account listing, complete.'],
['S2','Firestore named database cluegent: users, subscriptions, usage_monthly and billing_razorpay_live_orders; read-only projected queries.'],
['S3','Razorpay live API payments/refunds/invoices; 100-record pagination until terminal page. Credentials stayed in memory.'],
['S4','Authenticated GA4 UI, Cluegent Website property 542401409; Demographic details, 25 Aug-23 Sep 2026.'],
['S5','Local code: package.json; native-module/Cargo.toml; functions/src/config/plans.ts; functions/src/utils/usage.ts; Firebase/billing services; src/lib/analytics/analytics.service.ts; website; README.md and LICENSE.']]),
table(['Discrepancy','Treatment in this report'],[
['248 Auth accounts vs 268 profiles','Use Auth for retained signup count; disclose 20 profiles without current Auth.'],
['229 Free vs 235 effective Free','Report stored Free separately from six expired paid entitlements.'],
['22 commercial payers vs 11 active paid','Historical payment is not current entitlement; one payer lacks current Auth match.'],
['28 captures vs 26 paid Firestore matches','Two unmatched captures are live-test payments; do not substitute order count for processor revenue.'],
['GA4 revenue zero vs live collections','Use Razorpay for collections; purchase-event reconciliation is incomplete.'],
['Customer countries absent','Mark unavailable; do not substitute website geography or payment currency.'],
['App activity instrumentation absent','Use clearly labeled monthly counter proxies; no invented DAU or interview totals.'],
['Snapshot windows differ','Financial rolling window ends 24 Sep; GA complete-day window ends 23 Sep.']]),
p('Additional unavailable diligence items: actual launch date, deleted-account history, full organic/keyword history, bank settlements, processor-cost reconciliation, cloud/model costs, CAC, LTV, churn, MRR, ARR, profit, customer residence and a defensible valuation. All are Data unavailable or requires access.')])

section('11 / Methods & verification','REPRODUCIBILITY WITHOUT CUSTOMER DATA EXPORTS',[
h('Counting and reconciliation'),
p('Auth records are grouped by creation timestamp in UTC. Weekly groups start Monday UTC. Account classifications are evaluated at the snapshot using the current subscription document and expiration timestamp. Commercial payment totals exclude plan ID livetest; captured/refunded status checks include only captured collections. Amounts are stored as integer currency subunits in the JSON.'),
p('Payment identity matching first uses the Firestore order UID and payment-note Firebase UID, then identity/customer fallbacks in memory. All exports are aggregate only. Sources were read sequentially rather than in a cross-service transaction; live activity during collection can produce small timing differences.'),
table(['Validation','Result'],[[k,'PASS' if v else 'FAIL'] for k,v in d['validation'].items()]),
h('Files included'),
p('CLUEGENT_DUE_DILIGENCE_DATA.md contains the raw aggregate ledger, source register, definitions and discrepancies. CLUEGENT_GROWTH_REPORT.md is the buyer-facing narrative. CLUEGENT_METRICS.json contains numerical series for charts. CLUEGENT_GROWTH_REPORT.html is the designed browser version. This PDF is the print-ready version.'),
h('Interpretation of the evidence'),
p('The retained signup base and captured commercial collections are real, source-backed traction. What remains unproven is whether acquisition is economical, customers renew sustainably and the asset can be transferred with clear rights and dependable operations. Those should be the next diligence priorities, not unsupported growth projections.'),
p('Report finalized at the founder\'s request to continue and provide the full PDF. Data availability limitations remain visible rather than being replaced by estimates. No production data was modified.')])

# Shared content model keeps Markdown, HTML and PDF consistent.
def markdown_blocks(blocks):
    out=[]
    for b in blocks:
        if b[0]=='p': out.append(b[1])
        elif b[0]=='h': out.append('### '+b[1])
        elif b[0]=='table':
            out += ['| '+' | '.join(map(str,b[1]))+' |','| '+' | '.join(['---']*len(b[1]))+' |']
            out += ['| '+' | '.join(str(v).replace('|','/') for v in row)+' |' for row in b[2]]
        elif b[0]=='chart': out.append('Chart: '+b[1]+' ('+b[4]+'). '+', '.join(f'{k}: {v:,.2f}' for k,v in zip(b[2],b[3])))
        out.append('')
    return '\n'.join(out)
md='\n\n'.join('# '+s['title']+'\n\n'+s['subtitle']+'\n\n'+markdown_blocks(s['blocks']) for s in sections)
(OUT/'CLUEGENT_GROWTH_REPORT.md').write_text(md)
raw='# Cluegent due diligence - aggregate evidence ledger\n\nSnapshot: '+d['asOf']+'\n\n'+markdown_blocks(sections[10]['blocks'])+'\n\n## Definitions and methods\n\n'+markdown_blocks(sections[11]['blocks'])+'\n\n## Raw aggregate numbers\n\nAll returned numbers, date bins, source coverage and validation flags follow. No individual records or credentials are exported.\n\n```json\n'+json.dumps(d,indent=2,ensure_ascii=False)+'\n```\n'
(OUT/'CLUEGENT_DUE_DILIGENCE_DATA.md').write_text(raw)

fontdir=Path('/Users/prithivi/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype')
for name,file in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Editorial','DejaVuSerif.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(fontdir/file)))
ink=colors.HexColor('#19352E'); muted=colors.HexColor('#56675F'); sage=colors.HexColor('#DFE9DF'); paper=colors.HexColor('#FDFBF7')
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=9,leading=13,textColor=ink,spaceAfter=9),
 'h':ParagraphStyle('h',fontName='Bold',fontSize=11,leading=15,textColor=ink,spaceBefore=9,spaceAfter=8),
 'title':ParagraphStyle('title',fontName='Editorial',fontSize=28,leading=34,textColor=ink,spaceAfter=12),
 'eyebrow':ParagraphStyle('eyebrow',fontName='Bold',fontSize=7.4,leading=11,textColor=muted,spaceAfter=18),
 'cell':ParagraphStyle('cell',fontName='Body',fontSize=8,leading=11,textColor=ink),
 'th':ParagraphStyle('th',fontName='Bold',fontSize=8,leading=11,textColor=ink)}
W=487
def para(s,style='body'): return Paragraph(html.escape(str(s)),styles[style])
def pdf_chart(b):
    _,title,labels,vals,unit=b
    height=160; draw=Drawing(W,height)
    draw.add(String(0,147,title+' / '+unit,fontName='Bold',fontSize=9,fillColor=ink))
    ceiling=max(vals) or 1; step=W/len(vals)
    draw.add(Line(0,23,W,23,strokeColor=sage))
    for i,(lab,v) in enumerate(zip(labels,vals)):
        x=i*step+14; bh=90*v/ceiling
        draw.add(Rect(x,24,step-28,bh,fillColor=muted if i==len(vals)-1 else ink,strokeColor=None))
        label=f'{v:,.2f}' if unit=='INR' else str(v)
        draw.add(String(x+(step-28)/2,30+bh,label,textAnchor='middle',fontName='Body',fontSize=7,fillColor=ink))
        draw.add(String(x+(step-28)/2,9,lab,textAnchor='middle',fontName='Body',fontSize=8,fillColor=ink))
    return draw
flow=[]
for si,s in enumerate(sections):
    if si: flow.append(PageBreak())
    flow.extend([para(s['subtitle'],'eyebrow'),para(s['title'],'title')])
    for b in s['blocks']:
        if b[0] in ('p','h'):flow.append(para(b[1], 'body' if b[0]=='p' else 'h'))
        elif b[0]=='chart': flow.extend([pdf_chart(b),Spacer(1,10)])
        elif b[0]=='table':
            n=len(b[1]); weights=([0.39,0.61] if n==2 else ([0.44,0.28,0.28] if n==3 else [1/n]*n))
            cells=[[para(v,'th') for v in b[1]]]+[[para(v,'cell') for v in row] for row in b[2]]
            t=Table(cells,colWidths=[W*v for v in weights],repeatRows=1,hAlign='LEFT')
            t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),sage),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F1F4ED'),paper]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
            flow.extend([t,Spacer(1,12)])
def page(c,doc):
    c.saveState();pw,ph=doc.pagesize;c.setFillColor(paper);c.rect(0,0,pw,ph,stroke=0,fill=1)
    c.setStrokeColor(sage);c.line(54,ph-38,pw-54,ph-38);c.setFillColor(muted);c.setFont('Body',7)
    c.drawString(54,ph-29,'CLUEGENT  /  CONFIDENTIAL AGGREGATE REVIEW')
    c.drawString(54,29,'24 SEPTEMBER 2026  |  VERIFIED ACTUALS + LABELED TARGETS')
    c.drawRightString(pw-54,29,str(doc.page));c.restoreState()
doc=SimpleDocTemplate(str(OUT/'CLUEGENT_GROWTH_REPORT.pdf'),pagesize=(595.28,841.89),rightMargin=54,leftMargin=54,topMargin=58,bottomMargin=48,title='Cluegent - Traction & Acquisition Due Diligence',author='Cluegent / Aggregate Due Diligence')
doc.build(flow,onFirstPage=page,onLaterPages=page)

def html_chart(b):
    _,title,labels,vals,unit=b; ceiling=max(vals) or 1
    bars=''.join(f'<g><rect x="{20+i*80}" y="{150-v/ceiling*110}" width="46" height="{v/ceiling*110}" rx="3" fill="#19352e"/><text x="{43+i*80}" y="{140-v/ceiling*110}" text-anchor="middle">{v:,.2f}</text><text x="{43+i*80}" y="175" text-anchor="middle">{html.escape(lab)}</text></g>' for i,(lab,v) in enumerate(zip(labels,vals)))
    return f'<figure><figcaption>{title} / {unit}</figcaption><svg viewBox="0 0 500 190" role="img" aria-label="{title}">{bars}</svg></figure>'
def block_html(b):
    if b[0]=='p':return '<p>'+html.escape(b[1])+'</p>'
    if b[0]=='h':return '<h3>'+html.escape(b[1])+'</h3>'
    if b[0]=='chart':return html_chart(b)
    return '<div class="table-wrap"><table><thead><tr>'+''.join('<th>'+html.escape(str(x))+'</th>' for x in b[1])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in row)+'</tr>' for row in b[2])+'</tbody></table></div>'
css='''*{box-sizing:border-box}body{margin:0;background:#fdfbf7;color:#19352e;font-family:"Avenir Next",DejaVu Sans,sans-serif;line-height:1.65}.mast{max-width:1200px;margin:40px auto;padding:0 40px;font-size:11px;letter-spacing:.2em}.report{max-width:1200px;margin:auto;padding:0 40px}section{display:grid;grid-template-columns:1fr 1.8fr;gap:64px;padding:96px 0}.intro h1{font-family:Georgia,serif;font-weight:400;font-size:clamp(32px,4vw,58px);line-height:1.1;letter-spacing:-.04em}.eyebrow{font-size:10px;letter-spacing:.18em;color:#56675f}.shell{padding:7px;background:#e7ece3;border-radius:30px;box-shadow:inset 0 1px 0 #fff}.core{padding:32px;background:#fffefa;border-radius:23px;box-shadow:inset 0 1px 0 #fff}p{font-size:14px;margin:0 0 20px}h3{font-size:18px;margin-top:32px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{text-align:left;vertical-align:top;padding:12px}th{background:#dfe9df}tbody tr:nth-child(odd){background:#f1f4ed}.table-wrap{overflow:auto;margin:20px 0}figure{margin:25px 0}figcaption{font-size:12px;font-weight:600}svg{width:100%;font-size:10px;font-family:"Avenir Next",sans-serif}.reveal{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.32,.72,0,1),transform .8s cubic-bezier(.32,.72,0,1)}.reveal.shown{opacity:1;transform:translateY(0)}@media(max-width:768px){.report,.mast{padding:0 16px}section{display:block;padding:32px 0}.core{padding:20px}.intro{margin-bottom:28px}}@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}@media print{.mast{margin:0}section{display:block;break-before:page;padding:10mm 0}.report{padding:0}.core{padding:0;background:white}.shell{padding:0;background:white}.reveal{opacity:1;transform:none}h1{font-size:28px!important}table{break-inside:avoid}body{background:white}}'''
body=''.join('<section class="reveal"><div class="intro"><div class="eyebrow">'+html.escape(s['subtitle'])+'</div><h1>'+html.escape(s['title'])+'</h1></div><div class="shell"><div class="core">'+''.join(block_html(b) for b in s['blocks'])+'</div></div></section>' for s in sections)
js="document.querySelectorAll('.reveal').forEach(e=>new IntersectionObserver((a,o)=>{if(a[0].isIntersecting){e.classList.add('shown');o.disconnect()}},{threshold:.02}).observe(e))"
(OUT/'CLUEGENT_GROWTH_REPORT.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cluegent | Traction & Due Diligence</title><style>'+css+'</style><noscript><style>.reveal{opacity:1;transform:none}</style></noscript></head><body><div class="mast">CLUEGENT / CONFIDENTIAL / 24 SEPTEMBER 2026</div><main class="report">'+body+'</main><script>'+js+'</script></body></html>')
print(json.dumps({'outputs':[p.name for p in OUT.glob('CLUEGENT_*')],'sections':len(sections),'snapshot':d['asOf']}))
