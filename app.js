const TEMPERAMENT_BUCKETS = {
  "Friendly":     ["amiable","charming","cheerful","courteous","family-oriented","friendly","gentle","gentlemanly","good-humored","good-natured","good-tempered","gregarious","home-loving","kind","lovable","outgoing","people-oriented","polite","positive","sociable","sweet","sweet-natured","sweet-tempered"],
  "Affectionate": ["affectionate","deeply affectionate","deeply devoted","dependable","devoted","faithful","loving","loyal","profoundly loyal","sensitive","tenderhearted"],
  "Energetic":    ["active","agile","athletic","boisterous","bouncy","busy","dashing","energetic","enthusiastic","exuberant","frollicking","hardworking","lively","peppy","powerful","ready to work","spirited","sprightly","spunky","strong","tomboyish","upbeat","versatile","very active","vivacious","work-oriented"],
  "Calm":         ["calm","dignified","docile","easy-going","even-tempered","graceful","low-key","majestic","mellow","noble","patient","poised","regal","regal in manner","regally dignified","serious-minded","undemanding"],
  "Intelligent":  ["alert","alert and intelligent","attentive","bidable","bright","canny","clever","eager","eager to please","easily trained","intelligent","keen","keenly alert","keenly observant","obedient","observant","perceptive","quick","responsive","smart","trainable","very smart","watchful","wickedly smart","willing to please"],
  "Playful":      ["adaptable","amusing","charismatic","comical","entertaining","famously funny","fun-loving","funny","happy","happy-go-lucky","joyful","merry","mischievous","optimistic","playful","playful but also work-oriented","sassy","sense of humor"],
  "Brave":        ["bold","brave","confident","confident guardian","courageous","fearless","plucky","proud","self-confident","strong-willed","tenacious","vigilant"],
  "Independent":  ["adventurous","aloof","curious","determined","independent","independent-minded","inquisitive","reserved","reserved with strangers"],
};

const weightLbs = str => {
  if (!str) return null;
  const nums = str.match(/\d+/g);
  if (!nums) return null;
  return nums.map(Number).reduce((a, b) => a + b, 0) / nums.length;
};

const sizeOf = dog => {
  const w = weightLbs(dog.weight);
  if (w === null) return "unknown";
  if (w < 25)  return "small";
  if (w <= 60) return "medium";
  return "large";
};

const tempsOf = dog => {
  if (!dog.temperament) return [];
  return dog.temperament.split(/[,\/]/).map(t => t.trim()).filter(Boolean);
};

let dogs = [], activeSizes = new Set(), activeTemps = new Set(), query = "";

const render = () => {
  const grid = document.getElementById("grid");
  const filtered = dogs.filter(d => {
    if (query && !d.name.toLowerCase().includes(query)) return false;
    if (activeSizes.size > 0 && !activeSizes.has(sizeOf(d))) return false;
    if (activeTemps.size > 0) {
      const breedTemps = tempsOf(d).map(t => t.toLowerCase());
      const matchesBucket = bucket => (TEMPERAMENT_BUCKETS[bucket] || []).some(kw => breedTemps.some(t => t.includes(kw)));
      if (![...activeTemps].every(matchesBucket)) return false;
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById("count").textContent = `${filtered.length} breed${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty">No breeds match your filters.</div>';
    return;
  }

  grid.innerHTML = filtered.map(d => {
    const temps = tempsOf(d);
    return `
      <div class="card" data-index="${dogs.indexOf(d)}">
        ${d.image_url ? `<img class="card-img" src="${d.image_url}" alt="${d.name}" loading="lazy">` : ""}
        <div class="card-name">${d.name}</div>
        <div class="card-tags">${temps.map(t => `<span class="tag">${t}</span>`).join("")}</div>
        <div class="card-meta">
          ${d.weight          ? `<span>⚖️ ${d.weight}</span>` : ""}
          ${d.life_expectancy ? `<span>🕐 ${d.life_expectancy}</span>` : ""}
        </div>
      </div>`;
  }).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => openModal(dogs[+card.dataset.index]));
  });
};

const openModal = dog => {
  const temps = tempsOf(dog);
  const stats = [
    ["Height", dog.height], ["Weight", dog.weight],
    ["Life Expectancy", dog.life_expectancy], ["Group", dog.group],
  ].filter(([, v]) => v);

  document.getElementById("modal-body").innerHTML = `
    <div class="modal-group">${dog.group || ""}</div>
    <div class="modal-name">${dog.name}</div>
    ${temps.length ? `<div class="modal-tags">${temps.map(t => `<span class="modal-tag">${t}</span>`).join("")}</div>` : ""}
    ${stats.length ? `<div class="modal-stats">${stats.map(([l, v]) => `<div class="stat"><div class="stat-label">${l}</div><div class="stat-value">${v}</div></div>`).join("")}</div>` : ""}
    ${dog.about ? `<p class="modal-about">${dog.about}</p>` : ""}
    ${dog.url   ? `<a class="modal-link" href="${dog.url}" target="_blank" rel="noopener">View on AKC ↗</a>` : ""}
  `;
  document.getElementById("overlay").classList.add("open");
};

const closeModal = () => document.getElementById("overlay").classList.remove("open");

// Generic multi-select chip group handler.
// allBtn has no value; value chips toggle membership in activeSet.
const wireChips = (container, activeSet, getValue) => {
  const chips = container.querySelectorAll(".chip");
  const allBtn = [...chips].find(b => !getValue(b));

  chips.forEach(btn => {
    btn.addEventListener("click", () => {
      const v = getValue(btn);
      if (!v) {
        // "All" chip
        activeSet.clear();
        chips.forEach(b => b.classList.remove("active"));
        allBtn.classList.add("active");
      } else {
        activeSet.has(v) ? activeSet.delete(v) : activeSet.add(v);
        btn.classList.toggle("active", activeSet.has(v));
        allBtn.classList.toggle("active", activeSet.size === 0);
      }
      render();
    });
  });
};

const buildTempFilters = () => {
  const wrap = document.getElementById("temp-filters");
  Object.keys(TEMPERAMENT_BUCKETS).forEach(bucket => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.temp = bucket;
    btn.textContent = bucket;
    wrap.appendChild(btn);
  });
  wireChips(wrap, activeTemps, b => b.dataset.temp);
};

// Controls
document.getElementById("search").addEventListener("input", e => {
  query = e.target.value.toLowerCase().trim();
  render();
});

wireChips(document.getElementById("size-filters"), activeSizes, b => b.dataset.size);

document.getElementById("overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("overlay")) closeModal();
});
document.getElementById("modal-close").addEventListener("click", closeModal);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// Load data
fetch("dogs.json")
  .then(r => r.json())
  .then(data => {
    dogs = data;
    buildTempFilters();
    render();
  })
  .catch(() => {
    document.getElementById("grid").innerHTML = '<div class="empty">Could not load dogs.json. Make sure you\'re serving this over HTTP.</div>';
  });
