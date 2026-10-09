import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import RollingTranscript from '../src/components/ui/RollingTranscript';
function Lab(){const [rows,setRows]=useState<Record<string,string>>({});const pending=useRef<Record<string,React.MutableRefObject<any[]>>>({});useEffect(()=>{(window.electronAPI as any).onLabTurn((x:any)=>{const id=x.timing.streamId;pending.current[id]??={current:[]};pending.current[id].current.push({...x.timing,uiReceivedAtMs:Date.now(),uiReceivedMono:performance.now()});setRows(prev=>({...prev,[id]:x.text}));});},[]);return <>{Object.keys(rows).slice(-3).map(id=><RollingTranscript key={id} text={rows[id]} timingEvents={pending.current[id]} isActive/>)}</>;}
createRoot(document.getElementById('root')!).render(<Lab/>);
