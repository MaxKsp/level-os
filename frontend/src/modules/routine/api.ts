import type { Task } from "../../context/AppContext"

declare global { interface Window { CSRF_TOKEN?: string } }
export const hasRoutineBackend = () => typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
async function parse(response: Response) { const body=await response.json().catch(()=>null); if(!response.ok) throw new Error(body?.error??`HTTP ${response.status}`); return body }
export async function loadTasks(): Promise<Task[]> { const body=await parse(await fetch("/api/data.php?key=tasks_v6",{credentials:"same-origin",headers:{Accept:"application/json"}})); if(!body||typeof body!=="object"||!("value" in body))throw new Error("Resposta de rotina inválida.");return Array.isArray(body.value)?body.value:[] }
export async function saveTasks(tasks: Task[]): Promise<void> { await parse(await fetch("/api/data.php",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":window.CSRF_TOKEN??""},body:JSON.stringify({key:"tasks_v6",value:tasks})})) }
