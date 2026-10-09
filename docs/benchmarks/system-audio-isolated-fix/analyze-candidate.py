import json,re,ctypes,wave,math,statistics,hashlib
from pathlib import Path
lab=Path('/tmp/cluegent-stt-native-investigation')
class Timebase(ctypes.Structure):_fields_=[('numer',ctypes.c_uint32),('denom',ctypes.c_uint32)]
tb=Timebase();ctypes.CDLL('/usr/lib/libSystem.B.dylib').mach_timebase_info(ctypes.byref(tb));tick=tb.numer/tb.denom/1e9
text=(lab/'candidate-capture.log').read_text();groups=[];group=[]
for line in text.splitlines():
 m=re.search(r'\[CaptureClock\] seq=(\d+) frames=(\d+) channels=(\d+) bytes=(\d+) host=(\d+) sample=([\d.]+) flags=(\d+) rate=(\d+)',line)
 if m:
  row=list(map(float,m.groups()))
  if group and row[0]<=group[-1][0]:groups.append(group);group=[]
  group.append(row)
if group:groups.append(group)
def stats(v):
 v=sorted(v)
 return {'n':len(v),'p50':statistics.median(v),'p95':v[max(0,math.ceil(len(v)*.95)-1)],'max':max(v)} if v else None
results=json.loads((lab/'candidate-capture-results.json').read_text());report=[]
for r,g in zip(results['output'],groups):
 duration=(g[-1][4]-g[0][4])*tick
 sample_rate=(g[-1][5]-g[0][5])/duration
 buffer_rate=sum(x[1] for x in g[:-1])/duration
 hostgaps=[(b[4]-a[4])*tick*1000 for a,b in zip(g,g[1:])]
 samplegaps=[b[5]-a[5] for a,b in zip(g,g[1:])]
 packets=r['packets'];pgaps=[b['atMs']-a['atMs'] for a,b in zip(packets,packets[1:])]
 active=[b['atMs']-a['atMs'] for a,b in zip(packets,packets[1:]) if a['rms']>100 and b['rms']>100]
 with wave.open(r['file'],'rb') as f:
  rate=f.getframerate();raw=f.readframes(f.getnframes());arr=list(__import__('array').array('h',raw))
 # Estimate tone from strongest contiguous 150ms window, then positive zero-crossings.
 width=round(rate*.15);start=max(range(0,len(arr)-width,width),key=lambda i:sum(x*x for x in arr[i:i+width]))
 cross=[i for i in range(start+1,start+width) if arr[i-1]<=0<arr[i]]
 hz=(len(cross)-1)*rate/(cross[-1]-cross[0]) if len(cross)>1 else None
 assert all(x[2]==1 and x[3]==x[1]*4 and int(x[6])&3==3 for x in g)
 assert all(abs(x-512)<1e-6 for x in samplegaps)
 assert all(x>0 for x in hostgaps)
 assert abs(buffer_rate/rate-1)<.002
 assert all(p['bytes']==round(rate*.06)*2 for p in packets)
 assert abs(hz-750)<2
 report.append({'device':r['device'],'variant':r['variant'],'publishedRate':rate,'timestampSampleRate':sample_rate,'timestampBufferRate':buffer_rate,'channels':1,'callbackFrames':512,'callbackGapMs':stats(hostgaps),'packetBytes':round(rate*.06)*2,'packetAudioMs':60,'packetGapMs':stats(pgaps),'activePacketGapMs':stats(active),'toneHz':hz,'pcmFrames':len(arr),'pcmDeliveredMs':r['deliveredAudioMs']})
# Verify protected production files against preceding-investigation hashes.
hashes=json.loads((lab/'production-hashes.json').read_text())
print('HASH_SCHEMA',type(hashes).__name__)
(lab/'candidate-analysis.json').write_text(json.dumps({'machTimebase':{'numer':tb.numer,'denom':tb.denom},'rows':report},indent=2))
print(json.dumps(report,indent=2))
