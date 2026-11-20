"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RadioTower } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
// Keep the browser module independent of the server-only market adapters.
const MARKET_SYNC_INTERVAL_MS = 60_000;

/** Active page: Supabase quote notifications + visible-page polling + Binance Spot streams.
 * Automatic updates while the app is closed require configured Supabase Cron.
 */
export function PortfolioPriceSync({ quoteKeys, onCryptoQuote, onCryptoDisconnected }: {
  quoteKeys: string[]; onCryptoQuote: (symbol:string,price:number,at:string)=>void;
  onCryptoDisconnected:()=>void;
}) {
  const router=useRouter();
  const keySignature=[...new Set(quoteKeys)].sort().join("|");
  const lastRefresh=useRef(0);
  const [updated,setUpdated]=useState<Date|null>(null);
  useEffect(()=>{
    const keys=new Set(keySignature.split('|').filter(Boolean));
    const visibleRefresh=()=>{
      if(document.visibilityState!=="visible" || Date.now()-lastRefresh.current<15_000)return;
      lastRefresh.current=Date.now();
      router.refresh(); setUpdated(new Date());
    };
    const timer=window.setInterval(visibleRefresh,MARKET_SYNC_INTERVAL_MS);
    const resume=()=>{if(document.visibilityState==="visible")visibleRefresh();};
    document.addEventListener('visibilitychange',resume);
    const supabase=createClient();
    const channel=supabase.channel('finzaro-market-prices-v462').on('postgres_changes',{
      event:'*',schema:'public',table:'portfolio_market_quotes_v462'
    },payload=>{
      const quoteKey=(payload.new as {quote_key?:string})?.quote_key;
      if(quoteKey && keys.has(quoteKey))visibleRefresh();
    }).subscribe();
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',resume);void supabase.removeChannel(channel);};
  },[router,keySignature]);
  useEffect(()=>{
    const symbols=[...new Set(quoteKeys.filter(k=>k.startsWith('crypto:binance:')).map(k=>k.split(':')[2]).filter(s=>/^[A-Z0-9]{2,15}$/.test(s)))];
    if(!symbols.length)return;
    let closed=false;let socket:WebSocket|null=null;let retry:number|undefined;
    const lastPush=new Map<string,number>();
    const connect=()=>{
      if(closed || document.visibilityState!=="visible")return;
      const streams=symbols.map(s=>`${s.toLowerCase()}usdt@miniTicker`).join('/');
      socket=new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      socket.onmessage=(event:MessageEvent<string>)=>{
        try{
          const packet:unknown=JSON.parse(event.data);
          if(!packet || typeof packet!=="object" || !("data" in packet))return;
          const data=packet.data;
          if(!data || typeof data!=="object" || !("s" in data) || !("c" in data))return;
          const pair=String(data.s),price=Number(data.c),symbol=pair.endsWith('USDT')?pair.slice(0,-4):'';
          if(!symbols.includes(symbol) || !Number.isFinite(price) || price<=0 || price>1e12)return;
          const now=Date.now();if(now-(lastPush.get(symbol)??0)<1500)return;
          lastPush.set(symbol,now);
          onCryptoQuote(symbol,price,new Date(now).toISOString());
        }catch{/* malformed events are ignored, never treated as prices */}
      };
      socket.onclose=()=>{if(!closed){onCryptoDisconnected();retry=window.setTimeout(connect,5_000);}};
      socket.onerror=()=>socket?.close();
    };
    connect();
    const onVisibility=()=>{if(document.visibilityState==='visible' && (!socket || socket.readyState===WebSocket.CLOSED)){if(retry)window.clearTimeout(retry);connect();}else if(document.visibilityState!=='visible')socket?.close();};
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{closed=true;if(retry)window.clearTimeout(retry);document.removeEventListener('visibilitychange',onVisibility);socket?.close();};
    // Quote keys change when the holdings list changes; callback is stable from useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[keySignature,onCryptoQuote,onCryptoDisconnected]);
  if(!quoteKeys.length)return null;
  return <div role="status" className="flex items-center gap-1.5 px-1 text-[11px] text-[var(--muted-foreground)]">
    <RadioTower className="size-3.5 shrink-0 text-[var(--fin-income)]" aria-hidden="true"/>
    Tự cập nhật giá khi mở app · {updated?`Đã kiểm tra lúc ${updated.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}`:'Kiểm tra định kỳ 60 giây'}.
    Giá cổ phiếu/vàng có thể chậm so với nguồn công bố.
  </div>;
}
