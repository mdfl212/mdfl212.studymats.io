(() => {
  'use strict';
  const dashboardInput=document.getElementById('dashboardSearch'), input=document.getElementById('questionSearchInput'), modal=document.getElementById('questionSearchModal');
  const backdrop=document.getElementById('questionSearchBackdrop'), resultsEl=document.getElementById('questionSearchResults');
  const previewEl=document.getElementById('questionSearchPreview'), statusEl=document.getElementById('questionSearchStatus');
  const closeButton=document.getElementById('questionSearchClose');
  if(!dashboardInput||!input||!modal||!resultsEl||!previewEl)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  let banks=[],matches=[],selectedIndex=0,loadPromise=null,debounce=null;
  function openModal(){
    if(!modal.hidden){input.focus();return;}
    input.value=dashboardInput.value;modal.hidden=false;document.body.classList.add('question-search-open');modal.setAttribute('aria-hidden','false');
    if(input.value.trim())runSearch(input.value);else{resultsEl.innerHTML='<div class="qs-empty">Type a topic, keyword, or part of a question to search all test banks.</div>';previewEl.innerHTML='<div class="qs-preview-empty"><span>⌕</span><strong>Find a question</strong><p>Search across subjects, question stems, options, topics, and rationales.</p></div>';statusEl.textContent='Search all available question banks';}
    input.focus();
  }
  function closeModal(){modal.hidden=true;document.body.classList.remove('question-search-open');modal.setAttribute('aria-hidden','true');input.blur();}
  async function loadBanks(){
    if(banks.length)return banks;if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      const mr=await fetch(new URL('subjects.json',document.baseURI));if(!mr.ok)throw new Error('Could not load the subject list.');
      const subjects=await mr.json();
      banks=await Promise.all(subjects.map(async subject=>{
        try{
          const r=await fetch(new URL(subject.data,document.baseURI));if(!r.ok)throw new Error('Question bank request failed');
          const payload=await r.json();if(!Array.isArray(payload))throw new Error('Question bank is not a JSON array');
          const questions=payload.filter(q=>q&&typeof q.question==='string'&&Array.isArray(q.options)&&q.options.length>=2&&Number.isInteger(q.correctAnswer)&&q.correctAnswer>=0&&q.correctAnswer<q.options.length).map(q=>({...q}));
          return {subject,questions,error:false};
        }catch(error){console.warn('Search could not load bank:',subject.name,error);return {subject,questions:[],error:true};}
      }));
      return banks;
    })();
    try{return await loadPromise;}catch(error){loadPromise=null;throw error;}
  }
  function searchable(q,s){return norm([s.name,s.shortName,s.yearLevel,q.id,q.topic,q.question,...(q.options||[]),q.rationale?.text,...(Array.isArray(q.tags)?q.tags:[])].join(' '));}
  async function runSearch(raw){
    const query=norm(raw);
    if(!query){matches=[];resultsEl.innerHTML='<div class="qs-empty">Type a topic, keyword, or part of a question to search all test banks.</div>';previewEl.innerHTML='<div class="qs-preview-empty"><span>⌕</span><strong>Find a question</strong><p>Search across subjects, question stems, options, topics, and rationales.</p></div>';statusEl.textContent='Search all available question banks';return;}
    resultsEl.innerHTML='<div class="qs-loading"><span class="qs-spinner"></span>Searching question banks…</div>';previewEl.innerHTML='<div class="qs-preview-empty"><strong>Searching</strong><p>Checking the available subject banks.</p></div>';
    try{
      const loaded=await loadBanks(),terms=query.split(' ').filter(Boolean),found=[];
      loaded.forEach(({subject,questions})=>questions.forEach(question=>{
        const text=searchable(question,subject),score=terms.reduce((n,t)=>n+(text.includes(t)?1:0),0);
        if(score===terms.length){const stem=norm(question.question),topic=norm(question.topic);found.push({subject,question,score:score+(stem.includes(query)?3:0)+(topic.includes(query)?2:0)});}
      }));
      found.sort((a,b)=>b.score-a.score||a.subject.name.localeCompare(b.subject.name));matches=found.slice(0,100);selectedIndex=0;
      const failed=loaded.filter(b=>b.error).length;statusEl.textContent=found.length+' match'+(found.length===1?'':'es')+(failed?' · '+failed+' bank'+(failed===1?'':'s')+' unavailable':'');
      if(!matches.length){resultsEl.innerHTML='<div class="qs-empty"><strong>No matching questions found.</strong><p>Try fewer words, a different spelling, or a broader topic.</p></div>';previewEl.innerHTML='<div class="qs-preview-empty"><span>↗</span><strong>No preview yet</strong><p>Try another keyword to find questions in the test banks.</p></div>';return;}
      renderResults();renderPreview();
    }catch(error){statusEl.textContent='Search could not load';resultsEl.innerHTML='<div class="qs-empty"><strong>Could not search the question banks.</strong><p>'+esc(error.message)+' Please refresh and try again.</p></div>';previewEl.innerHTML='<div class="qs-preview-empty"><strong>Preview unavailable</strong><p>Check your connection and reload the dashboard.</p></div>';}
  }
  function renderResults(){
    resultsEl.innerHTML=matches.map((m,i)=>{
      const q=m.question,stem=String(q.question||'').replace(/\s+/g,' ').trim(),topic=q.topic||(Array.isArray(q.tags)?q.tags[0]:'')||'General';
      return '<button type="button" class="qs-result'+(i===selectedIndex?' is-selected':'')+'" data-qs-result="'+i+'" aria-pressed="'+(i===selectedIndex)+'"><span class="qs-result-top"><span>'+esc(m.subject.icon||'📚')+' '+esc(m.subject.name)+'</span><small>'+esc(m.subject.yearLevel||'')+'</small></span><strong>'+esc(stem.length>170?stem.slice(0,167)+'…':stem)+'</strong><span class="qs-result-topic">'+esc(topic)+' · '+esc(q.id||'Question')+'</span></button>';
    }).join('');
    resultsEl.querySelectorAll('[data-qs-result]').forEach(b=>b.addEventListener('click',()=>{selectedIndex=Number(b.dataset.qsResult);renderResults();renderPreview();}));
  }
  function renderPreview(){
    const m=matches[selectedIndex];if(!m)return;const s=m.subject,q=m.question,c=q.correctAnswer,r=q.rationale&&typeof q.rationale==='object'?q.rationale.text:q.rationale;
    const options=q.options.map((o,i)=>'<div class="qs-option'+(i===c?' is-correct':'')+'"><span class="qs-option-letter">'+String.fromCharCode(65+i)+'</span><span>'+esc(o)+'</span>'+(i===c?'<span class="qs-check" aria-label="Correct answer">✓</span>':'')+'</div>').join('');
    const tags=Array.isArray(q.tags)&&q.tags.length?'<div class="qs-tags">'+q.tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>':'';
    previewEl.innerHTML='<div class="qs-preview-meta"><span>'+esc(s.icon||'📚')+' '+esc(s.name)+'</span><span>'+esc(q.topic||'General')+'</span></div><div class="qs-preview-grid"><div class="qs-question-side"><div class="qs-question-id">'+esc(q.id||'Question')+'</div><h3>'+esc(q.question)+'</h3><div class="qs-options">'+options+'</div></div><aside class="qs-rationale-side"><p class="qs-kicker">ANSWER &amp; RATIONALE</p><div class="qs-answer-label">Correct answer</div><strong class="qs-answer-text">'+String.fromCharCode(65+c)+'. '+esc(q.options[c])+'</strong><p class="qs-rationale-text">'+esc(r||'No rationale is currently provided for this item.')+'</p>'+tags+'</aside></div><div class="qs-preview-footer"><span>Preview only · your quiz progress has not changed</span><button type="button" class="qs-see-question" id="qsSeeQuestion">See question in quiz <span aria-hidden="true">↗</span></button></div>';
    document.getElementById('qsSeeQuestion')?.addEventListener('click',()=>{const u=new URL('quiz.html',document.baseURI);u.searchParams.set('subject',s.id);u.searchParams.set('question',String(q.id));window.location.href=u.href;});
  }
  dashboardInput.addEventListener('focus',()=>{if(modal.hidden)openModal();});
  dashboardInput.addEventListener('click',()=>{if(modal.hidden)openModal();});
  dashboardInput.addEventListener('input',()=>{if(modal.hidden)openModal();input.value=dashboardInput.value;clearTimeout(debounce);debounce=setTimeout(()=>runSearch(input.value),160);});
  input.addEventListener('input',()=>{dashboardInput.value=input.value;clearTimeout(debounce);debounce=setTimeout(()=>runSearch(input.value),160);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();}});
  input.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!modal.hidden){e.preventDefault();closeModal();}
    if(e.key==='ArrowDown'&&!modal.hidden&&matches.length){e.preventDefault();selectedIndex=Math.min(matches.length-1,selectedIndex+1);renderResults();renderPreview();resultsEl.querySelector('[data-qs-result="'+selectedIndex+'"]')?.scrollIntoView({block:'nearest'});}
    if(e.key==='ArrowUp'&&!modal.hidden&&matches.length){e.preventDefault();selectedIndex=Math.max(0,selectedIndex-1);renderResults();renderPreview();resultsEl.querySelector('[data-qs-result="'+selectedIndex+'"]')?.scrollIntoView({block:'nearest'});}
  });
  closeButton?.addEventListener('click',closeModal);backdrop?.addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal();if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(modal.hidden)openModal();else input.focus();}});
})();