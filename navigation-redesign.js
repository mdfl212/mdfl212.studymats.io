/* StudyMats dashboard/navigation reorganization. Existing quiz, search, progress and backup logic is reused. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const greetings=[
  'What would you like to study today?',
  'Ready to make progress? Where shall we start?',
  'What would you like to focus on today?',
  "Let's make today's study session count. What's first?",
  'Welcome back. What shall we work on today?'
 ];
 const PROFILE_KEY='studymats-profile-v1', ACTIVITY_KEY='studymats-activity-v1', PROGRESS_PREFIX='studymats-progress-v1:';
 const safeParse=(raw,fallback)=>{try{return JSON.parse(raw)||fallback}catch{return fallback}};
 const profile=()=>safeParse(localStorage.getItem(PROFILE_KEY),{});
 function init(){
  if(!$('studyDashboard')||document.querySelector('.sm-global-nav'))return;
  const body=document.body, wrapper=document.querySelector('main.wrapper'), oldTop=document.querySelector('.app-topbar');
  if(!wrapper||!oldTop)return;
  body.classList.add('sm-redesign-active');
  const sidebar=document.querySelector('.desktop-sidebar');
  const links=sidebar?[...sidebar.querySelectorAll('.sidebar-link')]:[];
  const builderLink=links.find(a=>a.textContent.includes('Test Bank Builder'));
  const nav=document.createElement('nav');nav.className='sm-global-nav';nav.setAttribute('aria-label','Main navigation');
  nav.innerHTML='<a class="sm-nav-brand" href="#home" aria-label="StudyMats home"><img src="assets/studymats-mark.svg" alt=""><span>StudyMats</span></a><div class="sm-nav-links"><button class="sm-nav-link" type="button" data-sm-nav="quiz">Quiz</button><button class="sm-nav-link" type="button" data-sm-nav="builder">Test Bank Builder</button><button class="sm-nav-link" type="button" data-sm-nav="browse">Browse Test Banks</button><button class="sm-nav-link" type="button" data-sm-nav="progress">Study Progress</button></div><label class="sm-nav-search"><span aria-hidden="true">⌕</span><input id="smSearchInput" type="search" placeholder="Search questions or topics…" aria-label="Search questions or topics"><kbd>⌘ K</kbd></label><div class="sm-nav-actions"><button class="sm-nav-profile" id="smProfileButton" type="button" aria-expanded="false" aria-haspopup="true"><span class="sm-nav-avatar" id="smProfileAvatar">S</span><span class="sm-profile-name" id="smProfileName">Profile</span><span aria-hidden="true">⌄</span></button><section class="sm-profile-menu" id="smProfileMenu" hidden aria-label="Profile menu"><h3>Profile</h3><button type="button" class="sm-menu-action" id="smEditName">Edit name</button><button type="button" class="sm-menu-action" data-sm-changelog>What&#39;s Changed</button><div class="sm-menu-divider"></div><h3>Backup & Portability</h3><div id="smBackupHost" class="sm-backup-host"></div></section></div>';
  document.body.insertBefore(nav,wrapper);
  const oldSearch=$('dashboardSearch');
  const searchInput=$('smSearchInput');
  if(oldSearch){
   searchInput.value=oldSearch.value;
   searchInput.addEventListener('input',()=>{oldSearch.value=searchInput.value;oldSearch.dispatchEvent(new Event('input',{bubbles:true}));});
   searchInput.addEventListener('click',()=>oldSearch.click());
   searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();oldSearch.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}});
  }
  const kbdEl=document.querySelector('.sm-nav-search kbd');
  if(kbdEl)kbdEl.textContent=/Mac|iPhone|iPad/.test(navigator.platform||'')?'⌘ K':'Ctrl K';
  const themeButton=oldTop.querySelector('[data-theme-toggle]');
  const themeClone=document.createElement('button');themeClone.type='button';themeClone.className='sm-nav-link';themeClone.textContent='◐';themeClone.setAttribute('aria-label','Toggle theme');themeClone.title='Toggle theme';themeClone.addEventListener('click',()=>themeButton?.click());
  nav.querySelector('.sm-nav-actions').prepend(themeClone);
  const profileMenu=$('smProfileMenu'),profileButton=$('smProfileButton');
  const updateProfile=()=>{
   const p=profile(),name=p&&p.showName!==false&&typeof p.name==='string'?p.name.trim():'';
   $('smProfileName').textContent=name||'Profile';$('smProfileAvatar').textContent=(name?Array.from(name)[0]:'S').toLocaleUpperCase();
   const welcomeName=$('smWelcomeName');if(welcomeName)welcomeName.textContent=name?'Hi, '+name:'Hi there';
  };
  const closeProfile=()=>{profileMenu.hidden=true;profileButton.setAttribute('aria-expanded','false')};
  profileButton.addEventListener('click',e=>{e.stopPropagation();profileMenu.hidden=!profileMenu.hidden;profileButton.setAttribute('aria-expanded',String(!profileMenu.hidden));});
  document.addEventListener('click',e=>{if(!e.target.closest('.sm-nav-actions'))closeProfile();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProfile();});
  $('smEditName')?.addEventListener('click',()=>{closeProfile();$('dashProfileButton')?.click();});
  document.querySelectorAll('[data-sm-changelog]').forEach(b=>b.addEventListener('click',()=>{closeProfile();const cm=$('changelogModal');if(cm){cm.hidden=false;cm.classList.add('is-open');cm.querySelector('[data-close-changelog]')?.focus();}}));
  const backup=$('backupPanel');if(backup)$('smBackupHost')?.appendChild(backup);
  const dashboard=$('studyDashboard');
  const welcome=document.createElement('section');welcome.className='sm-page sm-welcome';welcome.id='smHomeView';
  const greet=greetings[Math.floor(Math.random()*greetings.length)];
  welcome.innerHTML='<h1 id="smWelcomeName">Hi there</h1><p id="smWelcomePrompt"></p><div class="sm-welcome-actions"><button class="sm-primary-action primary" id="smStartQuiz" type="button">Start Quiz <span aria-hidden="true">→</span></button><button class="sm-primary-action" id="smCheckProgress" type="button">Check Your Progress</button><span class="sm-streak" id="smStreak" aria-live="polite">Study streak · —</span></div>';
  welcome.querySelector('#smWelcomePrompt').textContent=greet;
  const views=document.createElement('div');views.id='smAppViews';
  const progress=document.createElement('section');progress.className='sm-page sm-progress-view sm-view';progress.id='smProgressView';progress.hidden=true;progress.innerHTML='<h1 class="sm-view-title">Study Progress</h1>';
  const builder=document.createElement('section');builder.className='sm-builder-view sm-view';builder.id='smBuilderView';builder.hidden=true;builder.innerHTML='<div class="sm-builder-toolbar"><button type="button" class="sm-primary-action" id="smBuilderHome">← Back to welcome</button><span>Test Bank Builder</span></div><iframe id="smBuilderFrame" title="StudyMats Test Bank Builder" src="test-bank-builder-v2.html"></iframe>';
  const metricGrid=document.createElement('section');metricGrid.className='sm-metric-grid';metricGrid.setAttribute('aria-label','Study metrics');metricGrid.innerHTML='<button class="sm-metric-tile" type="button" data-sm-metric="answered"><span>Questions answered</span><strong>—</strong></button><button class="sm-metric-tile" type="button" data-sm-metric="accuracy"><span>Answer accuracy</span><strong>—</strong></button><button class="sm-metric-tile" type="button" data-sm-metric="completed"><span>Questions completed</span><strong>—</strong></button><button class="sm-metric-tile" type="button" data-sm-metric="progress"><span>Average subject progress</span><strong>—</strong></button>';
  const oldWelcome=dashboard.querySelector('.dash-welcome');
  if(oldWelcome)oldWelcome.hidden=true;
  const subjectDropdown=$('subjectProgressDropdown'),activityPanel=dashboard.querySelector('.dash-activity-panel'),donuts=$('dashDonuts'),yearRow=wrapper.querySelector(':scope > .hub-year-row');
  const stats=$('dashStats')||document.createElement('div');stats.id='dashStats';stats.classList.add('dash-stats');
  progress.appendChild(activityPanel||document.createElement('div'));
  if(yearRow)progress.appendChild(yearRow);progress.appendChild(metricGrid);progress.appendChild(stats);
  if(donuts)progress.appendChild(donuts);
  if(subjectDropdown)progress.appendChild(subjectDropdown);
  const oldBackup=$('backupPanel');if(oldBackup)oldBackup.hidden=false;
  wrapper.insertBefore(welcome,oldTop.nextSibling);
  wrapper.insertBefore(views, welcome.nextSibling);views.append(progress,builder);
  // Force-hide legacy host: style.css display:grid overrides [hidden] alone.
  dashboard.hidden=true;
  dashboard.setAttribute('hidden','');
  dashboard.style.setProperty('display','none','important');
  dashboard.setAttribute('aria-hidden','true');
  const modal=document.createElement('div');modal.className='sm-modal';modal.id='smRankingModal';modal.hidden=true;modal.innerHTML='<section class="sm-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="smRankingTitle" tabindex="-1"><header class="sm-modal-header"><h2 id="smRankingTitle">Subject rankings</h2><button class="sm-modal-close" type="button" aria-label="Close rankings">×</button></header><div id="smRankingContent"></div></section>';document.body.appendChild(modal);
  const showModal=()=>{modal.hidden=false;modal.querySelector('.sm-modal-close').focus();};
  const closeModal=()=>{modal.hidden=true;};
  modal.querySelector('.sm-modal-close').addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});
  const setView=which=>{
   welcome.hidden=which!=='home';
   progress.hidden=which!=='progress';
   builder.hidden=which!=='builder';
   dashboard.hidden=true;
   dashboard.setAttribute('hidden','');
   dashboard.style.setProperty('display','none','important');
   nav.querySelectorAll('[data-sm-nav]').forEach(b=>{
    const active=b.dataset.smNav===which;
    b.setAttribute('aria-current',active?'page':'false');
   });
   body.dataset.smView=which;
   if(which==='progress')renderMetrics();
   window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  nav.querySelector('[data-sm-nav="quiz"]').addEventListener('click',()=>{const trigger=$('[data-mobile-quiz]')||document.querySelector('.desktop-sidebar .sidebar-link[href="quiz.html"]');if(trigger)trigger.click();else $('smStartQuiz')?.click();});
  nav.querySelector('[data-sm-nav="browse"]').addEventListener('click',()=>{const trigger=$('[data-open-subject-browser]')||document.querySelector('[data-sidebar-subjects]');if(trigger)trigger.click();});
  nav.querySelector('[data-sm-nav="progress"]').addEventListener('click',()=>setView('progress'));
  nav.querySelector('[data-sm-nav="builder"]').addEventListener('click',()=>setView('builder'));
  $('smBuilderHome')?.addEventListener('click',()=>setView('home'));
  nav.querySelector('.sm-nav-brand').addEventListener('click',e=>{e.preventDefault();setView('home')});
  $('smStartQuiz')?.addEventListener('click',()=>nav.querySelector('[data-sm-nav="quiz"]').click());
  $('smCheckProgress')?.addEventListener('click',()=>setView('progress'));
  const streak=()=>{
   const data=safeParse(localStorage.getItem(ACTIVITY_KEY),{}),today=new Date();today.setHours(12,0,0,0);
   const key=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
   let n=0,d=new Date(today);if(!(Array.isArray(data[key(d)])&&data[key(d)].length))d.setDate(d.getDate()-1);
   while(Array.isArray(data[key(d)])&&data[key(d)].length){n++;d.setDate(d.getDate()-1)}
   return n;
  };
  function refreshStreak(){const el=$('smStreak');if(!el)return;const n=streak();el.textContent=n?('🔥 '+n+' day'+(n===1?'':'s')+' streak'):'Study streak · No activity yet';}
  const loadRankData=async()=>{
   try{
    const catalog=await fetch('subjects.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()});
    return await Promise.all(catalog.map(async s=>{
     const qs=await fetch(s.data,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()});
     const saved=safeParse(localStorage.getItem(PROGRESS_PREFIX+encodeURIComponent(s.id)),{});
     const answers=saved.answers&&typeof saved.answers==='object'?saved.answers:{},revealed=saved.revealed&&typeof saved.revealed==='object'?saved.revealed:{};
     const ids=new Set(qs.map(q=>String(q.id))),validAnswers=Object.keys(answers).filter(id=>ids.has(String(id))),completed=new Set([...validAnswers,...Object.keys(revealed).filter(id=>ids.has(String(id)))]);
     const scored=validAnswers.filter(id=>Number.isInteger(qs.find(q=>String(q.id)===String(id))?.correctAnswer));
     const correct=scored.filter(id=>answers[id]===qs.find(q=>String(q.id)===String(id)).correctAnswer).length;
     return {name:s.name,answered:validAnswers.length,completed:completed.size,accuracy:scored.length?Math.round(correct/scored.length*100):null,progress:qs.length?Math.round(completed.size/qs.length*100):null,questions:qs.length,active:completed.size>0};
    }));
   }catch(e){return []}
  };
  let rankData=[];
  async function renderMetrics(){
   rankData=await loadRankData();
   const sums={answered:rankData.reduce((n,s)=>n+s.answered,0),completed:rankData.reduce((n,s)=>n+s.completed,0)};
   const scored=rankData.filter(s=>s.accuracy!==null),accuracyN=rankData.reduce((n,s)=>n+(s.accuracy===null?0:s.accuracy),0);
   const validProgress=rankData.filter(s=>s.progress!==null);const vals={answered:sums.answered,completed:sums.completed,progress:validProgress.length?Math.round(validProgress.reduce((n,s)=>n+s.progress,0)/validProgress.length)+'%':'—',accuracy:scored.length?Math.round(accuracyN/scored.length)+'%':'—'};
   metricGrid.querySelectorAll('[data-sm-metric]').forEach(b=>b.querySelector('strong').textContent=vals[b.dataset.smMetric]);
  }
  metricGrid.querySelectorAll('[data-sm-metric]').forEach(b=>b.addEventListener('click',async()=>{
   if(!rankData.length)await renderMetrics();
   const metric=b.dataset.smMetric,labels={answered:'Questions answered',completed:'Questions completed',accuracy:'Answer accuracy',progress:'Average subject progress'};
   const eligible=rankData.filter(s=>metric==='accuracy'?s.accuracy!==null:metric==='progress'?s.progress!==null:s[metric]>0);
   eligible.sort((a,b)=>{const av=Number(a[metric]),bv=Number(b[metric]);return bv-av||a.name.localeCompare(b.name)});
   $('smRankingTitle').textContent='Top subjects · '+labels[metric];
   const top=eligible.slice(0,10);
   $('smRankingContent').innerHTML=top.length?'<ol class="sm-ranking-list">'+top.map(s=>'<li><span>'+s.name.replace(/[&<>]/g,c=>({"&":"&","<":"<",">":">"}[c]))+'</span><strong>'+((metric==='accuracy'||metric==='progress')?s[metric]+'%':s[metric].toLocaleString())+'</strong></li>').join('')+'</ol>':'<p class="sm-empty">There is not enough saved data to rank subjects for this metric yet.</p>';
   showModal();
  }));
  const changelog=$('changelogModal');
  if(changelog){
   const actions=changelog.querySelector('.dash-modal-actions');
   if(actions&&!actions.querySelector('.sm-dont-show')){const b=document.createElement('button');b.type='button';b.className='dash-button sm-dont-show';b.textContent="Don't show again";b.addEventListener('click',()=>{try{localStorage.setItem('studymats-whats-changed-optout-v1','1');localStorage.setItem('studymats-whats-changed-seen-v1','1')}catch{}changelog.hidden=true;changelog.classList.remove('is-open')});actions.prepend(b)}
   const markSeen=()=>{try{localStorage.setItem('studymats-whats-changed-seen-v1','1')}catch{}};
   changelog.querySelectorAll('[data-close-changelog]').forEach(b=>b.addEventListener('click',markSeen));
   changelog.addEventListener('click',e=>{if(e.target===changelog)markSeen()});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!changelog.hidden)markSeen()});
   try{if(localStorage.getItem('studymats-whats-changed-seen-v1')!=='1'&&localStorage.getItem('studymats-whats-changed-optout-v1')!=='1'){setTimeout(()=>{changelog.hidden=false;changelog.classList.add('is-open')},250)}}catch{}
  }
  updateProfile();refreshStreak();
  window.addEventListener('studymats:profilesaved',()=>{updateProfile();refreshStreak()});
  window.addEventListener('storage',()=>{updateProfile();refreshStreak()});
  $('profileForm')?.addEventListener('submit',()=>setTimeout(()=>{updateProfile();window.dispatchEvent(new Event('studymats:profilesaved'))},0));
  setView('home');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
