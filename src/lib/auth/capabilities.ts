import { useEffect, useState } from "react";
import { authEnabled } from "./client";

export function useAuthCapabilities() {
  const [state,setState]=useState({ emailPassword:false, pending:authEnabled, unavailable:false });
  useEffect(()=>{
    if (!authEnabled) return;
    const abort=new AbortController();
    const timeout=setTimeout(()=>abort.abort(),5000);
    fetch("/api/auth/capabilities",{signal:abort.signal,cache:"no-store"})
      .then(async r=>{if(!r.ok)throw new Error("Account service unavailable");return r.json();})
      .then(data=>setState({emailPassword:data.emailPassword === true,pending:false,unavailable:false}))
      .catch(()=>setState({emailPassword:false,pending:false,unavailable:true}))
      .finally(()=>clearTimeout(timeout));
    return ()=>{clearTimeout(timeout);abort.abort();};
  },[]);
  return state;
}
