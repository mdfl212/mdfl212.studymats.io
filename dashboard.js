(() => {
'use strict';
const PREFIX='studymats-progress-v1:', ACTIVITY='studymats-activity-v1', PROFILE='studymats-profile-v1';
const $=id=>document.getElementById(id);
const parse=(v,f)=>{try{return JSON.parse(v)||f}catch{return f}};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dateLabel=k=>new Date(k+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const profile=()=>{try{return parse(localStorage.getItem(PROFILE),null)}catch{return null}};
const activity=()=>{try{return parse(localStorage.getItem(ACTIVITY),{})}catch{return {}}};
const records=()=>{try{return Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)).map(key=>({key,id:decodeURIComponent(key.slice(PREFIX.length)),data:parse(localStorage.getItem(key),{})}))}catch{return []}};
const DASHBOARD_SCRIPT_URL=document.currentScript&&document.currentScript.src?document.currentScript.src:window.location.href;
const dashboardAssetUrl=path=>new URL(path,DASHBOARD_SCRIPT_URL).href;
let subjects=[], dataBySubject=new Map(), failedSubjects=new Map(), range=180, selectedYear='YL1';
function saveProfile(p){try{localStorage.setItem(PROFILE,JSON.stringify({...p,updatedAt:new Date().toISOString()}));return true}catch{$('dashDataMessage').textContent='Browser storage is unavailable; profile preferences could not be saved.';$('dashDataMessage').classList.add('is-error');return false}}
function openProfile(){const p=profile()||{};$('profileName').value=p.name||'';$('profileShowName').checked=p.showName!==false;$('profileModal').hidden=false;$('profileModal').classList.add('is-open');$('profileName').focus()}
function closeProfile(){ $('profileModal').hidden=true;$('profileModal').classList.remove('is-open');render() }
function ring(pct,color,label){const r=2*Math.PI*42,v=r*Math.max(0,Math.min(100,Number(pct)||0))/100;return '<svg class="dash-donut" viewBox="0 0 108 108" role="img" aria-label="'+esc(label)+': '+Math.round(pct)+' percent"><circle class="dash-donut-track" cx="54" cy="54" r="42"></circle><circle class="dash-donut-value" cx="54" cy="54" r="42" stroke="'+color+'" stroke-dasharray="'+v+' '+(r-v)+'" transform="rotate(-90 54 54)"></circle><text x="54" y="58" class="dash-donut-number">'+Math.round(pct)+'%</text></svg>'}
function buildHeatmap(){
 const a=activity(), today=new Date();today.setHours(12,0,0,0);const start=new Date(today);start.setDate(start.getDate()-range+1);
 const days=[];for(let i=0;i<range;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=dateKey(d);days.push({key:k,date:d,count:Array.isArray(a[k])?a[k].length:0})}
 const vals=days.map(x=>x.count).filter(x=>x>0).sort((x,y)=>x-y),q=n=>vals.length?vals[Math.floor((vals.length-1)*n)]:1;
 const level=n=>!n?0:n<=q(.35)?1:n<=q(.7)?2:n<=q(1)?3:4;
 const active=days.filter(x=>x.count>0).length,total=new Set(Object.values(a).flatMap(items=>Array.isArray(items)?items:[])).size;
 let streak=0,cursor=new Date(today);if(!(a[dateKey(cursor)]||[]).length)cursor.setDate(cursor.getDate()-1);while((a[dateKey(cursor)]||[]).length){streak++;cursor.setDate(cursor.getDate()-1)}
 let longest=0,run=0;days.forEach(x=>{run=x.count?run+1:0;longest=Math.max(longest,run)});
 const gridStart=new Date(days[0].date);gridStart.setDate(gridStart.getDate()-((gridStart.getDay()+6)%7));const weeks=[];
 for(let d=new Date(gridStart);d<=today;d.setDate(d.getDate()+1)){const k=dateKey(d),found=days.find(x=>x.key===k),day={key:k,date:new Date(d),count:found?found.count:0};if(!weeks.length||((d.getDay()+6)%7)===0)weeks.push([]);weeks[weeks.length-1].push({...day,level:level(day.count)})}
 const labels=weeks.map((w,i)=>{const first=w.find(x=>x.date.getDate()<=7);return '<span>'+((first&&(i===0||w.some(x=>x.date.getDate()===1)))?esc(first.date.toLocaleDateString(undefined,{month:'short'})):'')+'</span>'}).join('');
 const rows=Array.from({length:7},(_,r)=>'<div class="dash-heat-row">'+weeks.map(w=>{const x=w[r];return x?'<span class="dash-heat-cell level-'+x.level+'" tabindex="0" title="'+esc(dateLabel(x.key))+': '+x.count+' studied" aria-label="'+esc(dateLabel(x.key))+': '+x.count+' studied"></span>':'<span class="dash-heat-cell empty"></span>'}).join('')+'</div>').join('');
 return {html:'<div class="dash-month-labels">'+labels+'</div><div class="dash-heatmap-scroll"><div class="dash-heatmap">'+rows+'</div></div>',active,streak,longest,total};
}
async function load(){
 const sourceUrl=dashboardAssetUrl('subjects.json');
 try{
  const r=await fetch(sourceUrl,{cache:'no-cache'});
  if(!r.ok)throw Error('subjects.json returned HTTP '+r.status);
  const parsed=await r.json();
  if(!Array.isArray(parsed))throw Error('subjects.json is not a subject list');
  subjects=parsed;
 }catch(error){
  console.error('StudyMats subject index failed to load:',error);
  subjects=[];
  dataBySubject=new Map();
  failedSubjects=new Map();
  render();
  const message=$('dashDataMessage');if(message){message.textContent='Dashboard is visible, but the subject index could not be loaded. Check that subjects.json is deployed beside dashboard.js.';message.classList.add('is-error')}
  return;
 }
 const loaded=await Promise.all(subjects.map(async s=>{
  try{
   const r=await fetch(dashboardAssetUrl(s.data),{cache:'no-cache'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const json=await r.json();
   if(!Array.isArray(json))throw Error('Question bank is not a JSON array');
   return {id:s.id,questions:json,error:null};
  }catch(error){
   console.warn('StudyMats subject data failed:',s.id,error);
   return {id:s.id,questions:null,error:error.message||'Could not load question bank'};
  }
 }));
 dataBySubject=new Map(loaded.filter(x=>!x.error).map(x=>[x.id,x.questions]));
 failedSubjects=new Map(loaded.filter(x=>x.error).map(x=>[x.id,x.error]));
 render();
}
function render(){
 if(!$('studyDashboard'))return;
 const p=profile();$('dashGreeting').textContent='Your study space'+(p&&p.showName!==false&&p.name?', '+p.name:'');$('dashProfileButton').textContent=p?'Edit profile':'Set up profile';const profileName=(p&&typeof p.name==='string'?p.name.trim():'');const profileInitial=Array.from(profileName)[0]?.toLocaleUpperCase()||'S';const profileBadge=$('dashProfileButtonTop')?.querySelector('span');const profileLabel=$('dashProfileButtonTop')?.querySelector('b');if(profileBadge)profileBadge.textContent=profileInitial;if(profileLabel)profileLabel.textContent=profileName||'Your profile';
 const saved=new Map(records().map(x=>[x.id,x.data]));const visibleSubjects=selectedYear==='resources'?[]:subjects.filter(s=>(s.yearLevel||'YL1')===selectedYear);const loadedVisibleSubjects=visibleSubjects.filter(s=>!failedSubjects.has(s.id));let total=0,answeredN=0,revealedN=0,correct=0,scored=0;const allTopics=new Set(),doneTopics=new Set();
 const glanceRows=[];
 const cards=visibleSubjects.map(s=>{
  if(failedSubjects.has(s.id)){
   const problem=failedSubjects.get(s.id);
   const unavailable='<article class="dash-subject-card dash-subject-unavailable"><div class="dash-subject-heading"><span class="dash-subject-icon">⚠️</span><div class="dash-subject-title"><h3>'+esc(s.name)+'</h3><p>Progress temporarily unavailable</p></div><span class="dash-subject-pct">—</span></div><p class="dash-subject-error">Question bank could not be loaded ('+esc(problem)+'). Saved progress has not been changed. Reload after the bank is available.</p><a href="quiz.html?subject='+encodeURIComponent(s.id)+'" class="dash-continue">Open subject ↗</a></article>';
   glanceRows.push(unavailable);
   return unavailable;
  }
  const qs=Array.isArray(dataBySubject.get(s.id))?dataBySubject.get(s.id):[],v=saved.get(s.id)||{},ans=v.answers&&typeof v.answers==='object'?v.answers:{},rev=v.revealed&&typeof v.revealed==='object'?v.revealed:{},ids=new Set(qs.map(q=>String(q.id)));
  const ansKeys=Object.keys(ans),revKeys=Object.keys(rev);
  const ansIds=ansKeys.filter(id=>ids.has(String(id))),revIds=revKeys.filter(id=>ids.has(String(id)));
  const completedIds=new Set([...ansIds,...revIds]);
  const unmatchedSaved=ansKeys.filter(id=>!ids.has(String(id))).length+revKeys.filter(id=>!ids.has(String(id))).length;
  total+=qs.length;answeredN+=ansIds.length;revealedN+=revIds.length;
  qs.forEach(q=>{const tags=[...new Set([q.topic,...(Array.isArray(q.tags)?q.tags:[])].filter(Boolean))];tags.forEach(t=>{allTopics.add(s.id+'::'+t);if(completedIds.has(String(q.id)))doneTopics.add(s.id+'::'+t)});if(ans[q.id]!==undefined&&Number.isInteger(q.correctAnswer)){scored++;if(ans[q.id]===q.correctAnswer)correct++}});
  const completedN=completedIds.size,pct=qs.length?Math.round(completedN/qs.length*100):0,has=completedN>0,when=Number(v.savedAt)?'Saved '+new Date(Number(v.savedAt)).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'No saved session yet';
  const needsReconciliation=unmatchedSaved>0&&completedN===0;
  const progressLabel=needsReconciliation?'—':pct+'%';
  const reviewedLabel=needsReconciliation?'Saved progress needs reconciliation':completedN+' of '+qs.length+' reviewed';
  const progressBar=needsReconciliation?'':'<div class="dash-progress-track"><span style="width:'+pct+'%"></span></div>';
  const reconciliationNote=unmatchedSaved?'<p class="dash-subject-error">'+unmatchedSaved+' saved answer/reveal key(s) do not match the current question IDs. They remain saved; they are not counted as completed until the question bank IDs are reconciled.</p>':'';
  glanceRows.push('<div class="dash-glance-row"><span class="dash-glance-emoji" aria-hidden="true">'+esc(s.icon||'📚')+'</span><span class="dash-glance-name">'+esc(s.name)+'</span><div class="dash-glance-track" role="progressbar" aria-label="'+esc(s.name)+' progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div><span class="dash-glance-pct">'+pct+'%</span><span class="dash-glance-count">'+completedN+' / '+qs.length+'</span><a class="dash-glance-link" href="quiz.html?subject='+encodeURIComponent(s.id)+'" aria-label="Open '+esc(s.name)+'">›</a></div>');
  return '<article class="dash-subject-card dash-subject-card-compact"><div class="dash-subject-heading"><span class="dash-subject-icon" aria-hidden="true">'+esc(s.icon||'📚')+'</span><div class="dash-subject-title"><h3><a href="quiz.html?subject='+encodeURIComponent(s.id)+'">'+esc(s.name)+'</a></h3></div><span class="dash-subject-pct">'+progressLabel+'</span></div><div class="dash-subject-progress-row">'+(needsReconciliation?'<span class="dash-subject-reconcile-label">Check saved data</span>':'<div class="dash-progress-track" role="progressbar" aria-label="'+esc(s.name)+' progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div><span class="dash-subject-reviewed">'+completedN+'/'+qs.length+'</span>')+'<a href="quiz.html?subject='+encodeURIComponent(s.id)+'" class="dash-continue">'+(has?'Continue':'Start')+' <span aria-hidden="true">↗</span></a></div>'+reconciliationNote+'</article>';
 }).join('');
 const coverage=allTopics.size?Math.round(doneTopics.size/allTopics.size*100):0,answeredPct=total?Math.round(answeredN/total*100):0;
 const startedSubjects=loadedVisibleSubjects.filter(s=>{const qs=dataBySubject.get(s.id)||[],ids=new Set(qs.map(q=>String(q.id))),v=saved.get(s.id)||{};return [...Object.keys(v.answers||{}),...Object.keys(v.revealed||{})].some(id=>ids.has(String(id)))}).length;
 const accuracy=scored?Math.round(correct/scored*100):0;
 const stat=(label,value,note,pct,color)=>'<article class="dash-stat"><div class="dash-stat-copy"><span class="dash-stat-label">'+label+'</span><strong>'+value+'</strong><span class="dash-stat-note">'+note+'</span></div><div class="dash-stat-ring">'+ring(pct,color,label)+'</div></article>';
 $('dashStats').innerHTML=stat('Questions Answered',answeredN.toLocaleString(),'of '+total.toLocaleString()+' total',answeredPct,'#8b5cf6')+stat('Topics with Activity',doneTopics.size.toLocaleString(),'of '+allTopics.size.toLocaleString()+' total',coverage,'#10b981')+stat('Subjects Started',startedSubjects.toLocaleString(),'of '+loadedVisibleSubjects.length.toLocaleString()+' available',loadedVisibleSubjects.length?Math.round(startedSubjects/loadedVisibleSubjects.length*100):0,'#369cf5')+stat('Avg. Accuracy',scored?accuracy+'%':'—','across answered questions',accuracy,'#f5c15d');
 const glanceYearLabel=selectedYear==='resources'?'Additional Resources':selectedYear;
 const hasAnyProgress=visibleSubjects.some(s=>{const v=saved.get(s.id)||{};return Object.keys(v.answers||{}).length>0||Object.keys(v.revealed||{}).length>0;});
 if(!glanceRows.length){$('dashDonuts').innerHTML='<div class="dash-donuts-empty"><span class="dash-donuts-empty-icon" aria-hidden="true">📖</span><p class="dash-donuts-empty-title">No subjects yet for '+esc(glanceYearLabel)+'</p><p class="dash-donuts-empty-sub">Choose a year level above and answer some questions to see your progress here.</p><a class="dash-button dash-button-primary dash-donuts-empty-cta" href="quiz.html" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px">Start a quiz →</a></div>';}else if(!hasAnyProgress){$('dashDonuts').innerHTML='<div class="dash-donuts-empty"><span class="dash-donuts-empty-icon" aria-hidden="true">📖</span><p class="dash-donuts-empty-title">No progress yet for '+esc(glanceYearLabel)+'</p><p class="dash-donuts-empty-sub">Answer questions in the quiz to see your subject progress here.</p><a class="dash-button dash-button-primary dash-donuts-empty-cta" href="quiz.html" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px">Start a quiz →</a></div>';}else{$('dashDonuts').innerHTML=glanceRows.join('');}
 const glanceTitle=document.querySelector('[data-glance-year]');if(glanceTitle)glanceTitle.textContent=selectedYear==='resources'?'Additional Resources':selectedYear+' subject progress';
 document.querySelectorAll('.hub-pill[data-year]').forEach(b=>{const active=b.dataset.year===selectedYear;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 $('dashSubjectList').innerHTML=cards||'<p class="dash-empty">No subjects found for '+esc(selectedYear==='resources'?'Additional Resources':selectedYear)+'.</p>';
 const loadMessage=$('dashDataMessage');
 if(loadMessage&&failedSubjects.size){loadMessage.textContent='Some question banks could not be loaded: '+[...failedSubjects.keys()].join(', ')+'. Their progress is shown as unavailable rather than zero. Your saved data is untouched.';loadMessage.classList.add('is-error')}
 else if(loadMessage&&loadMessage.classList.contains('is-error')&&loadMessage.textContent.includes('question banks could not be loaded')){loadMessage.textContent='';loadMessage.classList.remove('is-error')}
 const subjectCount=document.querySelector('.dash-subject-count');if(subjectCount)subjectCount.textContent=selectedYear==='resources'?'Additional resources':selectedYear+' subjects';
 const h=buildHeatmap();$('dashHeatmap').innerHTML=h.html;$('dashActivityStats').innerHTML='<div><strong>'+h.active+'</strong><span>active days</span></div><div><strong>'+h.streak+'</strong><span>current streak</span></div><div><strong>'+h.longest+'</strong><span>longest streak</span></div><div><strong>'+h.total+'</strong><span>total questions</span></div>';
 $('dashActivityCaption').textContent='Showing '+(range===30?'the last 30 days':range===180?'the last 6 months':'the last 12 months')+'. Daily history begins when tracking is enabled; older activity is not guessed.';
}
function exportBackup(){
 const payload={app:'StudyMats',formatVersion:1,exportedAt:new Date().toISOString(),profile:profile(),progress:records().map(x=>({subjectId:x.id,data:x.data})),activity:activity()};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='studymats-progress-'+dateKey(new Date())+'.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);$('dashDataMessage').textContent='Backup exported. Keep the JSON file somewhere safe.';
}
function importBackup(file){
 const reader=new FileReader();reader.onload=()=>{
  try{const p=JSON.parse(reader.result);if(!p||p.app!=='StudyMats'||p.formatVersion!==1||!Array.isArray(p.progress))throw Error('This is not a supported StudyMats backup.');
   const known=new Set(subjects.map(s=>s.id));p.progress=p.progress.filter(x=>x&&known.has(x.subjectId)&&x.data&&typeof x.data==='object');if(!p.progress.length)throw Error('No compatible subject progress records were found.');
   $('importSummary').textContent='This backup contains '+p.progress.length+' subject record(s)'+(p.exportedAt?' from '+new Date(p.exportedAt).toLocaleDateString():'')+'. Choose merge to keep current progress or replace to start from this backup.';
   $('importModal').hidden=false;$('importModal').classList.add('is-open');
   $('importMergeButton').onclick=()=>applyImport(p,'merge');$('importReplaceButton').onclick=()=>{if(confirm('Replace current saved progress with this backup? Export your current data first if you may need it.'))applyImport(p,'replace')};
  }catch(e){$('dashDataMessage').textContent=e.message||'Could not read this backup.';$('dashDataMessage').classList.add('is-error')}
 };reader.readAsText(file);
}
function applyImport(p,mode){
 const snapshot={progress:records().map(x=>({key:x.key,value:localStorage.getItem(x.key)})),activity:localStorage.getItem(ACTIVITY),profile:localStorage.getItem(PROFILE)};
 try{
  if(mode==='replace'){records().forEach(x=>localStorage.removeItem(x.key));localStorage.removeItem(ACTIVITY)}
  p.progress.forEach(x=>{const k=PREFIX+encodeURIComponent(x.subjectId),old=mode==='merge'?parse(localStorage.getItem(k),{}):{},d=x.data;localStorage.setItem(k,JSON.stringify({...old,...d,answers:{...(old.answers||{}),...(d.answers||{})},revealed:{...(old.revealed||{}),...(d.revealed||{})}}))});
  if(p.profile)saveProfile(p.profile);
  if(p.activity&&typeof p.activity==='object'){const cur=mode==='merge'?activity():{};Object.entries(p.activity).forEach(([day,items])=>{if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&Array.isArray(items))cur[day]=[...new Set([...(cur[day]||[]),...items.filter(x=>typeof x==='string')])]});localStorage.setItem(ACTIVITY,JSON.stringify(cur))}
  $('importModal').hidden=true;$('importModal').classList.remove('is-open');$('dashDataMessage').textContent='Progress '+(mode==='merge'?'merged':'replaced')+' successfully.';$('dashDataMessage').classList.remove('is-error');render();
 }catch(error){
  try{records().forEach(x=>localStorage.removeItem(x.key));snapshot.progress.forEach(x=>localStorage.setItem(x.key,x.value));if(snapshot.activity===null)localStorage.removeItem(ACTIVITY);else localStorage.setItem(ACTIVITY,snapshot.activity);if(snapshot.profile===null)localStorage.removeItem(PROFILE);else localStorage.setItem(PROFILE,snapshot.profile)}catch(rollbackError){console.error('StudyMats import rollback failed.',rollbackError)}
  $('dashDataMessage').textContent='Import failed; the app attempted to restore your previous saved data. Check browser storage and try again.';$('dashDataMessage').classList.add('is-error');
 }
}
function reset(){
 if(!confirm('Reset all saved quiz progress and daily activity on this device? This cannot be undone without a backup. Your profile settings will be kept.'))return;
 records().forEach(x=>localStorage.removeItem(x.key));localStorage.removeItem(ACTIVITY);$('dashDataMessage').textContent='Quiz progress and activity reset. Your profile is unchanged.';render();
}
document.addEventListener('DOMContentLoaded',()=>{
 $('profileForm')?.addEventListener('submit',e=>{e.preventDefault();saveProfile({name:$('profileName').value.trim().slice(0,60),showName:$('profileShowName').checked});closeProfile()});
 $('profileSkipButton')?.addEventListener('click',()=>{if(!profile())saveProfile({name:'',showName:true});closeProfile()});
 $('profileModal')?.addEventListener('click',e=>{if(e.target===$('profileModal')&&profile())closeProfile()});
 $('dashProfileButton')?.addEventListener('click',openProfile);$('dashExportButton')?.addEventListener('click',exportBackup);$('dashImportButton')?.addEventListener('click',()=>$('dashImportFile').click());
 $('dashImportFile')?.addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)importBackup(f);e.target.value=''});
 $('importCancelButton')?.addEventListener('click',()=>{$('importModal').hidden=true;$('importModal').classList.remove('is-open')});
 $('importModal')?.addEventListener('click',e=>{if(e.target===$('importModal')){$('importModal').hidden=true;$('importModal').classList.remove('is-open')}});
 $('dashResetButton')?.addEventListener('click',reset);
 const whatsNew=$('whatsNewNotice'), whatsNewKey='studymats-whats-new-dismissed-v1';
 try { if(whatsNew && localStorage.getItem(whatsNewKey)!=='1') whatsNew.hidden=false; } catch { if(whatsNew) whatsNew.hidden=false; }
 document.querySelectorAll('[data-dismiss-whats-new]').forEach(b=>b.addEventListener('click',()=>{if(whatsNew)whatsNew.hidden=true;try{localStorage.setItem(whatsNewKey,'1')}catch{}}));
 const changelog=$('changelogModal');
 const openChangelog=()=>{if(!changelog)return;changelog.hidden=false;changelog.classList.add('is-open');changelog.querySelector('[data-close-changelog]')?.focus()};
 const closeChangelog=()=>{if(!changelog)return;changelog.hidden=true;changelog.classList.remove('is-open')};
 document.querySelectorAll('[data-open-changelog]').forEach(b=>b.addEventListener('click',openChangelog));
 document.querySelectorAll('[data-close-changelog]').forEach(b=>b.addEventListener('click',closeChangelog));
 changelog?.addEventListener('click',e=>{if(e.target===changelog)closeChangelog()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&changelog&&!changelog.hidden)closeChangelog()});
 document.querySelectorAll('[data-activity-range]').forEach(b=>b.addEventListener('click',()=>{range=Number(b.dataset.activityRange)||180;document.querySelectorAll('[data-activity-range]').forEach(x=>x.classList.toggle('active',x===b));render()}));
 document.querySelectorAll('.hub-pill[data-year]').forEach(b=>b.addEventListener('click',()=>{selectedYear=b.dataset.year||'YL1';render();const bankBrowser=document.querySelector('.hub-year-dropdown');if(bankBrowser)bankBrowser.open=true;}));
 document.querySelectorAll('.hub-year-dropdown summary').forEach(summary=>summary.setAttribute('aria-label','Open or close test banks'));
 if(!profile())openProfile();render();load().catch(e=>{console.error('StudyMats dashboard load failed:',e);const message=$('dashDataMessage');if(message){message.textContent='Some dashboard data could not load. Your saved quiz data is untouched.';message.classList.add('is-error')}render()});
 window.addEventListener('storage',e=>{if(e.key&& (e.key.startsWith(PREFIX)||[ACTIVITY,PROFILE].includes(e.key)))render()});
});
})();
