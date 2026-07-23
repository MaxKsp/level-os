import { useEffect, useState } from "react"
import { Modal } from "../../components/ui/Modal"
import { Button } from "../../components/ui/Button"
import type { BodyMeasurement, MeasurementType, MeasurementUnit, TrainingModality, TrainingSessionLog, Workout } from "./contracts"

const field = "min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
const label = "mb-1.5 block text-xs font-semibold text-on-surface-variant"
const today = () => new Date().toLocaleDateString("sv-SE")
const measurementMeta: Record<MeasurementType, { label: string; unit: MeasurementUnit }> = {
  peso:{label:"Peso",unit:"kg"}, gordura:{label:"Gordura corporal",unit:"%"}, altura:{label:"Altura",unit:"cm"},
  cintura:{label:"Cintura",unit:"cm"}, quadril:{label:"Quadril",unit:"cm"}, braco:{label:"Braço",unit:"cm"},
  coxa:{label:"Coxa",unit:"cm"}, peito:{label:"Peito",unit:"cm"}, panturrilha:{label:"Panturrilha",unit:"cm"},
}

export function MeasurementModal({ open, onClose, onSave }: { open:boolean; onClose:()=>void; onSave:(value:Omit<BodyMeasurement,"id">)=>Promise<void> }) {
  const [type,setType]=useState<MeasurementType>("peso"), [value,setValue]=useState(""), [date,setDate]=useState(today), [error,setError]=useState("")
  useEffect(()=>{ if(open){ setValue(""); setDate(today()); setError("") } },[open])
  const submit=async()=>{ const numeric=Number(value.replace(",",".")); if(!Number.isFinite(numeric)||numeric<=0){setError("Informe um valor válido.");return}
    await onSave({type,value:numeric,unit:measurementMeta[type].unit,date,source:"manual"}); onClose() }
  return <Modal isOpen={open} onClose={onClose} title="Registrar medida" description="Acompanhe a evolução corporal ao longo do tempo." icon="monitor_weight">
    <div className="grid gap-4"><div><label className={label}>Medida</label><select className={field} value={type} onChange={(e)=>setType(e.target.value as MeasurementType)}>{Object.entries(measurementMeta).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></div>
      <div className="grid grid-cols-[1fr_5rem] gap-2"><div><label className={label}>Valor</label><input className={field} inputMode="decimal" value={value} onChange={(e)=>setValue(e.target.value)} autoFocus /></div><div><label className={label}>Unidade</label><div className={`${field} flex items-center text-muted`}>{measurementMeta[type].unit}</div></div></div>
      <div><label className={label}>Data</label><input type="date" className={field} value={date} max={today()} onChange={(e)=>setDate(e.target.value)} /></div>{error?<p role="alert" className="text-sm text-error">{error}</p>:null}
      <div className="flex justify-end gap-2"><Button variant="ghost" size="md" onClick={onClose}>Cancelar</Button><Button variant="primary" size="md" onClick={()=>void submit()}>Registrar</Button></div></div>
  </Modal>
}

export function SessionModal({ open, workouts, onClose, onSave }: { open:boolean; workouts:Workout[]; onClose:()=>void; onSave:(value:Omit<TrainingSessionLog,"id">)=>Promise<void> }) {
  const [modality,setModality]=useState<TrainingModality>("forca"), [workoutId,setWorkoutId]=useState(""), [name,setName]=useState(""), [date,setDate]=useState(today)
  const [sets,setSets]=useState("3"), [reps,setReps]=useState("10"), [load,setLoad]=useState(""), [distance,setDistance]=useState(""), [duration,setDuration]=useState("30"), [hr,setHr]=useState(""), [progression,setProgression]=useState(""), [error,setError]=useState("")
  useEffect(()=>{if(open){setDate(today());setError("");setName("");setWorkoutId("")}},[open])
  const submit=async()=>{ const exerciseName=name.trim()||({forca:"Sessão de força",cardio:"Cardio",calistenia:"Calistenia",mobilidade:"Mobilidade"}[modality]); const durationSec=Math.round(Number(duration)*60)
    const exercise={name:exerciseName,modality,sets:modality==="forca"||modality==="calistenia"?Number(sets):null,reps:modality==="forca"||modality==="calistenia"?Number(reps):null,loadKg:modality==="forca"&&load?Number(load.replace(",",".")):null,distanceKm:modality==="cardio"?Number(distance.replace(",",".")):null,durationSec:modality==="cardio"||modality==="mobilidade"?durationSec:null,avgHr:modality==="cardio"&&hr?Number(hr):null,progressionLevel:modality==="calistenia"?progression||null:null}
    if((modality==="cardio"&&(!exercise.distanceKm||!durationSec))||((modality==="forca"||modality==="calistenia")&&(!exercise.sets||!exercise.reps))){setError("Preencha as métricas obrigatórias.");return}
    await onSave({workoutId:workoutId||null,name:exerciseName,modality,date,durationSec:durationSec||null,source:"manual",exercises:[exercise]});onClose() }
  return <Modal isOpen={open} onClose={onClose} title="Log rápido de sessão" description="Registre a métrica que importa para cada modalidade." icon="fitness_center" maxWidth="max-w-xl"><div className="grid gap-4">
    <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>Modalidade</label><select className={field} value={modality} onChange={(e)=>setModality(e.target.value as TrainingModality)}><option value="forca">Força</option><option value="cardio">Cardio</option><option value="calistenia">Calistenia</option><option value="mobilidade">Mobilidade</option></select></div><div><label className={label}>Treino vinculado</label><select className={field} value={workoutId} onChange={(e)=>setWorkoutId(e.target.value)}><option value="">Sessão livre</option>{workouts.map((w)=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>Exercício / sessão</label><input className={field} value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex.: Supino reto" /></div><div><label className={label}>Data</label><input type="date" className={field} value={date} max={today()} onChange={(e)=>setDate(e.target.value)} /></div></div>
    {(modality==="forca"||modality==="calistenia")?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div><label className={label}>Séries</label><input className={field} inputMode="numeric" value={sets} onChange={(e)=>setSets(e.target.value)} /></div><div><label className={label}>Repetições</label><input className={field} inputMode="numeric" value={reps} onChange={(e)=>setReps(e.target.value)} /></div>{modality==="forca"?<div><label className={label}>Carga (kg)</label><input className={field} inputMode="decimal" value={load} onChange={(e)=>setLoad(e.target.value)} /></div>:<div><label className={label}>Progressão</label><input className={field} value={progression} onChange={(e)=>setProgression(e.target.value)} placeholder="Ex.: L-sit" /></div>}</div>:null}
    {(modality==="cardio"||modality==="mobilidade")?<div className="grid gap-3 sm:grid-cols-3">{modality==="cardio"?<div><label className={label}>Distância (km)</label><input className={field} inputMode="decimal" value={distance} onChange={(e)=>setDistance(e.target.value)} /></div>:null}<div><label className={label}>Duração (min)</label><input className={field} inputMode="numeric" value={duration} onChange={(e)=>setDuration(e.target.value)} /></div>{modality==="cardio"?<div><label className={label}>FC média</label><input className={field} inputMode="numeric" value={hr} onChange={(e)=>setHr(e.target.value)} /></div>:null}</div>:null}
    {error?<p role="alert" className="text-sm text-error">{error}</p>:null}<div className="flex justify-end gap-2"><Button variant="ghost" size="md" onClick={onClose}>Cancelar</Button><Button variant="primary" size="md" onClick={()=>void submit()}>Salvar sessão</Button></div>
  </div></Modal>
}
