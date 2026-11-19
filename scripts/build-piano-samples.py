"""Build licensed compact assets (requires Python 3 + ffmpeg, network only at build time)."""
import concurrent.futures,hashlib,json,pathlib,subprocess,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'audio/piano/warm-grand'
REV='3382bf9496bba2486f5ab0de55a264d1dfc38404'
CACHE=pathlib.Path('/tmp')/('salamander-'+REV);CACHE.mkdir(exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
def build(args):
 midi,layer=args;name=f'{names[midi%12]}{midi//12-1}v{layer}';source=CACHE/(name+'.flac')
 if not source.exists():urllib.request.urlretrieve(f'https://raw.githubusercontent.com/sfzinstruments/SalamanderGrandPiano/{REV}/Samples/'+urllib.parse.quote(name+'.flac'),source)
 seconds=6 if midi<48 else 5 if midi<72 else 3.5
 dest=OUT/f'{midi}-v{layer}.mp3'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-t',str(seconds),'-af',f'afade=t=out:st={seconds-.25}:d=0.25','-ar','44100','-ac','2','-codec:a','libmp3lame','-b:a','80k',str(dest)],check=True)
 return dict(midi=midi,layer=layer,sourceFile=name+'.flac',sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),file=dest.name,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:files=list(ex.map(build,[(m,v) for m in range(21,109,3) for v in [5,8,10]]))
(OUT/'manifest.json').write_text(json.dumps(dict(sourceRevision=REV,sampleRate=44100,license='CC-BY-3.0',files=files),indent=2)+'\n')
print('files',len(files),'bytes',sum(f['bytes'] for f in files),'source',REV)
