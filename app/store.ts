'use client';
import {useSyncExternalStore} from 'react';
import {nextLayout,type Layout} from './model';
const initial:Layout={beds:[],selected:null};let state=initial;const listeners=new Set<()=>void>();
let past:Layout[]=[],future:Layout[]=[];let interaction:Layout|null=null;
const emit=()=>listeners.forEach(fn=>fn());
export const getLayout=()=>state;
export function beginInteraction(){interaction=state;}
export function endInteraction(){if(interaction&&JSON.stringify(interaction.beds)!==JSON.stringify(state.beds)){past=[...past,interaction].slice(-100);future=[];}interaction=null;emit();}
export function dispatch(action:Parameters<typeof nextLayout>[1]){const next=nextLayout(state,action);if(action.type!=='select'&&JSON.stringify(next.beds)!==JSON.stringify(state.beds)&&!interaction){past=[...past,state].slice(-100);future=[];}state=next;emit();return state;}
export function undo(){if(!past.length)return;future=[state,...future];state=past[past.length-1];past=past.slice(0,-1);interaction=null;emit();}
export function redo(){if(!future.length)return;past=[...past,state];state=future[0];future=future.slice(1);interaction=null;emit();}
export const historyStatus=()=>`${past.length}:${future.length}`;
export const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}};
export function useLayout(){return useSyncExternalStore(subscribe,getLayout,()=>initial)}
export function useHistory(){const status=useSyncExternalStore(subscribe,historyStatus,()=> '0:0');const [back,forward]=status.split(':').map(Number);return {canUndo:back>0,canRedo:forward>0};}
