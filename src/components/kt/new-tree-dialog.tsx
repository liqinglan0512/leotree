import { useState } from "react";
import { Modal } from "./modal";
import { TEMPLATES } from "@/lib/knowledge-tree/templates";

export function NewTreeDialog({templateId,onClose,onEnter}:{templateId?:string;onClose:()=>void;onEnter:(title:string,description:string)=>void}) {
  const [title,setTitle]=useState(""); const [description,setDescription]=useState("");
  const template=TEMPLATES.find(t=>t.id===templateId);
  return <Modal title="新建知识树" onClose={onClose}><form className="form new-tree-form" onSubmit={e=>{e.preventDefault();onEnter(title,description);}}>
    <p className="brief">{template ? `从「${template.title}」开始。` : "给这棵树留一个位置。"}名字和简介以后都可以修改。</p>
    <label>树的名字<input autoFocus value={title} placeholder="未命名" onChange={e=>setTitle(e.target.value)}/></label>
    <label>树的简介（可不填）<textarea value={description} placeholder="这棵树想记录什么？" onChange={e=>setDescription(e.target.value)}/></label>
    <div className="hero-actions"><button type="button" className="btn" onClick={onClose}>退出</button><button type="submit" className="btn primary">进入知识树</button></div>
  </form></Modal>;
}
export function TemplateDialog({onClose,onPick}:{onClose:()=>void;onPick:(id:string)=>void}) {
  return <Modal title="从模板开始" onClose={onClose}><ul className="tpl-list">{TEMPLATES.filter(t=>t.id!=="blank").map(t=><li key={t.id}><button className="tpl-pick" onClick={()=>onPick(t.id)}><strong>{t.title}</strong><small>{t.description}</small></button></li>)}</ul><button className="btn" onClick={onClose}>取消</button></Modal>;
}
