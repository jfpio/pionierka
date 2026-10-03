'use client';
import {useSyncExternalStore} from 'react';
import {nextLayout,type Layout} from './model';
const initial:Layout={beds:[],selected:null};let state=initial;const listeners=new Set<()=>void>();
export const getLayout=()=>state;
export function dispatch(action:Parameters<typeof nextLayout>[1]){state=nextLayout(state,action);listeners.forEach(fn=>fn());return state;}
export const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}};
export function useLayout(){return useSyncExternalStore(subscribe,getLayout,()=>initial)}
