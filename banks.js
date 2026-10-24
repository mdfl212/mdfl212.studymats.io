(() => {
'use strict';
const $=id=>document.getElementById(id);
const STORE='studymats-user-banks-v1';
const params=new URLSearchParams(location.search);
const subjectId=params.get('subject')||'Anatomy';
let subjects=[],subject=null,selected=new Set(),catalog=[];
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readSaved=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(x)?x:[]}catch{return []}};
const writeSaved=x=>localStorage.setItem(STORE,JSON.stringify(x));
const legacyBySubject={
 Anatomy:[{name:'Anatomy Master Bank · 525 items',path:'subjects/yl1/anatomy/Anatomy.html',count:525}],
 Biochemistry:[{name:"Harper's Biochemistry · 200-item practice exam",path:'subjects/yl1/biochemistry/harper.html',count:200}],
 Histology:[{name:'Histology · 200-item quiz',path:'subjects/yl1/histology/Histo.html',count:200}],
 Physiology:[{name:'Physiology PLE Reviewer · 300 items',path:'subjects/yl1/physiology/Physio.html',count:300}]
};
function questionsFor(bank){return Array.isArray(bank.questions)?bank.questions.filter(q=>{const n=String(q.subject||'').toLowerCase();return (bank.subjectIds||[]).includes(subject.id)||n===subject.id.toLowerCase()||n===subject.name.toLowerCase()}):[]}
function render(){
 const saved=readSaved();
 catalog=[{id:'base:'+subject.id,name:subject.name+' · Current StudyMats bank',type:'base',count:0,description:'Existing JSON bank · '+subject.data},...saved.filter(b=>questionsFor(b).length).map(b=>({id:b.id,name:b.name,type:'imported',count:questionsFor(b).length,description:(b.scope==='shared'?'Shared bank':'Imported bank')+' · saved on this device'}))];
 const list=$('bankList');
 list.innerHTML=catalog.map((b,i)=>'<label class="bank-row"><input type="checkbox" data-bank="'+esc(b.id)+'" '+(selected.has(b.id)?'checked':'')+'><span class="bank-row-main"><span class="bank-row-title">'+esc(b.name)+'</span><span class="bank-row-meta">'+esc(b.description||'')+'</span></span><span class="bank-pill">'+(b.type==='base'?'Built-in':b.count+' Q')+'</span></label>').join('');
 list.querySelectorAll('[data-bank]').forEach(el=>el.addEventListener('change',()=>{if(el.checked)selected.add(el.dataset.bank);else selected.delete(el.dataset.bank);updateSummary()}));
 const legacy=legacyBySubject[subject.id]||[];
 $('legacyList').innerHTML=legacy.length?legacy.map(b=>'<div class="bank-row"><div class="bank-row-main"><div class="bank-row-title">'+esc(b.name)+'</div><div class="bank-row-meta">Original standalone HTML · '+b.count+' questions</div></div><a class="bank-legacy-link" href="'+esc(b.path)+'">Open reviewer ↗</a></div>').join(''):'<div class="bank-empty">No legacy HTML reviewer is registered for this subject yet. Existing files are left untouched.</div>';
 updateSummary();
}
function updateSummary(){
 const saved=readSaved();let count=0,parts=[];
 for(const id of selected){if(id==='base:'+subject.id){parts.push('Current bank');}else{const b=saved.find(x=>x.id===id);if(b){count+=questionsFor(b).length;parts.push(b.name)}}}
 if(selected.has('base:'+subject.id)){const n=catalog.find(x=>x.id==='base:'+subject.id);parts.unshift(n?.name||'Current bank');}
 $('selectionCount').textContent=(count+(selected.has('base:'+subject.id)?' + built-in bank':'')+'').replace('0 + built-in bank','Built-in bank selected');
 $('selectionDetail').textContent=selected.size?parts.join(' · '):'Choose one or more compatible banks.';
 const st=$('bankStatus');st.textContent=selected.size+' compatible bank(s) selected. Legacy HTML reviewers open separately.';st.className='bank-status';
}
function renderAssignments(){
 $('subjectAssignment').innerHTML=subjects.map(s=>'<label class="bank-subject-option"><input type="checkbox" value="'+esc(s.id)+'" data-assign '+(s.id===subject.id?'checked':'')+'> '+esc(s.name)+'</label>').join('');
 $('importScope').addEventListener('change',()=>{const shared=$('importScope').value==='shared';$('subjectAssignment').querySelectorAll('[data-assign]').forEach(el=>{el.disabled=!shared;if(!shared)el.checked=el.value===subject.id})});
 $('importScope').dispatchEvent(new Event('change'));
}
async function importBank(){
 const status=$('importStatus');status.className='bank-status';status.textContent='';
 try{
  let raw=$('jsonPaste').value.trim();
  const file=$('newBankFile').files?.[0];
  if(file)raw=await file.text();
  if(!raw)throw Error('Choose a JSON file or paste a JSON array first.');
  const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.length)throw Error('Expected a non-empty JSON array of question objects.');
  const valid=parsed.every(q=>q&&typeof q==='object'&&typeof(q.question||q.stem)==='string'&&Array.isArray(q.options)&&q.options.length>=2&&Number.isInteger(Number(q.correctAnswer))&&Number(q.correctAnswer)>=0&&Number(q.correctAnswer)<q.options.length);
  if(!valid)throw Error('Some questions are missing a stem, choices, or a valid correctAnswer index. Use the StudyMats JSON format.');
  const shared=$('importScope').value==='shared';
  const subjectIds=shared?[...$('subjectAssignment').querySelectorAll('[data-assign]:checked')].map(el=>el.value):[subject.id];
  if(!subjectIds.length)throw Error('Select at least one subject for this shared bank.');
  const map=new Map(subjects.map(s=>[s.id,s]));
  const questions=parsed.map((q,i)=>{
    const rawSubject=String(q.subject||'').toLowerCase();
    let matched=subjects.find(s=>s.id.toLowerCase()===rawSubject||s.name.toLowerCase()===rawSubject);
    if(!matched&&subjectIds.length===1)matched=map.get(subjectIds[0]);
    if(!matched&&shared)matched=map.get(subjectIds[0]);
    const normalized={...q,id:String(q.id||'IMPORTED-'+String(i+1).padStart(4,'0')),subject:matched?.id||subjectIds[0],topic:String(q.topic||'General'),question:String(q.question||q.stem),options:q.options.map(String),correctAnswer:Number(q.correctAnswer),rationale:typeof q.rationale==='string'?{text:q.rationale,images:[]}:q.rationale||{text:'',images:[]},tags:Array.isArray(q.tags)?q.tags:[]};
    return normalized;
  });
  const id='userbank-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const bank={id,name:$('newBankName').value.trim()||file?.name?.replace(/\.json$/i,'')||'Imported test bank',scope:shared?'shared':'subject',subjectIds,questions,createdAt:new Date().toISOString()};
  const saved=readSaved();saved.push(bank);writeSaved(saved);selected.add(id);
  $('newBankName').value='';$('newBankFile').value='';$('jsonPaste').value='';status.className='bank-status bank-success';status.textContent='Saved '+questions.length+' questions in this browser. Existing repository banks were not changed.';
  render();
 }catch(e){status.className='bank-status bank-error';status.textContent=e.message||'Could not import this bank.'}
}
async function init(){
 try{
  const r=await fetch('subjects.json');if(!r.ok)throw Error('Could not load subjects.json. Open StudyMats through GitHub Pages.');
  subjects=await r.json();subject=subjects.find(s=>s.id===subjectId)||subjects[0];
  $('subjectTitle').textContent=subject.name+' test banks';$('subjectDescription').textContent=subject.description||'Choose which sources to include in your quiz.';
  renderAssignments();selected.add('base:'+subject.id);render();
  $('selectAll').onclick=()=>{catalog.forEach(b=>selected.add(b.id));render()};
  $('clearAll').onclick=()=>{selected.clear();render()};
  $('importBank').onclick=importBank;
  $('startQuiz').onclick=()=>{
   const chosen=[...selected];
   if(!chosen.length){$('bankStatus').textContent='Select at least one compatible bank first.';return}
   const baseId='base:'+subject.id;
   const imported=chosen.filter(id=>id!==baseId);
   if(!imported.length){location.href='quiz.html?subject='+encodeURIComponent(subject.id);return}
   const banks=chosen.filter(id=>id!==baseId).join(',');
   const includeBase=chosen.includes(baseId);
   const query='subject='+encodeURIComponent(subject.id)+'&banks='+(includeBase?'base-'+encodeURIComponent(subject.id)+',':'')+encodeURIComponent(banks);
   location.href='quiz.html?'+query;
  };
 }catch(e){$('bankList').innerHTML='<div class="bank-empty">'+esc(e.message)+'</div>'}
}
document.addEventListener('DOMContentLoaded',init);
})();