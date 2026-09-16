(function(){
  "use strict";

  var API_BASE = "/api/candidatures";
  var STATUTS = ["À postuler","Postulé","Relance envoyée","Entretien","Test technique","Offre reçue","Refusé","Abandonné"];
  var STATUT_COLOR = {
    "À postuler": {fg:"var(--moss)", bg:"var(--moss-soft)", hex:"#8B9188"},
    "Postulé": {fg:"var(--pine)", bg:"var(--pine-soft)", hex:"#3B6E52"},
    "Relance envoyée": {fg:"var(--gold)", bg:"var(--gold-soft)", hex:"#A9790F"},
    "Entretien": {fg:"var(--slate)", bg:"var(--slate-soft)", hex:"#3E6E82"},
    "Test technique": {fg:"var(--violet)", bg:"var(--violet-soft)", hex:"#6B5B8E"},
    "Offre reçue": {fg:"var(--pine-dark)", bg:"var(--pine-soft)", hex:"#2A5A40"},
    "Refusé": {fg:"var(--brick)", bg:"var(--brick-soft)", hex:"#9C4A3B"},
    "Abandonné": {fg:"var(--moss)", bg:"var(--moss-soft)", hex:"#8B9188"}
  };
  var ALTITUDE = {
    "À postuler": 8, "Postulé": 30, "Relance envoyée": 42, "Test technique": 62,
    "Entretien": 74, "Offre reçue": 96, "Refusé": 14, "Abandonné": 4
  };
  var SOURCES_SUGGESTIONS = ["LinkedIn","Indeed","Site de l'entreprise","Réseau / recommandation","ANEM","Emploitic","Autre"];

  var state = { items: [], view: "dashboard", editingId: null, filters:{search:"", statut:"", domaine:"", ville:""} };

  // ---------- API client ----------
  function apiGetAll(){
    return fetch(API_BASE).then(function(r){
      if(!r.ok) throw new Error("Erreur serveur (" + r.status + ")");
      return r.json();
    });
  }
  function apiCreate(payload){
    return fetch(API_BASE, {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)
    }).then(function(r){
      if(!r.ok) return r.json().then(function(e){ throw new Error(e.error || "Erreur serveur"); });
      return r.json();
    });
  }
  function apiUpdate(id, payload){
    return fetch(API_BASE + "/" + encodeURIComponent(id), {
      method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)
    }).then(function(r){
      if(!r.ok) return r.json().then(function(e){ throw new Error(e.error || "Erreur serveur"); });
      return r.json();
    });
  }
  function apiDelete(id){
    return fetch(API_BASE + "/" + encodeURIComponent(id), { method:"DELETE" }).then(function(r){
      if(!r.ok && r.status !== 204) throw new Error("Erreur serveur (" + r.status + ")");
    });
  }

  function setServerStatus(kind, text){
    var el = document.getElementById("server-status");
    el.textContent = text;
    el.className = "sidebar-note " + (kind || "");
  }

  function refreshFromServer(){
    return apiGetAll().then(function(items){
      state.items = items;
      setServerStatus("ok", "Connecté — données stockées sur le serveur.");
      document.getElementById("sidebar-add").disabled = false;
    }).catch(function(err){
      console.error(err);
      setServerStatus("error", "Impossible de joindre le serveur. Vérifie qu'il est lancé (npm start).");
      document.getElementById("sidebar-add").disabled = true;
    });
  }

  // ---------- Helpers ----------
  function fmtDate(iso){
    if(!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    if(isNaN(d)) return "—";
    return d.toLocaleDateString("fr-FR", {day:"2-digit", month:"short", year:"numeric"});
  }
  function fmtDateShort(iso){
    if(!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    if(isNaN(d)) return "—";
    return d.toLocaleDateString("fr-FR", {day:"2-digit", month:"2-digit"});
  }
  function escapeHtml(s){
    return (s||"").replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; });
  }
  function todayIso(){ return new Date().toISOString().slice(0,10); }
  function uniqueValues(field){
    var set = {}; state.items.forEach(function(it){ if(it[field]) set[it[field]] = true; });
    return Object.keys(set).sort(function(a,b){ return a.localeCompare(b, "fr"); });
  }

  var views = { dashboard: document.getElementById("view-dashboard"), list: document.getElementById("view-list"), form: document.getElementById("view-form") };
  function showView(name){
    state.view = name;
    Object.keys(views).forEach(function(k){ views[k].hidden = (k !== name); });
    document.querySelectorAll(".navbtn").forEach(function(btn){ btn.classList.toggle("active", btn.dataset.view === name); });
    if(name === "dashboard") renderDashboard();
    if(name === "list") renderList();
  }
  document.querySelectorAll(".navbtn").forEach(function(btn){ btn.addEventListener("click", function(){ showView(btn.dataset.view); }); });
  document.getElementById("sidebar-add").addEventListener("click", function(){ openForm(null); });

  // ---------- Journey (elevation-style) chart ----------
  function renderJourney(){
    var wrap = document.getElementById("journey-chart");
    var legendEl = document.getElementById("journey-legend");
    var items = state.items.filter(function(i){ return i.date; }).slice().sort(function(a,b){ return a.date.localeCompare(b.date); });

    legendEl.innerHTML = STATUTS.map(function(s){
      return '<span><span class="dot" style="background:'+STATUT_COLOR[s].hex+'"></span>'+s+'</span>';
    }).join("");

    if(items.length < 1){
      wrap.innerHTML = '<div class="empty-note">Ta trajectoire apparaîtra ici dès ta première candidature.</div>';
      return;
    }

    var W = Math.max(560, items.length * 64);
    var H = 190;
    var padL = 20, padR = 20, padT = 16, padB = 16;
    var innerW = W - padL - padR, innerH = H - padT - padB;

    var points = items.map(function(it, idx){
      var x = items.length === 1 ? padL + innerW/2 : padL + (idx/(items.length-1)) * innerW;
      var alt = ALTITUDE[it.statut] != null ? ALTITUDE[it.statut] : 20;
      var y = padT + innerH - (alt/100)*innerH;
      return {x:x, y:y, item:it};
    });

    var linePath = points.map(function(p,idx){ return (idx===0?"M":"L") + p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
    var areaPath = linePath + " L " + points[points.length-1].x.toFixed(1) + "," + (padT+innerH) +
                   " L " + points[0].x.toFixed(1) + "," + (padT+innerH) + " Z";

    var dots = points.map(function(p){
      var col = STATUT_COLOR[p.item.statut] ? STATUT_COLOR[p.item.statut].hex : "#8B9188";
      var title = escapeHtml(p.item.entreprise||"—") + " — " + escapeHtml(p.item.titre||"") + " (" + escapeHtml(p.item.statut) + ", " + fmtDateShort(p.item.date) + ")";
      return '<g class="journey-dot" data-id="'+p.item.id+'" style="cursor:pointer">'+
        '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="9" fill="'+col+'" opacity="0.16"></circle>'+
        '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.2" fill="'+col+'" stroke="var(--panel-raised)" stroke-width="1.6"><title>'+title+'</title></circle>'+
      '</g>';
    }).join("");

    var svg = '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg">'+
      '<defs><linearGradient id="journeyFade" x1="0" y1="0" x2="0" y2="1">'+
        '<stop offset="0%" stop-color="var(--pine)" stop-opacity="0.22"/>'+
        '<stop offset="100%" stop-color="var(--pine)" stop-opacity="0"/>'+
      '</linearGradient></defs>'+
      '<path d="'+areaPath+'" fill="url(#journeyFade)"></path>'+
      '<path d="'+linePath+'" fill="none" stroke="var(--pine)" stroke-width="1.6" opacity="0.55"></path>'+
      dots +
    '</svg>';
    wrap.innerHTML = svg;
    wrap.querySelectorAll(".journey-dot").forEach(function(g){
      g.addEventListener("click", function(){ openForm(g.dataset.id); });
    });
  }

  // ---------- Donut chart ----------
  function renderDonut(){
    var el = document.getElementById("donut-wrap");
    var items = state.items;
    var total = items.length;
    var counts = STATUTS.map(function(s){ return {label:s, count: items.filter(function(i){return i.statut===s;}).length}; }).filter(function(c){return c.count>0;});

    if(total === 0){
      el.innerHTML = '<div class="empty-note">La répartition apparaîtra ici dès ta première candidature.</div>';
      return;
    }

    var r = 58, cx = 70, cy = 70, circumference = 2*Math.PI*r;
    var cumulative = 0;
    var segments = counts.map(function(c){
      var frac = c.count/total;
      var len = frac*circumference;
      var seg = '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+STATUT_COLOR[c.label].hex+'" stroke-width="17" '+
        'stroke-dasharray="'+len.toFixed(2)+' '+(circumference-len).toFixed(2)+'" stroke-dashoffset="'+(-cumulative).toFixed(2)+'" '+
        'transform="rotate(-90 '+cx+' '+cy+')" stroke-linecap="butt"><title>'+c.label+' : '+c.count+'</title></circle>';
      cumulative += len;
      return seg;
    }).join("");

    var svgDonut = '<svg viewBox="0 0 140 140" width="140" height="140">'+
      '<circle cx="70" cy="70" r="58" fill="none" stroke="var(--moss-soft)" stroke-width="17"></circle>'+
      segments+
      '<text x="70" y="66" text-anchor="middle" font-family="JetBrains Mono" font-size="22" font-weight="600" fill="var(--ink)">'+total+'</text>'+
      '<text x="70" y="83" text-anchor="middle" font-family="Work Sans" font-size="10" fill="var(--ink-faint)">candidature'+(total>1?"s":"")+'</text>'+
    '</svg>';

    var legend = counts.map(function(c){
      return '<div class="legend-row"><span class="sw" style="background:'+STATUT_COLOR[c.label].hex+'"></span>'+
        '<span class="lbl">'+c.label+'</span><span class="val">'+c.count+'</span></div>';
    }).join("");

    el.innerHTML = svgDonut + '<div class="donut-legend">'+legend+'</div>';
  }

  // ---------- Dashboard ----------
  function renderDashboard(){
    var items = state.items;
    var total = items.length;
    document.getElementById("dash-subtitle").textContent = total
      ? total + " candidature" + (total>1?"s":"") + " enregistrée" + (total>1?"s":"") + " — voici où tu en es."
      : "Aucune candidature enregistrée pour l'instant — ajoute la première pour démarrer ta trajectoire.";

    var enCours = items.filter(function(i){ return ["Postulé","Relance envoyée","Entretien","Test technique"].indexOf(i.statut) >= 0; }).length;
    var entretiens = items.filter(function(i){ return ["Entretien","Test technique"].indexOf(i.statut) >= 0; }).length;
    var offres = items.filter(function(i){ return i.statut === "Offre reçue"; }).length;
    var refus = items.filter(function(i){ return i.statut === "Refusé"; }).length;
    var envoyees = items.filter(function(i){ return i.statut !== "À postuler"; }).length;
    var repondues = items.filter(function(i){ return ["Entretien","Test technique","Offre reçue","Refusé"].indexOf(i.statut) >= 0; }).length;
    var tauxReponse = envoyees ? Math.round((repondues/envoyees)*100) : 0;

    var stats = [
      {num: total, label:"Candidatures totales"},
      {num: enCours, label:"En cours"},
      {num: entretiens, label:"Entretiens / tests"},
      {num: offres, label:"Offres reçues"},
      {num: refus, label:"Refus"},
      {num: tauxReponse + "%", label:"Taux de réponse"}
    ];
    document.getElementById("stat-row").innerHTML = stats.map(function(s){
      return '<div class="stat-cell"><div class="num">'+s.num+'</div><div class="label">'+s.label+'</div></div>';
    }).join("");

    renderJourney();
    renderDonut();

    function topBars(field){
      var counts = {};
      items.forEach(function(i){ var v = i[field]; if(v){ counts[v] = (counts[v]||0)+1; } });
      var arr = Object.keys(counts).map(function(k){ return {label:k, count:counts[k]}; });
      arr.sort(function(a,b){ return b.count - a.count; });
      return arr.slice(0,5);
    }
    function renderTop(field, elId, color){
      var arr = topBars(field);
      var max = Math.max.apply(null, arr.map(function(a){return a.count;}).concat([1]));
      document.getElementById(elId).innerHTML = arr.length
        ? arr.map(function(a){
            var pct = Math.round((a.count/max)*100);
            return '<div class="bar-row"><div class="bar-label">'+escapeHtml(a.label)+'</div>'+
              '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%; background:'+color+'"></div></div>'+
              '<div class="bar-count">'+a.count+'</div></div>';
          }).join("")
        : '<div class="empty-note">Pas encore de données.</div>';
    }
    renderTop("domaine", "domaine-bars", "var(--pine)");
    renderTop("ville", "ville-bars", "var(--slate)");

    var recent = items.slice().sort(function(a,b){ return (b.updatedAt||b.date||"").localeCompare(a.updatedAt||a.date||""); }).slice(0,6);
    document.getElementById("recent-list").innerHTML = recent.length
      ? recent.map(function(i){
          var col = STATUT_COLOR[i.statut] || STATUT_COLOR["À postuler"];
          return '<div class="logbook-item" data-id="'+i.id+'">'+
            '<div class="lb-mark">'+fmtDateShort(i.date)+'</div>'+
            '<div><div class="lb-title">'+escapeHtml(i.titre||"Sans titre")+'</div>'+
            '<div class="lb-sub">'+escapeHtml(i.entreprise||"—")+'</div></div>'+
            '<span class="pill lb-pill" style="background:'+col.bg+'; color:'+col.fg+'">'+escapeHtml(i.statut)+'</span></div>';
        }).join("")
      : '<div class="empty-note">Rien à afficher pour le moment.</div>';
    document.querySelectorAll("#recent-list .logbook-item").forEach(function(el){
      el.addEventListener("click", function(){ openForm(el.dataset.id); });
    });

    var months = [];
    var now = new Date();
    for(var k=5;k>=0;k--){
      var d = new Date(now.getFullYear(), now.getMonth()-k, 1);
      months.push({key: d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"), label: d.toLocaleDateString("fr-FR",{month:"short"})});
    }
    var monthCounts = months.map(function(m){
      var c = items.filter(function(i){ return (i.date||"").slice(0,7) === m.key; }).length;
      return {label:m.label, count:c};
    });
    var maxMonth = Math.max.apply(null, monthCounts.map(function(m){return m.count;}).concat([1]));
    document.getElementById("month-chart").innerHTML =
      '<div style="display:flex; align-items:flex-end; gap:12px; height:100px; padding-top:8px;">' +
      monthCounts.map(function(m){
        var h = Math.max(Math.round((m.count/maxMonth)*76), m.count>0?6:2);
        return '<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">'+
          '<div style="font-family:JetBrains Mono; font-size:0.72rem; color:var(--ink-soft); margin-bottom:4px;">'+(m.count||"")+'</div>'+
          '<div style="width:100%; max-width:30px; background:var(--pine); border-radius:4px 4px 0 0; min-height:3px; height:'+h+'px;"></div>'+
          '<div style="font-size:0.72rem; color:var(--ink-faint); margin-top:6px;">'+m.label+'</div>'+
        '</div>';
      }).join("") + '</div>';
  }

  // ---------- List ----------
  function populateFilterOptions(){
    var statutSel = document.getElementById("filter-statut");
    var domaineSel = document.getElementById("filter-domaine");
    var villeSel = document.getElementById("filter-ville");
    statutSel.innerHTML = '<option value="">Tous les statuts</option>' + STATUTS.map(function(s){ return '<option value="'+escapeHtml(s)+'">'+escapeHtml(s)+'</option>'; }).join("");
    domaineSel.innerHTML = '<option value="">Tous les domaines</option>' + uniqueValues("domaine").map(function(v){ return '<option value="'+escapeHtml(v)+'">'+escapeHtml(v)+'</option>'; }).join("");
    villeSel.innerHTML = '<option value="">Toutes les villes</option>' + uniqueValues("ville").map(function(v){ return '<option value="'+escapeHtml(v)+'">'+escapeHtml(v)+'</option>'; }).join("");
    statutSel.value = state.filters.statut;
    domaineSel.value = state.filters.domaine;
    villeSel.value = state.filters.ville;
  }

  function renderList(){
    populateFilterOptions();
    var items = filteredItems();
    document.getElementById("list-subtitle").textContent = items.length + " candidature" + (items.length>1?"s":"") + " affichée" + (items.length>1?"s":"");

    var container = document.getElementById("list-container");
    if(state.items.length === 0){
      container.innerHTML = '<div class="empty-state">'+
        '<h3>Aucune candidature pour l\'instant</h3>'+
        '<p>Commence par ajouter la première offre à laquelle tu as postulé.</p>'+
        '<button class="btn btn-primary" id="empty-add">Ajouter une candidature</button></div>';
      document.getElementById("empty-add").addEventListener("click", function(){ openForm(null); });
      return;
    }
    if(items.length === 0){
      container.innerHTML = '<div class="empty-state"><h3>Aucun résultat</h3><p>Essaie d\'ajuster ta recherche ou tes filtres.</p></div>';
      return;
    }

    items.sort(function(a,b){ return (b.date||"").localeCompare(a.date||""); });

    var rows = items.map(function(i){
      var col = STATUT_COLOR[i.statut] || STATUT_COLOR["À postuler"];
      var lienCell = i.lien
        ? '<a class="ext-link" href="'+escapeHtml(i.lien)+'" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Voir l\'offre</a>'
        : '<span class="cell-sub">—</span>';
      return '<tr data-id="'+i.id+'">'+
        '<td><div class="cell-title">'+escapeHtml(i.entreprise||"—")+'</div></td>'+
        '<td><div class="cell-title">'+escapeHtml(i.titre||"—")+'</div>'+(i.source?'<div class="cell-sub">via '+escapeHtml(i.source)+'</div>':'')+'</td>'+
        '<td>'+escapeHtml(i.ville||"—")+'</td>'+
        '<td>'+escapeHtml(i.domaine||"—")+'</td>'+
        '<td><span class="pill" style="background:'+col.bg+'; color:'+col.fg+'">'+escapeHtml(i.statut)+'</span></td>'+
        '<td>'+fmtDate(i.date)+'</td>'+
        '<td>'+lienCell+'</td>'+
        '<td><div class="row-actions">'+
          '<button class="icon-btn" data-edit="'+i.id+'" title="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>'+
          '<button class="icon-btn" data-del="'+i.id+'" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>'+
        '</div></td>'+
      '</tr>';
    }).join("");

    container.innerHTML = '<div class="table-wrap"><table><thead><tr>'+
      '<th>Entreprise</th><th>Poste</th><th>Ville</th><th>Domaine</th><th>Statut</th><th>Date</th><th>Offre</th><th></th>'+
      '</tr></thead><tbody>'+rows+'</tbody></table></div>';

    container.querySelectorAll("tbody tr").forEach(function(tr){
      tr.addEventListener("click", function(e){
        if(e.target.closest("[data-edit],[data-del],a")) return;
        openForm(tr.dataset.id);
      });
    });
    container.querySelectorAll("[data-edit]").forEach(function(btn){
      btn.addEventListener("click", function(e){ e.stopPropagation(); openForm(btn.dataset.edit); });
    });
    container.querySelectorAll("[data-del]").forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        var item = state.items.find(function(i){ return i.id === btn.dataset.del; });
        if(item && confirm('Supprimer la candidature "'+item.titre+'" chez '+item.entreprise+' ?')){
          apiDelete(item.id).then(function(){ return refreshFromServer(); }).then(renderList).catch(function(err){
            alert("Erreur lors de la suppression : " + err.message);
          });
        }
      });
    });
  }

  function filteredItems(){
    var f = state.filters;
    var q = f.search.trim().toLowerCase();
    return state.items.filter(function(i){
      if(f.statut && i.statut !== f.statut) return false;
      if(f.domaine && i.domaine !== f.domaine) return false;
      if(f.ville && i.ville !== f.ville) return false;
      if(q && !((i.entreprise||"").toLowerCase().indexOf(q)>=0 || (i.titre||"").toLowerCase().indexOf(q)>=0)) return false;
      return true;
    });
  }

  document.getElementById("search-input").addEventListener("input", function(e){ state.filters.search = e.target.value; renderList(); });
  document.getElementById("filter-statut").addEventListener("change", function(e){ state.filters.statut = e.target.value; renderList(); });
  document.getElementById("filter-domaine").addEventListener("change", function(e){ state.filters.domaine = e.target.value; renderList(); });
  document.getElementById("filter-ville").addEventListener("change", function(e){ state.filters.ville = e.target.value; renderList(); });

  // ---------- Form ----------
  var form = document.getElementById("candidature-form");
  var statutSelectForm = document.getElementById("f-statut");
  statutSelectForm.innerHTML = STATUTS.map(function(s){ return '<option value="'+escapeHtml(s)+'">'+escapeHtml(s)+'</option>'; }).join("");

  function openForm(id){
    state.editingId = id;
    document.getElementById("delete-form").hidden = !id;
    if(id){
      var item = state.items.find(function(i){ return i.id === id; });
      if(!item){ return openForm(null); }
      document.getElementById("form-title").textContent = "Modifier la candidature";
      document.getElementById("f-id").value = item.id;
      document.getElementById("f-entreprise").value = item.entreprise || "";
      document.getElementById("f-titre").value = item.titre || "";
      document.getElementById("f-ville").value = item.ville || "";
      document.getElementById("f-domaine").value = item.domaine || "";
      document.getElementById("f-statut").value = item.statut || "Postulé";
      document.getElementById("f-date").value = item.date || "";
      document.getElementById("f-source").value = item.source || "";
      document.getElementById("f-relance").value = item.relance || "";
      document.getElementById("f-salaire").value = item.salaire || "";
      document.getElementById("f-lien").value = item.lien || "";
      document.getElementById("f-description").value = item.description || "";
      document.getElementById("f-notes").value = item.notes || "";
    }else{
      document.getElementById("form-title").textContent = "Nouvelle candidature";
      form.reset();
      document.getElementById("f-id").value = "";
      document.getElementById("f-statut").value = "Postulé";
      document.getElementById("f-date").value = todayIso();
    }
    document.getElementById("ville-list").innerHTML = uniqueValues("ville").map(function(v){ return '<option value="'+escapeHtml(v)+'">'; }).join("");
    document.getElementById("domaine-list").innerHTML = uniqueValues("domaine").map(function(v){ return '<option value="'+escapeHtml(v)+'">'; }).join("");
    document.getElementById("source-list").innerHTML = SOURCES_SUGGESTIONS.concat(uniqueValues("source")).filter(function(v,idx,arr){return arr.indexOf(v)===idx;}).map(function(v){ return '<option value="'+escapeHtml(v)+'">'; }).join("");
    showView("form");
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    var id = document.getElementById("f-id").value;
    var submitBtn = form.querySelector('button[type="submit"]');
    var data = {
      entreprise: document.getElementById("f-entreprise").value.trim(),
      titre: document.getElementById("f-titre").value.trim(),
      ville: document.getElementById("f-ville").value.trim(),
      domaine: document.getElementById("f-domaine").value.trim(),
      statut: document.getElementById("f-statut").value,
      date: document.getElementById("f-date").value || todayIso(),
      source: document.getElementById("f-source").value.trim(),
      relance: document.getElementById("f-relance").value,
      salaire: document.getElementById("f-salaire").value.trim(),
      lien: document.getElementById("f-lien").value.trim(),
      description: document.getElementById("f-description").value.trim(),
      notes: document.getElementById("f-notes").value.trim()
    };
    submitBtn.disabled = true;
    var request = id ? apiUpdate(id, data) : apiCreate(data);
    request.then(function(){ return refreshFromServer(); }).then(function(){
      submitBtn.disabled = false;
      showView("list");
    }).catch(function(err){
      submitBtn.disabled = false;
      alert("Erreur lors de l'enregistrement : " + err.message);
    });
  });

  document.getElementById("cancel-form").addEventListener("click", function(){ showView(state.editingId ? "list" : "dashboard"); });
  document.getElementById("delete-form").addEventListener("click", function(){
    var id = document.getElementById("f-id").value;
    var item = state.items.find(function(i){ return i.id === id; });
    if(item && confirm('Supprimer la candidature "'+item.titre+'" chez '+item.entreprise+' ?')){
      apiDelete(id).then(function(){ return refreshFromServer(); }).then(function(){ showView("list"); }).catch(function(err){
        alert("Erreur lors de la suppression : " + err.message);
      });
    }
  });

  // ---------- Init ----------
  document.getElementById("sidebar-add").disabled = true;
  refreshFromServer().then(function(){ showView("dashboard"); });
})();
