import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const metadata: Metadata = { title: { default: "FlowDesk — Operações conectadas", template: "%s · FlowDesk" }, description: "Organize clientes, projetos e tarefas. Conecte processos e automatize o trabalho repetitivo com workflows visuais.", robots: { index: true, follow: true }, openGraph: { title: "FlowDesk", description: "Organize work. Connect processes. Automate what is repetitive.", type: "website" }, themeColor: "#0d9488" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR" suppressHydrationWarning><body className={inter.variable}><Providers><PwaRegister />{children}</Providers></body></html>; }
