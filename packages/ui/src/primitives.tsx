import * as React from "react"; import { cn } from "./cn.js";
export function Card({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={cn("fd-card",className)} {...props}/>;}
export function Badge({className,...props}:React.HTMLAttributes<HTMLSpanElement>){return <span className={cn("fd-badge",className)} {...props}/>;}
export const Input=React.forwardRef<HTMLInputElement,React.InputHTMLAttributes<HTMLInputElement>>(({className,...props},ref)=><input ref={ref} className={cn("fd-input",className)} {...props}/>); Input.displayName="Input";
export const Textarea=React.forwardRef<HTMLTextAreaElement,React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({className,...props},ref)=><textarea ref={ref} className={cn("fd-input fd-textarea",className)} {...props}/>); Textarea.displayName="Textarea";
export const Select=React.forwardRef<HTMLSelectElement,React.SelectHTMLAttributes<HTMLSelectElement>>(({className,...props},ref)=><select ref={ref} className={cn("fd-input fd-select",className)} {...props}/>); Select.displayName="Select";
export function Skeleton({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={cn("fd-skeleton",className)} aria-hidden="true" {...props}/>;}
export function EmptyState({icon,title,description,action}:{icon?:React.ReactNode;title:string;description:string;action?:React.ReactNode}){return <div className="fd-empty"><div className="fd-empty__icon">{icon}</div><strong>{title}</strong><p>{description}</p>{action}</div>;}
export function Metric({label,value,hint}:{label:string;value:React.ReactNode;hint?:string}){return <div className="fd-metric"><span>{label}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}</div>;}
