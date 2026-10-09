import json,math,re,wave,array,statistics,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];LAB=Path('/tmp/cluegent-stt-native-investigation');OUT=ROOT/'docs/benchmarks'
def words(s):return re.sub(r'[^\w\s]',' ',re.sub(r"(?<=\w)[’'\-](?=\w)",'',s.lower())).split()
def q(vals):
 a=sorted(x for x in vals if x is not None and math.isfinite(x))
 def p(f):
  if not a:return None
  i=(len(a)-1)*f;lo=math.floor(i);hi=math.ceil(i);return a[lo]+(a[hi]-a[lo])*(i-lo)
 return {'n':len(a),'p50':p(.5),'p95':p(.95),'max':max(a) if a else None}
def edits(ref,hyp):
 a,b=words(ref) if isinstance(ref,str) else ref,words(hyp) if isinstance(hyp,str) else hyp
 dp=[[0]*(len(b)+1) for _ in range(len(a)+1)]
 for i in range(len(a)+1):dp[i][0]=i
 for j in range(len(b)+1):dp[0][j]=j
 for i in range(1,len(a)+1):
  for j in range(1,len(b)+1):dp[i][j]=min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]!=b[j-1]))
 i,j=len(a),len(b);S=D=I=inside=0
 while i or j:
  if i and j and dp[i][j]==dp[i-1][j-1]+(a[i-1]!=b[j-1]):S+=a[i-1]!=b[j-1];i-=1;j-=1
  elif i and dp[i][j]==dp[i-1][j]+1:D+=1;i-=1
  else:I+=1;inside+=i<len(a);j-=1
 return {'substitutions':S,'deletions':D,'insertions':I,'errors':S+D+I,'internalEdits':S+D+inside,'referenceWords':len(a),'wer':100*(S+D+I)/len(a) if a else None}
assert edits('one two three','one three')['deletions']==1
assert edits(['one'],['one','two'])['internalEdits']==0
assert q([1,3])['p50']==2
old=json.loads((OUT/'assemblyai-interview-expanded.json').read_text())['results'];new=json.loads((OUT/'assemblyai-interview-corrected.json').read_text())['results']
runs=[r for r in old if r['caseId'].startswith(('edacc-','human-us-noise'))]+new
assert len(runs)==36 and all(r['confirmed'] and not r['errors'] for r in runs)
assert len({(r['model'],r['caseId']) for r in runs})==36
samples=json.loads((LAB/'interview-samples.json').read_text());corrected=json.loads((LAB/'corrected-interview-samples.json').read_text());defs={s['id']:s for s in samples+corrected}
for r in runs:
 sid=r['caseId'];base='edacc-5' if sid.startswith('human-us-noise') else sid
 with wave.open(defs[base]['file'],'rb') as f:assert f.getframerate()==16000 and f.getnchannels()==1 and f.getsampwidth()==2;data=f.readframes(f.getnframes())
 pcm=array.array('h',data);active=[i for i,v in enumerate(pcm) if abs(v)>300];origin=r['sourceClockAtMs'];start=origin+500+active[0]/16;end=origin+500+active[-1]/16
 accepted=[];prev=''
 for e in r['events']:
  if e['text']!=prev:accepted.append(e)
  prev=e['text']
 partial=[e for e in accepted if not e['final']];paint=[e for e in accepted if e.get('paint')]
 first=partial[0] if partial else None;gold=words(r['reference']);correct=next((e for e in paint if words(e['text'])[:1]==gold[:1]),None)
 finals={e['turnOrder']:e['text'] for e in r['events'] if e['final']};hyp=' '.join(finals[k] for k in sorted(finals));r['scoring']=edits(r['reference'],hyp)
 latestFinal=next((e for e in reversed(r['events']) if e['final']),None)
 changes=0;previous={}
 for e in accepted:
  turn=e['turnOrder'];oldWords=previous.get(turn,[]);current=words(e['text'])
  if oldWords:changes+=edits(oldWords,current)['internalEdits']
  previous[turn]=current
 wp=[];never=[]
 for label in r.get('wordTiming') or []:
  tStart=origin+label['startMs'];tEnd=origin+label['endMs'];e=next((e for e in paint if label['word'] in words(e['text']) and e['paint']['measuredAtMs']>=tStart),None)
  if e:wp.append({'word':label['word'],'startToPaintMs':e['paint']['measuredAtMs']-tStart,'endToPaintMs':e['paint']['measuredAtMs']-tEnd})
  else:never.append(label['word'])
 r['measured']={'onsetToFirstPartialMs':first['receivedAtMs']-start if first else None,'onsetToFirstPartialPaintMs':first['paint']['measuredAtMs']-start if first and first.get('paint') else None,'onsetToFirstCorrectOpeningPaintMs':correct['paint']['measuredAtMs']-start if correct else None,'finalAfterSpeechMs':latestFinal['receivedAtMs']-end if latestFinal and latestFinal['receivedAtMs']>=end else None,'partialGapsMs':[b['receivedAtMs']-a['receivedAtMs'] for a,b in zip(partial,partial[1:]) if a['turnOrder']==b['turnOrder']],'revisedWords':changes,'wordAppearance':wp,'neverCorrectlyDisplayedWords':never,'providerToPaintMs':[e['paint']['providerToPaintMs'] for e in partial if e.get('paint')]}
