from pathlib import Path
import subprocess, math, wave, struct, json
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parent
FF=imageio_ffmpeg.get_ffmpeg_exe()
W,H=1920,1080
BG=(8,13,18); WHITE=(239,244,243); MUTED=(153,170,175); GREEN=(105,242,179)
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def font(n,b=False): return ImageFont.truetype(BOLD if b else FONT,n)
def center(d,text,y,n=64,color=WHITE,b=False):
 f=font(n,b); box=d.textbbox((0,0),text,font=f); d.text(((W-(box[2]-box[0]))/2,y),text,font=f,fill=color)
def run(args):
 p=subprocess.run([FF,'-hide_banner','-loglevel','error','-y',*args],capture_output=True,text=True)
 if p.returncode: raise RuntimeError(p.stderr)
def card(name,title,sub,tag):
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 d.rounded_rectangle((850,240,1070,246),radius=3,fill=GREEN)
 center(d,tag,290,24,GREEN,True);center(d,title,370,112,WHITE,True);center(d,sub,530,38,MUTED)
 center(d,'CLUEGENT',910,23,MUTED,True)
 im.save(ROOT/name)
card('intro.png','Meet Cluegent','Live context. Clearer answers.','YOUR DESKTOP AI COPILOT')
card('outro.png','Stay in the conversation.','Get started at cluegent.com','CLUEGENT')
scenes=[(0,6,'Listen as the conversation unfolds','Live transcript context', '01'),(8,6,'Get answers grounded in context','From a spoken question to a structured response','02'),(16,8,'Make technical ideas easier to follow','Explanations and code, alongside your conversation','03'),(28,7,'Keep up as the questions change','New context. A new response.','04')]
segments=[]
enc=['-an','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-r','30']
run(['-loop','1','-i',str(ROOT/'intro.png'),'-t','3','-vf','fade=t=in:st=0:d=0.4,fade=t=out:st=2.7:d=0.3',*enc,str(ROOT/'part-0.mp4')]);segments.append('part-0.mp4')
for i,(start,duration,title,sub,num) in enumerate(scenes,1):
 im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
 d.text((280,34),'CLUEGENT / LIVE DEMO',font=font(22,True),fill=GREEN)
 d.text((280,77),title,font=font(46,True),fill=WHITE)
 d.text((280,137),sub,font=font(26),fill=MUTED)
 d.text((1570,42),num+' / 04',font=font(22),fill=MUTED)
 im.save(ROOT/f'overlay-{i}.png')
 # Crop to the real app controls and answer panel; remove the recording tooltip.
 vf='[0:v]crop=2040:1248:450:60,scale=1360:832:flags=lanczos,setsar=1,fps=30,pad=1920:1080:280:200:color=0x080d12[base];[base]zoompan=z=\'1+0.075*sin(PI*on/'+str(duration*30)+')*sin(PI*on/'+str(duration*30)+')\':x=\'iw/2-iw/zoom/2\':y=\'ih/2-ih/zoom/2\':d=1:s=1920x1080:fps=30[v];[v][1:v]overlay=0:0,fade=t=in:st=0:d=0.2,fade=t=out:st='+str(duration-.2)+':d=0.2[out]'
 run(['-ss',str(start),'-i',str(ROOT/'source.mov'),'-loop','1','-i',str(ROOT/f'overlay-{i}.png'),'-filter_complex',vf,'-map','[out]','-t',str(duration),*enc,str(ROOT/f'part-{i}.mp4')]);segments.append(f'part-{i}.mp4')
 print('Rendered scene',i,flush=True)
run(['-loop','1','-i',str(ROOT/'outro.png'),'-t','4','-vf','fade=t=in:st=0:d=0.3,fade=t=out:st=3.5:d=0.5',*enc,str(ROOT/'part-5.mp4')]);segments.append('part-5.mp4')
(ROOT/'concat.txt').write_text(''.join("file '"+s+"'\n" for s in segments))
# Original, low-volume instrumental bed. No external music or licensing dependency.
sr=44100; duration=34; chords=[(130.81,164.81,196),(110,130.81,164.81),(87.31,110,130.81),(98,123.47,146.83)]
with wave.open(str(ROOT/'music.wav'),'wb') as out:
 out.setnchannels(2);out.setsampwidth(2);out.setframerate(sr)
 data=bytearray()
 for n in range(sr*duration):
  t=n/sr; local=t%4; notes=chords[int(t//4)%4]; env=min(local/0.8,1)*min((4-local)/1.0,1); fade=min(t/2,1)*min((duration-t)/2,1)
  v=sum(math.sin(2*math.pi*f*t)+.16*math.sin(2*math.pi*f*2*t) for f in notes)/3
  beat=t%0.5; kick=t%1.0
  note=notes[int(t*2)%3]*4
  pluck=math.sin(2*math.pi*note*t)*math.exp(-beat*9)*min(beat/0.012,1)
  drum=math.sin(2*math.pi*(50*kick+3*(1-math.exp(-kick*22))))*math.exp(-kick*18)
  val=int((v*env*2100+pluck*500+drum*600)*fade);data.extend(struct.pack('<hh',val,val))
 out.writeframes(data)
run(['-f','concat','-safe','0','-i',str(ROOT/'concat.txt'),'-i',str(ROOT/'music.wav'),'-c:v','copy','-af','volume=3','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',str(ROOT/'cluegent-launch-v2.mp4')])
run(['-ss','5','-i',str(ROOT/'cluegent-launch-v2.mp4'),'-frames:v','1',str(ROOT/'poster-v2.jpg')])
(ROOT/'edit-notes.md').write_text('Cluegent launch demo — 34 seconds, 1920×1080, 30 fps.\n\nUses the supplied recording only. Chapters show live transcript context, contextual answers, technical explanations, and changing questions. Captions are burned in. Original instrumental music with gentle rhythm, plus animated zoom-ins and zoom-outs; no voiceover. App framing removes the recording tooltip. Source clip has no audio track. Website has not been changed.\n\nRe-render: PYTHONPATH=/tmp/cluegent-video-deps <bundled-python> render.py\n')
print('COMPLETE',ROOT/'cluegent-launch-v2.mp4',flush=True)