models=[]
for model in ['universal-3-6-pro','universal-3-5-pro','universal-streaming-english']:
 rr=[r for r in runs if r['model']==model];metrics={k:q([r['measured'][k] for r in rr]) for k in ['onsetToFirstPartialMs','onsetToFirstPartialPaintMs','onsetToFirstCorrectOpeningPaintMs','finalAfterSpeechMs']};metrics['partialGapsMs']=q([v for r in rr for v in r['measured']['partialGapsMs']]);metrics['providerToPaintMs']=q([v for r in rr for v in r['measured']['providerToPaintMs']]);metrics['wordStartToPaintMs']=q([w['startToPaintMs'] for r in rr for w in r['measured']['wordAppearance']]);metrics['wordEndToPaintMs']=q([w['endToPaintMs'] for r in rr for w in r['measured']['wordAppearance']]);metrics['neverCorrectlyDisplayedWords']=sum(len(r['measured']['neverCorrectlyDisplayedWords']) for r in rr);metrics['revisedWords']=sum(r['measured']['revisedWords'] for r in rr)
 groups={}
 for group in ['human-clean','technical-and-hesitation','word-cued','noise-10','noise-0']:
  selected=[r for r in rr if (group=='human-clean' and r['caseId'].startswith('edacc-')) or (group=='technical-and-hesitation' and r['caseId'] in ['technical-short','technical-long','hesitation']) or (group=='word-cued' and r['caseId']=='word-cued-technical') or r['caseId']=='human-us-'+group]
  counts={k:sum(r['scoring'][k] for r in selected) for k in ['referenceWords','errors','substitutions','deletions','insertions']};counts['wer']=100*counts['errors']/counts['referenceWords'] if counts['referenceWords'] else None;counts['clips']=len(selected);groups[group]=counts
 total={k:sum(r['scoring'][k] for r in rr) for k in ['referenceWords','errors','substitutions','deletions','insertions']};total['wer']=100*total['errors']/total['referenceWords'];models.append({'model':model,'clips':len(rr),'partialAndFinalClips':sum(any(not e['final'] for e in r['events']) and any(e['final'] for e in r['events']) for r in rr),'metrics':metrics,'accuracy':total,'groups':groups})
summary={'method':'36 valid 60-ms real-time API sessions: 12 reference cases, three models; includes 6 human EdAcc clips (US/British), 3 correctly resampled synthetic interview clips, one independently timed artificial word-cued technical clip, 2 noisy human clips. Synthetic experiments with incorrect source-rate handling are excluded. Percentiles interpolate between ordered observations; not population estimates. Audio onset is amplitude-thresholded on the clean reference, not physical microphone speech onset. UI uses paint opportunities, not physical display measurements. Per-word timing only for the independently labeled word-cued clip.','models':models,'runs':runs}
(OUT/'assemblyai-investigation-valid-results.json').write_text(json.dumps(summary,indent=2))
print(json.dumps({'models':models},indent=2))
